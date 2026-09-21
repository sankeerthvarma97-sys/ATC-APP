import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { LiveTrafficSection } from "@/components/authority/sections/live-traffic-section";
import { WeatherSection } from "@/components/authority/sections/weather-section";
import { FlightPlanSection } from "@/components/authority/sections/flight-plan-section";
import { AiBriefingDrawer } from "@/components/ai/ai-briefing-drawer";
import { AtcRadioSynthesizer } from "@/components/audio/atc-radio-synthesizer";
import { FlightDeckCockpit } from "@/components/cockpit/flight-deck-cockpit";

export const dynamic = "force-dynamic";

export default async function StaffPilotPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?callbackUrl=/staff/pilot");
  }

  // Server-side authorization check
  const isAuthorized =
    user.role === "SUPER_ADMIN" ||
    user.role === "ADMIN" ||
    user.role === "AIRPORT_ADMIN" ||
    user.role === "PILOT" ||
    user.role === "FLIGHT_DISPATCHER" ||
    hasPermission(user, "VIEW_AIRCRAFT_POSITION") ||
    hasPermission(user, "VIEW_TRAFFIC");

  if (!isAuthorized) {
    redirect("/unauthorized");
  }

  return (
    <div className="p-6 space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-white tracking-tight">
          Flight Deck & Cockpit Operations
        </h1>
        <p className="text-xs text-slate-400 font-mono">
          Waypoint navigation, terminal airspace traffic, and aviation weather METAR reports.
        </p>
      </div>

      <AiBriefingDrawer portalName="Flight Deck & Dispatch" defaultFocus="emergencies" />

      <FlightDeckCockpit />

      <AtcRadioSynthesizer activeCallsign="SC101" />

      <div className="space-y-6">
        <FlightPlanSection />
        <div className="pt-6 border-t border-slate-800">
          <LiveTrafficSection />
        </div>
        <div className="pt-6 border-t border-slate-800">
          <WeatherSection />
        </div>
      </div>
    </div>
  );
}
