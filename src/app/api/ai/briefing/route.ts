import { getAuthenticatedUser } from "@/lib/auth/session";
import { requireAnyRole } from "@/lib/auth/rbac";
import { generateOperationalBriefing } from "@/lib/ai/briefing";
import { getOperationsSnapshot } from "@/lib/repositories/operations-repository";
import { aiBriefingSchema } from "@/lib/validations/operations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const authz = requireAnyRole(user, [
    "SUPER_ADMIN",
    "ADMIN",
    "AIRPORT_ADMIN",
    "ANALYST",
    "ATC",
    "ATC_CONTROLLER",
    "SENIOR_ATC_CONTROLLER",
    "SUPERVISOR",
    "PILOT",
    "FLIGHT_DISPATCHER",
    "OPERATIONS_MANAGER",
  ]);
  if (!authz.ok) {
    return Response.json({ error: authz.message }, { status: authz.status });
  }
  const actor = user;
  if (!actor) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = aiBriefingSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid AI briefing request.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const snapshot = await getOperationsSnapshot(actor);
  const briefing = await generateOperationalBriefing(parsed.data, snapshot);
  return Response.json(briefing);
}
