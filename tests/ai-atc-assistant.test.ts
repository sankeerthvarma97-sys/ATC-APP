import { describe, expect, it } from "vitest";
import {
  detectAirspaceConflicts,
  fallbackAtcAssistant,
  generateAiAtcAssistance,
} from "@/lib/ai/atc-assistant";
import type { FlightDTO } from "@/lib/domain";

describe("AI ATC Assistant & Airspace Conflict Detection", () => {
  const mockFlights: FlightDTO[] = [
    {
      id: "flt-1",
      callsign: "AIC101",
      flightNumber: "AI101",
      airline: "Air India",
      aircraftType: "Boeing 787-8",
      status: "AIRBORNE",
      phase: "En-route cruising",
      origin: "DEL",
      destination: "HYD",
      runway: "09L",
      squawk: "4211",
      latitude: 17.245,
      longitude: 78.431,
      altitudeFt: 5000,
      speedKt: 250,
      headingDeg: 90,
      verticalSpeedFpm: 0,
      fuelKg: 12000,
      riskScore: 10,
      eta: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "flt-2",
      callsign: "VTI814",
      flightNumber: "UK814",
      airline: "Vistara",
      aircraftType: "Airbus A320neo",
      status: "AIRBORNE",
      phase: "Climbing out",
      origin: "BOM",
      destination: "HYD",
      runway: "09L",
      squawk: "4212",
      // Close coordinates: distance ~1.5 NM, altitude diff 400 ft -> Loss of separation!
      latitude: 17.265,
      longitude: 78.435,
      altitudeFt: 5400,
      speedKt: 240,
      headingDeg: 100,
      verticalSpeedFpm: 500,
      fuelKg: 8000,
      riskScore: 15,
      eta: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "flt-3",
      callsign: "IGO502",
      flightNumber: "6E502",
      airline: "IndiGo",
      aircraftType: "Airbus A321neo",
      status: "BOARDING",
      phase: "Gate boarding",
      origin: "HYD",
      destination: "BLR",
      runway: "09L",
      squawk: "1200",
      latitude: 17.2403,
      longitude: 78.4294,
      altitudeFt: 0,
      speedKt: 0,
      headingDeg: 270,
      verticalSpeedFpm: 0,
      fuelKg: 7500,
      riskScore: 5,
      eta: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  it("detects loss of radar separation between proximate airborne flights", () => {
    const conflicts = detectAirspaceConflicts(mockFlights);

    expect(conflicts.length).toBeGreaterThan(0);
    const lossOfSep = conflicts.find((c) => c.conflictType === "LOSS_OF_SEPARATION");
    expect(lossOfSep).toBeDefined();
    expect(lossOfSep?.horizontalSeparationNm).toBeLessThan(5.0);
    expect(lossOfSep?.verticalSeparationFt).toBeLessThan(1000);
    expect(lossOfSep?.resolutionAdvisory).toContain("CLIMB");
  });

  it("parses pilot direct waypoint requests into standard ICAO clearances and readbacks", () => {
    const response = fallbackAtcAssistant(
      {
        pilotTransmission: "Vistara 814, passing 4000 for 7000, requesting direct BOPOL",
      },
      [mockFlights[1]],
    );

    expect(response.callsign).toBe("VTI814");
    expect(response.intent).toBe("WAYPOINT_DIRECT");
    expect(response.recommendedClearance).toContain("cleared direct BOPOL");
    expect(response.pilotReadback).toContain("BOPOL");
    expect(response.suggestedParameters.altitudeFt).toBe(18000);

    // When proximate conflict is detected with mockFlights, verify safety priority override
    const conflictResponse = fallbackAtcAssistant(
      {
        pilotTransmission: "Vistara 814, passing 4000 for 7000, requesting direct BOPOL",
      },
      mockFlights,
    );
    expect(conflictResponse.reasoning).toContain("PRIORITY OVERRIDE");
    expect(conflictResponse.suggestedParameters.altitudeFt).toBe(6900);
  });

  it("handles emergency MAYDAY transmission with priority routing and transponder 7700", () => {
    const response = fallbackAtcAssistant(
      {
        pilotTransmission: "Air India 101, MAYDAY MAYDAY MAYDAY, engine 2 fire, request immediate landing",
      },
      mockFlights,
    );

    expect(response.callsign).toBe("AIC101");
    expect(response.intent).toBe("EMERGENCY_MAYDAY");
    expect(response.recommendedClearance).toContain("MAYDAY acknowledged");
    expect(response.recommendedClearance).toContain("7700");
    expect(response.suggestedParameters.squawk).toBe("7700");
    expect(response.suggestedParameters.status).toBe("EMERGENCY");
    expect(response.pilotReadback).toContain("squawking 7700");
  });

  it("parses ground pushback requests with heading orientation", () => {
    const response = fallbackAtcAssistant(
      {
        pilotTransmission: "IndiGo 502, stand 14, request pushback and start-up facing west",
      },
      mockFlights,
    );

    expect(response.callsign).toBe("IGO502");
    expect(response.intent).toBe("PUSHBACK_STARTUP");
    expect(response.recommendedClearance).toContain("Pushback and start-up approved facing West");
    expect(response.pilotReadback).toContain("facing West");
  });

  it("executes generateAiAtcAssistance seamlessly with deterministic fallback", async () => {
    const result = await generateAiAtcAssistance(
      {
        pilotTransmission: "SpiceJet 303, requesting descent to 4000 feet",
        airportCode: "HYD",
      },
      mockFlights,
      { forceFallback: true },
    );

    expect(result.callsign).toBe("SEJ303");
    expect(result.intent).toBe("CLIMB_DESCEND");
    expect(result.recommendedClearance).toContain("descend");
    expect(result.suggestedParameters.altitudeFt).toBe(4000);
    expect(result.pilotReadback).toContain("Descend");
    expect(result.conflicts).toBeDefined();
    expect(result.timestamp).toBeDefined();
  });
});
