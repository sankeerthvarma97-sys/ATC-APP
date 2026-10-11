import { getAuthenticatedUser, getCurrentUserOrDemo } from "@/lib/auth/session";
import { requireAnyRole } from "@/lib/auth/rbac";
import { optimizeGateAllocations } from "@/lib/services/gate-allocation-service";
import { getOperationsSnapshot } from "@/lib/repositories/operations-repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = (await getAuthenticatedUser()) || (await getCurrentUserOrDemo());
  const authz = requireAnyRole(user ?? undefined, [
    "SUPER_ADMIN",
    "ADMIN",
    "AIRPORT_ADMIN",
    "ATC",
    "ATC_CONTROLLER",
    "SENIOR_ATC_CONTROLLER",
    "OPERATIONS_MANAGER",
    "FLIGHT_DISPATCHER",
  ]);

  if (!authz.ok) {
    return Response.json({ error: authz.message }, { status: authz.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const airportCode = body.airportCode || "HYD";

    const snapshot = await getOperationsSnapshot(user);
    const plan = optimizeGateAllocations(snapshot.flights, airportCode);

    return Response.json(plan);
  } catch (error) {
    console.error("Gate allocation optimization failed:", error);
    return Response.json(
      { error: "Failed to generate gate allocation plan." },
      { status: 500 },
    );
  }
}
