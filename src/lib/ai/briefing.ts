import { google } from "@ai-sdk/google";
import { generateText, gateway, Output } from "ai";
import { z } from "zod";
import type { AiBriefingRequest, AiBriefingResponse, OperationsSnapshot } from "@/lib/domain";

const briefingOutputSchema = z.object({
  briefing: z.string().min(20),
  actions: z.array(z.string()).min(2).max(6),
  risk: z.enum(["INFO", "ADVISORY", "WARNING", "CRITICAL"]),
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

function buildPrompt(input: AiBriefingRequest, snapshot: OperationsSnapshot) {
  const flights = snapshot.flights
    .map(
      (flight) =>
        `${flight.callsign} ${flight.status} ${flight.phase} risk=${flight.riskScore} alt=${flight.altitudeFt} runway=${flight.runway ?? "none"}`,
    )
    .join("\n");
  const resources = snapshot.resources
    .map((resource) => `${resource.resourceType} ${resource.code} ${resource.status}`)
    .join("\n");
  const events = snapshot.events
    .slice(0, 8)
    .map((event) => `${event.severity} ${event.title}: ${event.detail}`)
    .join("\n");

  return `You are an assistant inside an educational Airport Operations Control Center simulation.
Never claim to provide certified or real-world ATC instructions.
Focus: ${input.focus}
Operator question: ${input.question}

Metrics:
${JSON.stringify(snapshot.metrics)}

Flights:
${flights}

Resources:
${resources}

Recent events:
${events}

Return a concise operational briefing, practical next actions, and an overall risk severity.`;
}

function fallbackBriefing(input: AiBriefingRequest, snapshot: OperationsSnapshot): AiBriefingResponse {
  const emergency = snapshot.flights.find((flight) => flight.status === "EMERGENCY");
  const holds = snapshot.flights.filter((flight) => flight.status === "HOLDING");
  const risk = emergency ? "CRITICAL" : holds.length > 0 ? "WARNING" : snapshot.metrics.averageRisk > 35 ? "ADVISORY" : "INFO";

  return {
    model: "deterministic-simulation",
    simulated: true,
    risk,
    briefing:
      emergency
        ? `${emergency.callsign} is the priority simulation item. Keep runway ${emergency.runway ?? "assigned"} protected, keep emergency services staged, and avoid compressing arrival spacing until the exercise is resolved.`
        : `Traffic is manageable with ${snapshot.metrics.activeFlights} active flights and ${snapshot.metrics.runwayUtilization}% runway utilization. The requested ${input.focus} view shows no certified operational instruction, only simulation guidance.`,
    actions: [
      holds.length ? `Review release timing for ${holds.map((flight) => flight.callsign).join(", ")}.` : "Maintain runway split and monitor arrival compression.",
      "Confirm every simulated status change is audit logged before handing off shift.",
      "Use radio messages for ATC-to-pilot and pilot-to-ATC exercise communication.",
    ],
  };
}

export async function generateOperationalBriefing(
  input: AiBriefingRequest,
  snapshot: OperationsSnapshot,
): Promise<AiBriefingResponse> {
  const configured = getConfiguredModel();
  if (!configured) {
    return fallbackBriefing(input, snapshot);
  }

  try {
    const result = await generateText({
      model: configured.model,
      output: Output.object({ schema: briefingOutputSchema }),
      maxOutputTokens: 700,
      prompt: buildPrompt(input, snapshot),
      abortSignal: AbortSignal.timeout(4500),
    });

    return {
      model: configured.modelName,
      simulated: false,
      briefing: result.output.briefing,
      actions: result.output.actions,
      risk: result.output.risk,
    };
  } catch (error) {
    console.warn("AI briefing failed; using deterministic fallback.", error);
    return fallbackBriefing(input, snapshot);
  }
}
