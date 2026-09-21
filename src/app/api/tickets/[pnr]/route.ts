import { getBookingByPNR } from "@/lib/services/booking-service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ pnr: string }> },
) {
  const { pnr } = await params;
  const booking = await getBookingByPNR(pnr);
  if (!booking) {
    return Response.json({ error: "Ticket not found" }, { status: 404 });
  }

  const ticket = {
    ticketNumber: booking.ticketNumber || `ET-2026-${booking.pnr}`,
    pnr: booking.pnr,
    flightNumber: booking.flightNumber || booking.flightCallsign,
    airline: booking.airline,
    origin: booking.origin,
    destination: booking.destination,
    departureTime: booking.departureTime,
    seatNumber: booking.seatNumber,
    travelClass: booking.travelClass,
    passengerName: booking.passengerName,
    gate: booking.gate,
    terminal: booking.terminal,
    bookingStatus: booking.bookingStatus,
    paymentStatus: booking.paymentStatus,
    qrCode: booking.qrCode,
  };

  return Response.json({ ticket, booking });
}
