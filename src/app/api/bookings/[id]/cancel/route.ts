import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { cancelBooking } from "@/lib/services/booking-service";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (user) {
    const auth = assertPermission(user, "CANCEL_BOOKING");
    if (!auth.ok) {
      return Response.json({ error: auth.message }, { status: auth.status });
    }
  }

  const cancelled = await cancelBooking(id, {
    id: user?.id,
    name: user?.name,
  });

  if (!cancelled) {
    return Response.json({ error: "Booking not found" }, { status: 404 });
  }

  return Response.json({ ok: true, booking: cancelled });
}
