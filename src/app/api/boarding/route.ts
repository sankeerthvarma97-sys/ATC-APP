import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { airportScopeAllowsFlight, getAirportScope } from "@/lib/auth/airport-scope";
import { boardPassenger, getBoardingManifest } from "@/lib/services/checkin-service";
import { getFlightById } from "@/lib/services/flight-service";
import { boardingSchema } from "@/lib/validations/authority";

export const dynamic = "force-dynamic";

async function canOperateFlight(user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>, flightId: string) {
  const flightData = await getFlightById(flightId);
  if (!flightData) return { flight: null, allowed: false };
  const scope = await getAirportScope(user);
  return {
    flight: flightData.flight,
    allowed: scope !== null && airportScopeAllowsFlight(scope, flightData.flight),
  };
}

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  const auth = assertPermission(user, "VIEW_PASSENGERS");
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  const flightId = new URL(request.url).searchParams.get("flightId")?.trim();
  if (!flightId) return Response.json({ error: "flightId is required." }, { status: 400 });

  const access = await canOperateFlight(user!, flightId);
  if (!access.flight) return Response.json({ error: "Flight not found." }, { status: 404 });
  if (!access.allowed) return Response.json({ error: "You are not assigned to this airport, terminal, or gate." }, { status: 403 });

  try {
    const manifest = await getBoardingManifest(access.flight.id);
    return Response.json({ flight: access.flight, manifest });
  } catch {
    return Response.json({ error: "Could not load the flight manifest." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  const auth = assertPermission(user, "BOARD_PASSENGER");
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const parsed = boardingSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const access = await canOperateFlight(user!, parsed.data.flightId);
    if (!access.flight) return Response.json({ error: "Flight not found." }, { status: 404 });
    if (!access.allowed) return Response.json({ error: "You are not assigned to this airport, terminal, or gate." }, { status: 403 });

    const result = await boardPassenger({
      pnr: parsed.data.pnr,
      flightId: access.flight.id,
      gate: parsed.data.gate,
      actor: { id: user?.id, name: user?.name },
    });

    if (!result.ok) {
      return Response.json({ error: result.message }, { status: 400 });
    }

    return Response.json({ ok: true, message: result.message });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Boarding failed" },
      { status: 500 },
    );
  }
}
