import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { AirlinesSection } from "@/components/authority/sections/airlines-section";
import { AircraftSection } from "@/components/authority/sections/aircraft-section";
import { FlightsSection } from "@/components/authority/sections/flights-section";

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
