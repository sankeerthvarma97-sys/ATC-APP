import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import {
  processFlightArrivalAndCompletion,
  processMissedFlights,
} from "@/lib/services/booking-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (user) {
    const isOps =
      user.role === "SUPER_ADMIN" ||
      user.role === "ADMIN" ||
      user.role === "AIRPORT_ADMIN" ||
      user.role === "OPERATIONS_MANAGER" ||
      user.role === "ATC" ||
      user.role === "SIMULATOR_OPERATOR" ||
      assertPermission(user, "VIEW_FLIGHTS").ok;

    if (!isOps) {
      return Response.json({ error: "Forbidden: Operations permissions required." }, { status: 403 });
    }
  }

  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || "MISSED_FLIGHTS"; // "MISSED_FLIGHTS" | "FLIGHT_COMPLETION"
    const flightId = body.flightId;

    if (action === "FLIGHT_COMPLETION") {
      if (!flightId) {
        return Response.json({ error: "flightId is required for FLIGHT_COMPLETION action." }, { status: 400 });
      }
      const result = await processFlightArrivalAndCompletion(flightId);
      return Response.json({ ok: true, action, result });
    }

    // Default action: MISSED_FLIGHTS
    const result = await processMissedFlights(flightId);
    return Response.json({ ok: true, action: "MISSED_FLIGHTS", result });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Operational lifecycle processing failed." },
      { status: 500 }
    );
  }
}
