import { getBookingByPNR } from "@/lib/services/booking-service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const booking = await getBookingByPNR(id);
  if (!booking) {
    return Response.json({ error: "Booking not found" }, { status: 404 });
  }
  return Response.json({ booking });
}
