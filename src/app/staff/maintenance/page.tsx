import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { RunwaysSection } from "@/components/authority/sections/runways-section";
import { AircraftSection } from "@/components/authority/sections/aircraft-section";

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
