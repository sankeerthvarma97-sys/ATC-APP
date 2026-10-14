import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { getBookingByPNR } from "@/lib/services/booking-service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const booking = await getBookingByPNR(id);
  if (!booking) {
    return Response.json({ error: "Booking not found" }, { status: 404 });
  }

  const user = await getAuthenticatedUser();
  const url = new URL(request.url);
  const providedEmail = url.searchParams.get("email")?.trim().toLowerCase();
  const providedLastName = url.searchParams.get("lastName")?.trim().toLowerCase();

  // If user is logged in
  if (user) {
    const hasStaffPerm = assertPermission(user, "VIEW_BOOKINGS").ok;
    const isOwner =
      Boolean(booking.createdById && booking.createdById === user.id) ||
      Boolean(booking.passengerId && booking.passengerId === user.id) ||
      Boolean(
        user.email &&
          booking.passengerEmail &&
          booking.passengerEmail.toLowerCase() === user.email.toLowerCase(),
      );

    if (hasStaffPerm || isOwner) {
      return Response.json({ booking });
    }

    return Response.json(
      { error: "Forbidden: You are not authorized to view this booking." },
      { status: 403 },
    );
  }

  // If unauthenticated: Require matching passenger email or last name verification
  if (
    providedEmail &&
    booking.passengerEmail &&
    booking.passengerEmail.toLowerCase() === providedEmail
  ) {
    return Response.json({ booking });
  }

  if (
    providedLastName &&
    booking.passengerName &&
    booking.passengerName.toLowerCase().split(/\s+/).pop() === providedLastName
  ) {
    return Response.json({ booking });
  }

  return Response.json(
    {
      error:
        "Authentication required or provide matching passenger verification (?email=... or ?lastName=...).",
    },
    { status: 401 },
  );
}
