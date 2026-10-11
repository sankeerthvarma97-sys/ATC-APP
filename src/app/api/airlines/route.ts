import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { createAirline, listAirlines } from "@/lib/services/fleet-service";
import { createAirlineSchema } from "@/lib/validations/authority";

export const dynamic = "force-dynamic";

export async function GET() {
  const airlines = await listAirlines();
  return Response.json(
    { airlines },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400" } }
  );
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  const auth = assertPermission(user, "MANAGE_AIRLINES");
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const parsed = createAirlineSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const airline = await createAirline(
      { ...parsed.data, status: "ACTIVE" },
      { id: user?.id, name: user?.name },
    );

    return Response.json({ airline }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to create airline" },
      { status: 500 },
    );
  }
}
