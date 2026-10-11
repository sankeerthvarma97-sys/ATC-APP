import { getAuthenticatedUser, getCurrentUserOrDemo } from "@/lib/auth/session";
import { requireAnyRole } from "@/lib/auth/rbac";
import { generateAiAtcAssistance } from "@/lib/ai/atc-assistant";
import { getOperationsSnapshot } from "@/lib/repositories/operations-repository";
import { aiAtcAssistantSchema } from "@/lib/validations/operations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = (await getAuthenticatedUser()) || (await getCurrentUserOrDemo());
  const authz = requireAnyRole(user ?? undefined, [
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
  const parsed = aiAtcAssistantSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid AI ATC assistant request.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const snapshot = await getOperationsSnapshot(actor);
    const assistance = await generateAiAtcAssistance(parsed.data, snapshot.flights);
    return Response.json(assistance);
  } catch (error) {
    console.error("AI ATC Assistant error:", error);
    return Response.json(
      { error: "Failed to generate AI ATC assistant recommendations." },
      { status: 500 },
    );
  }
}
