import { listGates, listRunways, updateGateStatus, updateRunwayStatus } from "@/lib/services/fleet-service";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  if (type === "RUNWAY") {
    const runways = await listRunways();
    return Response.json({ runways });
  }

  if (type === "GATE") {
    const gates = await listGates();
    return Response.json({ gates });
  }

  const [runways, gates] = await Promise.all([listRunways(), listGates()]);
  return Response.json({ runways, gates });
}

export async function PATCH(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await request.json();
  const { resourceType, id, code, status, updates } = body;

  if (resourceType === "RUNWAY") {
    const auth = assertPermission(user, "MANAGE_RUNWAYS");
    if (!auth.ok) {
      return Response.json({ error: auth.message }, { status: auth.status });
    }

    const runwayTarget = id || code;
    if (!runwayTarget) {
      return Response.json({ error: "Missing runway id or code" }, { status: 400 });
    }

    const updated = await updateRunwayStatus(
      runwayTarget,
      { ...(status ? { status } : {}), ...(updates || {}) },
      { id: user.id, name: user.name }
    );

    if (!updated) {
      return Response.json({ error: "Runway not found" }, { status: 404 });
    }

    return Response.json({ success: true, runway: updated });
  }

  if (resourceType === "GATE") {
    const auth = assertPermission(user, "MANAGE_GATES");
    if (!auth.ok) {
      return Response.json({ error: auth.message }, { status: auth.status });
    }

    const gateTarget = code || id;
    if (!gateTarget) {
      return Response.json({ error: "Missing gate code or id" }, { status: 400 });
    }

    const updated = await updateGateStatus(gateTarget, status, updates?.assignedFlightId);
    return Response.json({ success: true, gate: updated });
  }

  return Response.json({ error: "Invalid resourceType. Must be RUNWAY or GATE." }, { status: 400 });
}

