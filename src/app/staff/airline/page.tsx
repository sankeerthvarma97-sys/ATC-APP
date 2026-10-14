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

const AirlinesSection = nextDynamic(
  () => import("@/components/authority/sections/airlines-section").then((m) => m.AirlinesSection),
  { loading: () => <WidgetSkeleton title="Carrier Registry & Airlines" /> }
);
const AircraftSection = nextDynamic(
  () => import("@/components/authority/sections/aircraft-section").then((m) => m.AircraftSection),
  { loading: () => <WidgetSkeleton title="Airframe Fleet & Registry" /> }
);
const FlightsSection = nextDynamic(
  () => import("@/components/authority/sections/flights-section").then((m) => m.FlightsSection),
  { loading: () => <WidgetSkeleton title="Flight Manifest & Schedules" /> }
);

export const dynamic = "force-dynamic";

export default async function StaffAirlinePage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?callbackUrl=/staff/airline");
  }

  // Server-side authorization check
  const isAuthorized =
    user.role === "SUPER_ADMIN" ||
    user.role === "ADMIN" ||
    user.role === "AIRPORT_ADMIN" ||
    user.role === "AIRLINE_OPERATOR" ||
    user.role === "FLIGHT_DISPATCHER" ||
    hasPermission(user, "CREATE_FLIGHT") ||
    hasPermission(user, "MANAGE_AIRLINES");

  if (!isAuthorized) {
    redirect("/unauthorized");
  }

  return (
    <div className="p-6 space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-white tracking-tight">
          Airline Operations, Airframe Fleet & Dispatch
        </h1>
        <p className="text-xs text-slate-400 font-mono">
          Carrier fleet registry, tail numbers, dispatch schedules, and slot authorizations.
        </p>
      </div>

      <div className="space-y-6">
        <FlightsSection />
        <div className="pt-6 border-t border-slate-800">
          <AirlinesSection />
        </div>
        <div className="pt-6 border-t border-slate-800">
          <AircraftSection />
        </div>
      </div>
    </div>
  );
}
