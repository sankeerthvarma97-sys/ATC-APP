import { google } from "@ai-sdk/google";
import { generateText, gateway, Output } from "ai";
import { z } from "zod";
import type {
  AiAtcAssistantRequest,
  AiAtcAssistantResponse,
  DetectedAirspaceConflict,
  FlightDTO,
} from "@/lib/domain";
import { calculateDistanceNm } from "@/lib/simulation/logic";

const atcAssistantOutputSchema = z.object({
  callsign: z.string().min(2),
  intent: z.enum([
    "WAYPOINT_DIRECT",
    "CLIMB_DESCEND",
    "PUSHBACK_STARTUP",
    "TAXI_CLEARANCE",
    "TAKEOFF_APPROACH",
    "EMERGENCY_MAYDAY",
    "EMERGENCY_PAN_PAN",
    "SPEED_VECTOR",
    "GENERAL_QUERY",
  ]),
  recommendedClearance: z.string().min(10),
  pilotReadback: z.string().min(10),
  suggestedParameters: z.object({
    altitudeFt: z.number().optional(),
    headingDeg: z.number().optional(),
    speedKt: z.number().optional(),
    squawk: z.string().optional(),
    runway: z.string().optional(),
    status: z.string().optional(),
  }),
  reasoning: z.string().min(10),
});

function getConfiguredModel() {
  if (process.env.AI_GATEWAY_API_KEY) {
    const modelId = process.env.AOCC_AI_MODEL || "google/gemini-3.8-flash";
    return { model: gateway(modelId), modelName: modelId };
  }

  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    const modelId = process.env.AOCC_GOOGLE_MODEL || "gemini-3.8-flash";
    return { model: google(modelId), modelName: modelId };
  }

  return null;
}

/**
 * Airspace Conflict Detection Engine (STCA / TCAS / Separation Assurance)
 * Identifies aircraft violating 5.0 NM horizontal & 1,000 FT vertical radar separation
 */
export function detectAirspaceConflicts(flights: FlightDTO[]): DetectedAirspaceConflict[] {
  const conflicts: DetectedAirspaceConflict[] = [];
  const activeFlights = flights.filter(
    (f) =>
      f.status !== "CANCELLED" &&
      f.status !== "DIVERTED" &&
      f.status !== "SCHEDULED" &&
      f.status !== "BOARDING" &&
      f.altitudeFt > 0,
  );

  for (let i = 0; i < activeFlights.length; i++) {
    for (let j = i + 1; j < activeFlights.length; j++) {
      const f1 = activeFlights[i];
      const f2 = activeFlights[j];

      const distNm = calculateDistanceNm(f1.latitude, f1.longitude, f2.latitude, f2.longitude);
      const altDiffFt = Math.abs(f1.altitudeFt - f2.altitudeFt);

      // Radar separation standard: < 5.0 NM horizontal and < 1,000 FT vertical
      if (distNm < 5.0 && altDiffFt < 1000) {
        const isCritical = distNm < 3.0 && altDiffFt < 700;
        const higher = f1.altitudeFt >= f2.altitudeFt ? f1 : f2;
        const lower = f1.altitudeFt < f2.altitudeFt ? f1 : f2;

        const resolutionAdvisory = isCritical
          ? `TCAS RA CRITICAL: ${higher.callsign} CLIMB to ${higher.altitudeFt + 1500} FT; ${lower.callsign} DESCEND to ${Math.max(1500, lower.altitudeFt - 1500)} FT and turn right heading ${(lower.headingDeg + 45) % 360}°.`
          : `STCA ADVISORY: Vector ${f1.callsign} turn left heading ${(f1.headingDeg - 30 + 360) % 360}° and step climb ${higher.callsign} to FL${Math.round((higher.altitudeFt + 1000) / 100)} to maintain standard 5.0 NM / 1,000 FT radar separation.`;

        conflicts.push({
          conflictId: `stca-${f1.id}-${f2.id}-${Math.round(distNm * 10)}`,
          flightA: {
            id: f1.id,
            callsign: f1.callsign,
            altitudeFt: f1.altitudeFt,
            headingDeg: f1.headingDeg,
            speedKt: f1.speedKt,
          },
          flightB: {
            id: f2.id,
            callsign: f2.callsign,
            altitudeFt: f2.altitudeFt,
            headingDeg: f2.headingDeg,
            speedKt: f2.speedKt,
          },
          horizontalSeparationNm: Number(distNm.toFixed(2)),
          verticalSeparationFt: altDiffFt,
          conflictType: "LOSS_OF_SEPARATION",
          severity: isCritical ? "CRITICAL" : "WARNING",
          resolutionAdvisory,
          suggestedAction: {
            callsign: higher.callsign,
            targetAltitudeFt: higher.altitudeFt + 1500,
            targetHeadingDeg: (higher.headingDeg + 30) % 360,
          },
        });
      }

      // Runway spacing compression during approach
      if (
        f1.runway &&
        f2.runway &&
        f1.runway === f2.runway &&
        (f1.status === "APPROACH" || f2.status === "APPROACH") &&
        distNm < 4.0 &&
        distNm > 0.1
      ) {
        conflicts.push({
          conflictId: `rwy-spacing-${f1.id}-${f2.id}`,
          flightA: {
            id: f1.id,
            callsign: f1.callsign,
            altitudeFt: f1.altitudeFt,
            headingDeg: f1.headingDeg,
            speedKt: f1.speedKt,
          },
          flightB: {
            id: f2.id,
            callsign: f2.callsign,
            altitudeFt: f2.altitudeFt,
            headingDeg: f2.headingDeg,
            speedKt: f2.speedKt,
          },
          horizontalSeparationNm: Number(distNm.toFixed(2)),
          verticalSeparationFt: altDiffFt,
          conflictType: "RUNWAY_INCURSION_RISK",
          severity: "WARNING",
          resolutionAdvisory: `Runway ${f1.runway} compression: Reduce trailing aircraft ${f2.callsign} speed to 160 KIAS or break off approach if spacing drops below 3.0 NM.`,
          suggestedAction: {
            callsign: f2.callsign,
            targetSpeedKt: 160,
          },
        });
      }
    }
  }

  return conflicts;
}

/**
 * Natural Language Pilot Transmission Parser & Deterministic ATC Logic
 */
export function fallbackAtcAssistant(
  input: AiAtcAssistantRequest,
  flights: FlightDTO[],
): AiAtcAssistantResponse {
  const text = input.pilotTransmission.trim();
  const lower = text.toLowerCase();

  // 1. Callsign extraction
  let callsign = "UNKNOWN";
  const matchedFlight = flights.find((f) => {
    const rawCallsign = f.callsign.toLowerCase();
    const flightNumber = f.flightNumber?.toLowerCase() || "";
    return lower.includes(rawCallsign) || (flightNumber && lower.includes(flightNumber));
  });

  if (matchedFlight) {
    callsign = matchedFlight.callsign;
  } else {
    // Regex matching standard airline patterns
    const callsignRegex = /(?:air india|aic)\s*(\d+)|(?:vistara|vti)\s*(\d+)|(?:indigo|igo)\s*(\d+)|(?:spicejet|sej)\s*(\d+)|(?:emirates|uae)\s*(\d+)|([a-z]{2,3}\s*\d{3,4})/i;
    const match = text.match(callsignRegex);
    if (match) {
      if (match[1]) callsign = `AIC${match[1]}`;
      else if (match[2]) callsign = `VTI${match[2]}`;
      else if (match[3]) callsign = `IGO${match[3]}`;
      else if (match[4]) callsign = `SEJ${match[4]}`;
      else if (match[5]) callsign = `UAE${match[5]}`;
      else if (match[6]) callsign = match[6].replace(/\s+/g, "").toUpperCase();
    } else if (input.selectedFlightId) {
      const selected = flights.find((f) => f.id === input.selectedFlightId);
      if (selected) callsign = selected.callsign;
    }
  }

  // 2. Identify Intent & Synthesize ICAO clearance
  let intent: AiAtcAssistantResponse["intent"] = "GENERAL_QUERY";
  let recommendedClearance = "";
  let pilotReadback = "";
  const suggestedParameters: AiAtcAssistantResponse["suggestedParameters"] = {};
  let reasoning = "";

  const conflicts = detectAirspaceConflicts(flights);
  const relevantConflict = conflicts.find(
    (c) => c.flightA.callsign === callsign || c.flightB.callsign === callsign,
  );

  if (lower.includes("mayday") || lower.includes("emergency") || lower.includes("engine failure")) {
    intent = "EMERGENCY_MAYDAY";
    recommendedClearance = `${callsign}, MAYDAY acknowledged. Radar contact. Turn left heading 090, descend and maintain 3000 feet, runway 09L cleared for immediate straight-in approach. Emergency fire and rescue staged. Squawk 7700.`;
    pilotReadback = `Turn left heading 090, descend 3000 feet, runway 09L cleared straight-in, squawking 7700, MAYDAY, ${callsign}.`;
    suggestedParameters.headingDeg = 90;
    suggestedParameters.altitudeFt = 3000;
    suggestedParameters.squawk = "7700";
    suggestedParameters.runway = "09L";
    suggestedParameters.status = "EMERGENCY";
    reasoning = "ICAO Doc 4444 emergency protocol: immediate priority vectoring, 7700 squawk assignment, and emergency services alert.";
  } else if (lower.includes("pan pan") || lower.includes("medical") || lower.includes("low fuel")) {
    intent = "EMERGENCY_PAN_PAN";
    recommendedClearance = `${callsign}, PAN PAN acknowledged. Cleared direct airport, descend and maintain 4000 feet, priority handling approved, squawk 7700.`;
    pilotReadback = `Direct airport, descend 4000 feet, squawking 7700, PAN PAN, ${callsign}.`;
    suggestedParameters.altitudeFt = 4000;
    suggestedParameters.squawk = "7700";
    suggestedParameters.status = "EMERGENCY";
    reasoning = "Urgency transmission (PAN PAN): granted priority routing and tactical descent profile.";
  } else if (lower.includes("pushback") || lower.includes("start-up") || lower.includes("startup") || lower.includes("gate") || lower.includes("stand")) {
    intent = "PUSHBACK_STARTUP";
    const facing = lower.includes("east") ? "East" : "West";
    recommendedClearance = `${callsign}, Hyderabad Ground. Pushback and start-up approved facing ${facing}, QNH 1013, report ready for taxi.`;
    pilotReadback = `Pushback and start-up approved facing ${facing}, QNH 1013, will report ready for taxi, ${callsign}.`;
    suggestedParameters.status = "TAXIING";
    reasoning = `Ground surface movement clearance issued with clear tail-facing direction (${facing}) in accordance with active runway config.`;
  } else if (lower.includes("bopol") || lower.includes("direct") || lower.includes("waypoint")) {
    intent = "WAYPOINT_DIRECT";
    const wpMatch = text.match(/direct\s+([A-Z]{3,5})/i);
    const waypoint = wpMatch ? wpMatch[1].toUpperCase() : "BOPOL";
    recommendedClearance = `${callsign}, cleared direct ${waypoint}, climb and maintain FL180, maintain current speed.`;
    pilotReadback = `Cleared direct ${waypoint}, climb and maintain FL180, ${callsign}.`;
    suggestedParameters.altitudeFt = 18000;
    reasoning = `Direct RNAV waypoint clearance issued to optimize fuel flow and route sequencing toward waypoint ${waypoint}.`;
  } else if (
    lower.includes("climb") ||
    lower.includes("descend") ||
    lower.includes("descent") ||
    lower.includes("fl") ||
    lower.includes("altitude")
  ) {
    intent = "CLIMB_DESCEND";
    const flMatch = text.match(/fl\s*(\d{2,3})/i);
    const ftMatch = text.match(/(\d{4,5})\s*feet/i);
    let targetAlt = 10000;
    if (flMatch) targetAlt = parseInt(flMatch[1], 10) * 100;
    else if (ftMatch) targetAlt = parseInt(ftMatch[1], 10);
    else if (lower.includes("descend") || lower.includes("descent")) targetAlt = 4000;
    else targetAlt = 18000;

    const action = targetAlt > (matchedFlight?.altitudeFt || 5000) ? "climb" : "descend";
    recommendedClearance = `${callsign}, ${action} and maintain ${targetAlt >= 10000 ? `FL${Math.round(targetAlt / 100)}` : `${targetAlt} feet`}. QNH 1013.`;
    pilotReadback = `${action === "climb" ? "Climb" : "Descend"} and maintain ${targetAlt >= 10000 ? `FL${Math.round(targetAlt / 100)}` : `${targetAlt} feet`}, ${callsign}.`;
    suggestedParameters.altitudeFt = targetAlt;
    reasoning = `Vertical profile adjustment authorized with transition level standard QNH altimeter setting.`;
  } else if (lower.includes("approach") || lower.includes("ils") || lower.includes("land") || lower.includes("runway")) {
    intent = "TAKEOFF_APPROACH";
    const rwyMatch = text.match(/runway\s*(\d{2}[LRC]?)/i);
    const rwy = rwyMatch ? rwyMatch[1].toUpperCase() : "09L";
    recommendedClearance = `${callsign}, cleared ILS runway ${rwy} approach, maintain 2500 feet until localizer intercept. Contact Tower 118.1.`;
    pilotReadback = `Cleared ILS runway ${rwy}, maintain 2500 until established, Tower 118.1, ${callsign}.`;
    suggestedParameters.altitudeFt = 2500;
    suggestedParameters.runway = rwy;
    suggestedParameters.status = "APPROACH";
    reasoning = `Instrument Landing System approach clearance issued with glidepath intercept altitude.`;
  } else if (lower.includes("heading") || lower.includes("vector") || lower.includes("turn") || lower.includes("speed")) {
    intent = "SPEED_VECTOR";
    const hdgMatch = text.match(/heading\s*(\d{1,3})/i);
    const spdMatch = text.match(/(\d{3})\s*knots/i);
    const hdg = hdgMatch ? parseInt(hdgMatch[1], 10) : 240;
    const spd = spdMatch ? parseInt(spdMatch[1], 10) : 210;

    recommendedClearance = `${callsign}, fly heading ${hdg} degrees, reduce speed to ${spd} knots for traffic sequencing.`;
    pilotReadback = `Heading ${hdg}, speed ${spd} knots, ${callsign}.`;
    suggestedParameters.headingDeg = hdg;
    suggestedParameters.speedKt = spd;
    reasoning = "Tactical radar vectoring and speed regulation for airspace sequencing and separation maintenance.";
  } else if (lower.includes("taxi")) {
    intent = "TAXI_CLEARANCE";
    recommendedClearance = `${callsign}, taxi via Taxiway Echo and Bravo, hold short of runway 09L at holding point E1.`;
    pilotReadback = `Taxi via Echo and Bravo, hold short runway 09L at E1, ${callsign}.`;
    suggestedParameters.status = "TAXIING";
    reasoning = "Ground taxi instructions with mandatory illuminated stop bar hold-short requirement.";
  } else {
    // Default general radio response
    intent = "GENERAL_QUERY";
    recommendedClearance = `${callsign}, Hyderabad Radar, roger your transmission. Maintain present heading and altitude, squawk ident.`;
    pilotReadback = `Maintain heading and altitude, squawking ident, ${callsign}.`;
    reasoning = "Acknowledgment of general radio transmission with standard radar identification request.";
  }

  // If a critical conflict exists, prioritize conflict resolution instructions
  if (relevantConflict && relevantConflict.severity === "CRITICAL") {
    reasoning = `PRIORITY OVERRIDE: ${relevantConflict.resolutionAdvisory}`;
    if (relevantConflict.suggestedAction) {
      if (relevantConflict.suggestedAction.targetAltitudeFt) {
        suggestedParameters.altitudeFt = relevantConflict.suggestedAction.targetAltitudeFt;
      }
      if (relevantConflict.suggestedAction.targetHeadingDeg) {
        suggestedParameters.headingDeg = relevantConflict.suggestedAction.targetHeadingDeg;
      }
    }
  }

  return {
    callsign,
    intent,
    recommendedClearance,
    pilotReadback,
    suggestedParameters,
    conflicts,
    reasoning,
    model: "deterministic-atc-neural",
    simulated: true,
    timestamp: new Date().toISOString(),
  };
}

function buildPrompt(input: AiAtcAssistantRequest, flights: FlightDTO[], conflicts: DetectedAirspaceConflict[]) {
  const flightSummaries = flights
    .slice(0, 10)
    .map(
      (f) =>
        `${f.callsign} [${f.aircraftType}] ${f.status} alt=${f.altitudeFt}ft hdg=${f.headingDeg}° spd=${f.speedKt}kt rwy=${f.runway || "none"}`,
    )
    .join("\n");

  const conflictSummaries = conflicts.length
    ? conflicts
        .map(
          (c) =>
            `${c.severity} between ${c.flightA.callsign} and ${c.flightB.callsign}: separation ${c.horizontalSeparationNm}NM / ${c.verticalSeparationFt}FT. Advisory: ${c.resolutionAdvisory}`,
        )
        .join("\n")
    : "No active airspace separation conflicts detected.";

  return `You are an expert AI Air Traffic Control Radar Controller assistant operating under ICAO Doc 4444 and Annex 11 standards.
Pilot radio transmission received:
"${input.pilotTransmission}"

Active Radar Contacts in Sector:
${flightSummaries}

Airspace Conflict Alerts:
${conflictSummaries}

Airport Code: ${input.airportCode || "HYD"}

Tasks:
1. Extract the exact aircraft callsign and pilot intent.
2. Formulate a professional, standard ICAO ATC clearance response.
3. Formulate the exact pilot readback.
4. Extract tactical parameters (target altitude, heading, speed, squawk, runway, or status).
5. Provide concise rationale explaining the separation and safety rules applied.`;
}

/**
 * Main AI ATC Assistant Generator: Uses Gemini if available, with robust deterministic fallback
 */
export async function generateAiAtcAssistance(
  input: AiAtcAssistantRequest,
  flights: FlightDTO[],
  options?: { timeoutMs?: number; forceFallback?: boolean },
): Promise<AiAtcAssistantResponse> {
  const conflicts = detectAirspaceConflicts(flights);
  const configured = getConfiguredModel();

  if (!configured || options?.forceFallback) {
    return fallbackAtcAssistant(input, flights);
  }

  try {
    const timeout = options?.timeoutMs || 4000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const result = await generateText({
      model: configured.model,
      output: Output.object({ schema: atcAssistantOutputSchema }),
      maxOutputTokens: 800,
      prompt: buildPrompt(input, flights, conflicts),
      abortSignal: controller.signal,
    });
    clearTimeout(timer);

    return {
      callsign: result.output.callsign,
      intent: result.output.intent,
      recommendedClearance: result.output.recommendedClearance,
      pilotReadback: result.output.pilotReadback,
      suggestedParameters: result.output.suggestedParameters,
      conflicts,
      reasoning: result.output.reasoning,
      model: configured.modelName,
      simulated: false,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.warn("Gemini AI ATC assistant generation failed; using deterministic fallback.", error);
    return fallbackAtcAssistant(input, flights);
  }
}
