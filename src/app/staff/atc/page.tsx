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

const AtcOperationsSection = nextDynamic(
  () => import("@/components/authority/sections/atc-operations-section").then((m) => m.AtcOperationsSection),
  { loading: () => <WidgetSkeleton title="ATC Radar & Sequencing" /> }
);
const GroundRadarSection = nextDynamic(
  () => import("@/components/authority/sections/ground-radar-section").then((m) => m.GroundRadarSection),
  { loading: () => <WidgetSkeleton title="Ground Surface Radar" /> }
);
const LiveTrafficSection = nextDynamic(
  () => import("@/components/authority/sections/live-traffic-section").then((m) => m.LiveTrafficSection),
  { loading: () => <WidgetSkeleton title="Airspace Traffic Feed" /> }
);
const AiBriefingDrawer = nextDynamic(
  () => import("@/components/ai/ai-briefing-drawer").then((m) => m.AiBriefingDrawer)
);
const AtcRadioSynthesizer = nextDynamic(
  () => import("@/components/audio/atc-radio-synthesizer").then((m) => m.AtcRadioSynthesizer)
);

export const dynamic = "force-dynamic";

export default async function StaffAtcPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?callbackUrl=/staff/atc");
  }

  // Server-side authorization check: user must have CONTROL_ATC permission or ATC role
  const isAuthorized =
    user.role === "SUPER_ADMIN" ||
    user.role === "ADMIN" ||
    user.role === "AIRPORT_ADMIN" ||
    user.role === "ATC" ||
    user.role === "ATC_CONTROLLER" ||
    user.role === "SENIOR_ATC_CONTROLLER" ||
    user.role === "SIMULATOR_OPERATOR" ||
    hasPermission(user, "CONTROL_ATC");

  if (!isAuthorized) {
    redirect("/unauthorized");
  }

  return (
    <div className="p-6 space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          Air Traffic Control Radar & Sequencing
        </h1>
        <p className="text-xs text-slate-400 font-mono">
          Operational aerodrome tower and terminal radar approach control.
        </p>
      </div>

      <AiBriefingDrawer portalName="Air Traffic Control" defaultFocus="airport" />

      <AtcRadioSynthesizer activeCallsign="SC101" />

      <div className="space-y-6">
        <GroundRadarSection />
        <AtcOperationsSection />
        <div className="pt-6 border-t border-slate-800">
          <LiveTrafficSection />
        </div>
      </div>
    </div>
  );
}
