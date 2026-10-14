import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { getBookingByPNR, cancelBooking } from "@/lib/services/booking-service";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getAuthenticatedUser();

  // 1. Enforce strict authentication on cancellation
  if (!user) {
    return Response.json(
      { error: "Authentication required to cancel a booking." },
      { status: 401 },
    );
  }

  // 2. Fetch the target booking to verify existence and ownership
  const booking = await getBookingByPNR(id);
  if (!booking) {
    return Response.json({ error: "Booking not found" }, { status: 404 });
  }

  // 3. Prevent IDOR / BOLA: Verify ownership or staff CANCEL_BOOKING permission
  const hasStaffPerm = assertPermission(user, "CANCEL_BOOKING").ok;
  const isOwner =
    Boolean(booking.createdById && booking.createdById === user.id) ||
    Boolean(booking.passengerId && booking.passengerId === user.id) ||
    Boolean(
      user.email &&
        booking.passengerEmail &&
        booking.passengerEmail.toLowerCase() === user.email.toLowerCase(),
    );

  if (!hasStaffPerm && !isOwner) {
    return Response.json(
      { error: "Forbidden: You are not authorized to cancel this booking." },
      { status: 403 },
    );
  }

  // 4. Perform atomic cancellation & refund
  const cancelled = await cancelBooking(id, {
    id: user.id,
    name: user.name,
  });

  if (!cancelled) {
    return Response.json({ error: "Failed to cancel booking" }, { status: 500 });
  }

  return Response.json({ ok: true, booking: cancelled });
}
