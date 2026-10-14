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

const RunwaysSection = nextDynamic(
  () => import("@/components/authority/sections/runways-section").then((m) => m.RunwaysSection),
  { loading: () => <WidgetSkeleton title="Runway Surface & Engineering" /> }
);
const AircraftSection = nextDynamic(
  () => import("@/components/authority/sections/aircraft-section").then((m) => m.AircraftSection),
  { loading: () => <WidgetSkeleton title="Airframe Maintenance Logs" /> }
);

export const dynamic = "force-dynamic";

export default async function StaffMaintenancePage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?callbackUrl=/staff/maintenance");
  }

  // Server-side authorization check
  const isAuthorized =
    user.role === "SUPER_ADMIN" ||
    user.role === "ADMIN" ||
    user.role === "AIRPORT_ADMIN" ||
    user.role === "MAINTENANCE_STAFF" ||
    hasPermission(user, "MANAGE_RUNWAYS") ||
    hasPermission(user, "MANAGE_AIRCRAFT");

  if (!isAuthorized) {
    redirect("/unauthorized");
  }

  return (
    <div className="p-6 space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-white tracking-tight">
          Airfield Engineering & Airframe Maintenance
        </h1>
        <p className="text-xs text-slate-400 font-mono">
          Runway surface friction monitoring, ILS calibration, airfield lighting, and aircraft tech logs.
        </p>
      </div>

      <div className="space-y-6">
        <RunwaysSection activeStation={user.airportCode || "HYD"} />
        <div className="pt-6 border-t border-slate-800">
          <AircraftSection />
        </div>
      </div>
    </div>
  );
}
