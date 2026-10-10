import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { getAirportScope } from "@/lib/auth/airport-scope";
import { createBooking, listBookingsPaged } from "@/lib/services/booking-service";
import { createBookingSchema } from "@/lib/validations/authority";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  const auth = assertPermission(user, "VIEW_BOOKINGS");
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  let scope;
  try {
    scope = await getAirportScope(user!);
  } catch {
    return Response.json({ error: "Could not verify airport assignment." }, { status: 503 });
  }
  if (!scope) return Response.json({ error: "No active, verified airport assignment." }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || undefined;
  const flightId = searchParams.get("flightId") || undefined;
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("pageSize") || "25", 10)));

  const paged = await listBookingsPaged({
    query,
    flightId,
    page,
    pageSize,
    airportCode: scope.global ? undefined : scope.airportCode,
  });
  return Response.json({
    bookings: paged.bookings,
    total: paged.total,
    page: paged.page,
    pageSize: paged.pageSize,
    totalPages: paged.totalPages,
  });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  // If user is logged in, check permission. If not, allowed for simulation booking (guest passenger)
  if (user) {
    const auth = assertPermission(user, "CREATE_BOOKING");
    if (!auth.ok) {
      return Response.json({ error: auth.message }, { status: auth.status });
    }
  }

  try {
    const body = await request.json();
    const parsed = createBookingSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const booking = await createBooking({
      ...parsed.data,
      createdById: user?.id,
      actorName: user?.name,
    });

    return Response.json({ booking }, { status: 201 });
  } catch (error: unknown) {
    const isDoubleBook =
      (error as { code?: string }).code === "SEAT_ALREADY_BOOKED" ||
      (error instanceof Error && error.message.includes("no longer available"));

    if (isDoubleBook) {
      return Response.json(
        { error: "Seat is already booked. Please choose another seat." },
        { status: 409 },
      );
    }

    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to create booking." },
      { status: 500 },
    );
  }
}
