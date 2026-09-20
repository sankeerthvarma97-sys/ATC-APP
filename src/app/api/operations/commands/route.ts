import { getAuthenticatedUser } from "@/lib/auth/session";
import { requireAnyRole } from "@/lib/auth/rbac";
import { executeFlightCommand } from "@/lib/repositories/operations-repository";
import { flightCommandSchema } from "@/lib/validations/operations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  const authz = requireAnyRole(user ?? undefined, ["ATC", "GROUND", "SUPERVISOR"]);
  if (!authz.ok) {
    return Response.json({ error: authz.message }, { status: authz.status });
  }
  const actor = user;
  if (!actor) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = flightCommandSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid command payload.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const result = await executeFlightCommand(parsed.data, actor);
  return Response.json(result);
}
