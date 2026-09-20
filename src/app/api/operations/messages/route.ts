import { getAuthenticatedUser } from "@/lib/auth/session";
import { requireAnyRole } from "@/lib/auth/rbac";
import { recordRadioMessage } from "@/lib/repositories/operations-repository";
import { radioMessageSchema } from "@/lib/validations/operations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  const authz = requireAnyRole(user ?? undefined, ["ATC", "PILOT", "SUPERVISOR"]);
  if (!authz.ok) {
    return Response.json({ error: authz.message }, { status: authz.status });
  }
  const actor = user;
  if (!actor) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = radioMessageSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid radio message payload.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const result = await recordRadioMessage(parsed.data, actor);
  return Response.json(result);
}
