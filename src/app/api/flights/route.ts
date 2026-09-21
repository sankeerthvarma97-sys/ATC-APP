import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { createFlight, listFlightsPaged } from "@/lib/services/flight-service";
import { createFlightSchema } from "@/lib/validations/authority";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = searchParams.get("from") || searchParams.get("origin") || undefined;
  const destination = searchParams.get("to") || searchParams.get("destination") || undefined;
  const status = searchParams.get("status") || undefined;
  const query = searchParams.get("q") || undefined;
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("pageSize") || "25", 10)));

  const paged = await listFlightsPaged({
    origin,
    destination,
    status,
    query,
    page,
    pageSize,
  });

  return Response.json(
    {
      flights: paged.flights,
      total: paged.total,
      page: paged.page,
      pageSize: paged.pageSize,
      totalPages: paged.totalPages,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=1, stale-while-revalidate=3",
      },
    },
  );
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  const auth = assertPermission(user, "CREATE_FLIGHT");
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const parsed = createFlightSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const flight = await createFlight({
      ...parsed.data,
      actorId: user?.id,
      actorName: user?.name,
    });

    return Response.json({ flight }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to create flight" },
      { status: 500 },
    );
  }
}
