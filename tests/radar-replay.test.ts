import { describe, expect, it } from "vitest";
import {
  generateInvestigationReport,
  getReplayScenarioById,
  listReplayScenarios,
  sampleAircraftTelemetry,
} from "@/lib/services/radar-replay-service";

describe("ADS-B 4D Radar Replay & Incident Reconstruction", () => {
  it("lists all pre-configured operational and incident replay scenarios", () => {
    const scenarios = listReplayScenarios();
    expect(scenarios.length).toBeGreaterThanOrEqual(4);

    const tcasScenario = scenarios.find((s) => s.category === "TCAS_RA_CONFLICT");
    expect(tcasScenario).toBeDefined();
    expect(tcasScenario?.severity).toBe("CRITICAL");
    expect(tcasScenario?.aircraft.length).toBe(2);

    const cdaScenario = scenarios.find((s) => s.category === "CONTINUOUS_DESCENT");
    expect(cdaScenario).toBeDefined();
    expect(cdaScenario?.severity).toBe("ROUTINE");

    const holdScenario = scenarios.find((s) => s.category === "HOLDING_PATTERN");
    expect(holdScenario).toBeDefined();

    const gaScenario = scenarios.find((s) => s.category === "GO_AROUND_MISSED_APPROACH");
    expect(gaScenario).toBeDefined();
  });

  it("retrieves scenario by ID and verifies multi-aircraft tracks", () => {
    const scenario = getReplayScenarioById("tcas-ra-conflict-01");
    expect(scenario).toBeDefined();
    expect(scenario?.title).toContain("TCAS II Resolution Advisory");
    expect(scenario?.aircraft.map((a) => a.callsign)).toEqual(["AIC101", "VTI814"]);

    const aic = scenario!.aircraft[0];
    expect(aic.track.length).toBeGreaterThan(10);
    expect(aic.track[0].secondOffset).toBe(0);
    expect(aic.track[aic.track.length - 1].secondOffset).toBe(scenario!.durationSeconds);
  });

  it("samples and interpolates aircraft telemetry at arbitrary seconds with TCAS RA detection", () => {
    const scenario = getReplayScenarioById("tcas-ra-conflict-01")!;
    const aic = scenario.aircraft.find((a) => a.callsign === "AIC101")!;

    // Baseline telemetry at second 0
    const tele0 = sampleAircraftTelemetry(aic.track, 0);
    expect(tele0.altitudeFt).toBe(5000);
    expect(tele0.verticalSpeedFpm).toBe(0);
    expect(tele0.tcasState).toBe("NORMAL");

    // Telemetry during TCAS RA activation at second 600
    const teleRa = sampleAircraftTelemetry(aic.track, 600);
    expect(teleRa.tcasState).toBe("RESOLUTION_ADVISORY");
    expect(teleRa.verticalSpeedFpm).toBeGreaterThan(1500);
    expect(teleRa.pitchDeg).toBeGreaterThan(10);
    expect(teleRa.altitudeFt).toBeGreaterThan(5000);

    // Fractional second interpolation
    const teleInterp = sampleAircraftTelemetry(aic.track, 25);
    expect(teleInterp.secondOffset).toBe(25);
    expect(teleInterp.latitude).toBeGreaterThan(17.0);
    expect(teleInterp.longitude).toBeGreaterThan(78.0);
  });

  it("generates an ICAO Annex 13 Safety Incident Investigation Report", () => {
    const report = generateInvestigationReport("tcas-ra-conflict-01");

    expect(report.scenarioId).toBe("tcas-ra-conflict-01");
    expect(report.investigationRef).toContain("AOCC-SAFETY-INCIDENT");
    expect(report.closestPointOfApproach.horizontalSeparationNm).toBeLessThan(2.0);
    expect(report.closestPointOfApproach.verticalSeparationFt).toBe(1400);
    expect(report.safetyFindings.length).toBeGreaterThan(2);
    expect(report.recommendations.length).toBeGreaterThan(1);
    expect(report.aircraftInvolved.length).toBe(2);
  });
});
