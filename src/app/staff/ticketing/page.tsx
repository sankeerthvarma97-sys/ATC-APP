import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { TicketingSection } from "@/components/authority/sections/ticketing-section";
import { BookingsSection } from "@/components/authority/sections/bookings-section";

export const dynamic = "force-dynamic";

export default async function StaffTicketingPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?callbackUrl=/staff/ticketing");
  }

  // Server-side authorization check
  const isAuthorized =
    user.role === "SUPER_ADMIN" ||
    user.role === "ADMIN" ||
    user.role === "AIRPORT_ADMIN" ||
    user.role === "TICKETING_AGENT" ||
    user.role === "SUPERVISOR" ||
    hasPermission(user, "CREATE_BOOKING") ||
    hasPermission(user, "VERIFY_TICKET");

  if (!isAuthorized) {
    redirect("/unauthorized");
  }

  return (
    <div className="p-6 space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-white tracking-tight">
          Passenger Services, Ticketing & Reservations
        </h1>
        <p className="text-xs text-slate-400 font-mono">
          Authoritative booking engine, seat inventory allocation, and e-ticket generation.
        </p>
      </div>

      <div className="space-y-6">
        <TicketingSection />
        <div className="pt-6 border-t border-slate-800">
          <BookingsSection />
        </div>
      </div>
    </div>
  );
}
