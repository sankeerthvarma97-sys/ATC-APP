import { getAuthenticatedUser } from "@/lib/auth/session";
import { getOperationsSnapshot } from "@/lib/repositories/operations-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const snapshot = await getOperationsSnapshot(user);
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const query = searchParams.get("q")?.toLowerCase();

  const flights = snapshot.flights.filter((flight) => {
    const matchesStatus = !status || status === "ALL" || flight.status === status;
    const matchesQuery =
      !query ||
      flight.callsign.toLowerCase().includes(query) ||
      flight.airline.toLowerCase().includes(query) ||
      flight.origin.toLowerCase().includes(query) ||
      flight.destination.toLowerCase().includes(query);
    return matchesStatus && matchesQuery;
  });

  return Response.json({ flights });
}
