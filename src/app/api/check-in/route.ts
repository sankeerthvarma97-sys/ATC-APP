import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { checkInPassenger } from "@/lib/services/checkin-service";
import { checkInSchema } from "@/lib/validations/authority";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  const auth = assertPermission(user, "CHECK_IN_PASSENGER");
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const parsed = checkInSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const result = await checkInPassenger({
      ...parsed.data,
      actor: { id: user?.id, name: user?.name },
    });

    if (!result.ok) {
      return Response.json({ error: result.message }, { status: 400 });
    }

    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Check-in failed" },
      { status: 500 },
    );
  }
}
