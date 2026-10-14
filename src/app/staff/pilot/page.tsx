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

const LiveTrafficSection = nextDynamic(
  () => import("@/components/authority/sections/live-traffic-section").then((m) => m.LiveTrafficSection),
  { loading: () => <WidgetSkeleton title="Airspace Traffic Radar" /> }
);
const WeatherSection = nextDynamic(
  () => import("@/components/authority/sections/weather-section").then((m) => m.WeatherSection),
  { loading: () => <WidgetSkeleton title="Aviation Weather Station" /> }
);
const FlightPlanSection = nextDynamic(
  () => import("@/components/authority/sections/flight-plan-section").then((m) => m.FlightPlanSection),
  { loading: () => <WidgetSkeleton title="Flight Plan Route Dispatch" /> }
);
const AiBriefingDrawer = nextDynamic(
  () => import("@/components/ai/ai-briefing-drawer").then((m) => m.AiBriefingDrawer)
);
const AtcRadioSynthesizer = nextDynamic(
  () => import("@/components/audio/atc-radio-synthesizer").then((m) => m.AtcRadioSynthesizer)
);
const FlightDeckCockpit = nextDynamic(
  () => import("@/components/cockpit/flight-deck-cockpit").then((m) => m.FlightDeckCockpit),
  { loading: () => <WidgetSkeleton title="Primary Flight Display (PFD) Avionics" /> }
);

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
