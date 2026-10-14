import nextDynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

function WidgetSkeleton({ title }: { title: string }) {
  return (
    <div className="h-64 rounded-xl border border-slate-800 bg-slate-900/40 p-5 font-mono animate-pulse flex flex-col justify-between">
      <div className="h-4 w-48 rounded bg-slate-800" />
      <div className="h-40 rounded-lg bg-slate-800/30 flex items-center justify-center text-xs text-slate-600">
        Loading {title}...
      </div>
    </div>
  );
}

const TicketingSection = nextDynamic(
  () => import("@/components/authority/sections/ticketing-section").then((m) => m.TicketingSection),
  { loading: () => <WidgetSkeleton title="Passenger Ticketing & Fares" /> }
);
const BookingsSection = nextDynamic(
  () => import("@/components/authority/sections/bookings-section").then((m) => m.BookingsSection),
  { loading: () => <WidgetSkeleton title="Reservations & Bookings Database" /> }
);

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
