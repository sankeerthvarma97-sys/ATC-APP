import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { createAircraft, listAircraft } from "@/lib/services/fleet-service";
import { createAircraftSchema } from "@/lib/validations/authority";

export const dynamic = "force-dynamic";

export async function GET() {
  const aircraft = await listAircraft();
  return Response.json({ aircraft });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  const auth = assertPermission(user, "MANAGE_AIRCRAFT");
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const parsed = createAircraftSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const aircraft = await createAircraft(
      { ...parsed.data },
      { id: user?.id, name: user?.name },
    );

    return Response.json({ aircraft }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to create aircraft" },
      { status: 500 },
    );
  }
}
