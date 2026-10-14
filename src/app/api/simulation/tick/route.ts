import { executeSimulationTick } from "@/lib/simulation/simulation-manager";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    let steps = 1;
    try {
      const body = await request.json();
      if (typeof body.steps === "number") {
        steps = Math.min(10, Math.max(1, body.steps));
      }
    } catch {
      // Body is optional
    }

    const result = await executeSimulationTick(steps);

    return Response.json({
      success: true,
      metrics: result.metrics,
      config: result.config,
      stepResults: result.stepResults,
    });
  } catch (error) {
    console.error("POST /api/simulation/tick error:", error);
    const msg = error instanceof Error ? error.message : "Tick execution failed.";
    return Response.json({ error: msg }, { status: 500 });
  }
}
