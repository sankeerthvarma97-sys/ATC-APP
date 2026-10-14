import { getAuthenticatedUser } from "@/lib/auth/session";
import {
  getSimulationConfig,
  getSimulationMetrics,
  startSimulation,
  pauseSimulation,
  stopSimulation,
  resetSimulation,
  updateSimulationConfig,
} from "@/lib/simulation/simulation-manager";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [config, metrics] = await Promise.all([
      getSimulationConfig(),
      getSimulationMetrics(),
    ]);

    return Response.json({
      config,
      metrics,
    });
  } catch (error) {
    console.error("GET /api/simulation/status error:", error);
    return Response.json(
      { error: "Failed to retrieve simulation status." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  // Verify supervisor/admin role for controlling simulation
  const allowedRoles = ["SUPER_ADMIN", "ADMIN", "AIRPORT_ADMIN", "OPERATIONS_MANAGER", "SIMULATOR_OPERATOR"];
  if (!allowedRoles.includes(user.role)) {
    return Response.json(
      { error: "Insufficient permissions to control the simulation." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const action = body.action;

    let config;
    let message = "Action completed";

    switch (action) {
      case "start":
      case "resume":
        config = await startSimulation();
        message = "Simulation started/resumed.";
        break;

      case "pause":
        config = await pauseSimulation();
        message = "Simulation paused.";
        break;

      case "stop":
        config = await stopSimulation();
        message = "Simulation stopped.";
        break;

      case "reset":
        const resetRes = await resetSimulation();
        config = resetRes.config;
        message = resetRes.message;
        break;

      case "update_config":
        if (!body.config || typeof body.config !== "object") {
          return Response.json({ error: "Missing config updates." }, { status: 400 });
        }
        config = await updateSimulationConfig(body.config);
        message = "Simulation configuration updated.";
        break;

      default:
        return Response.json(
          { error: `Unknown simulation action: ${action}` },
          { status: 400 }
        );
    }

    const metrics = await getSimulationMetrics();

    return Response.json({
      success: true,
      message,
      config,
      metrics,
    });
  } catch (error: unknown) {
    console.error("POST /api/simulation/status error:", error);
    const msg = error instanceof Error ? error.message : "Internal simulation error.";
    return Response.json({ error: msg }, { status: 500 });
  }
}
