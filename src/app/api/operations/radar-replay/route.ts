import {
  generateInvestigationReport,
  getReplayScenarioById,
  listReplayScenarios,
  sampleAircraftTelemetry,
} from "@/lib/services/radar-replay-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scenarioId = searchParams.get("scenarioId");
  const getReport = searchParams.get("report") === "true";
  const timeOffset = searchParams.get("time") ? Number(searchParams.get("time")) : undefined;

  if (getReport && scenarioId) {
    const report = generateInvestigationReport(scenarioId);
    return Response.json(report);
  }

  if (scenarioId) {
    const scenario = getReplayScenarioById(scenarioId);
    if (!scenario) {
      return Response.json({ error: "Scenario not found." }, { status: 404 });
    }

    if (timeOffset !== undefined) {
      const sampled = scenario.aircraft.map((ac) => ({
        callsign: ac.callsign,
        aircraftType: ac.aircraftType,
        telemetry: sampleAircraftTelemetry(ac.track, timeOffset),
      }));
      return Response.json({ scenarioId, timeOffset, sampled });
    }

    return Response.json(scenario);
  }

  const scenarios = listReplayScenarios();
  return Response.json({ scenarios });
}
