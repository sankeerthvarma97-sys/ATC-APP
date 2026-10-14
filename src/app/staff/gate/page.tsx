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

const BoardingSection = nextDynamic(
  () => import("@/components/authority/sections/boarding-section").then((m) => m.BoardingSection),
  { loading: () => <WidgetSkeleton title="Turnstile Boarding Gate" /> }
);
const CheckinSection = nextDynamic(
  () => import("@/components/authority/sections/checkin-section").then((m) => m.CheckinSection),
  { loading: () => <WidgetSkeleton title="Passenger Check-in Counter" /> }
);

export const dynamic = "force-dynamic";

export default async function StaffGatePage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?callbackUrl=/staff/gate");
  }

  // Server-side authorization check
  const isAuthorized =
    user.role === "SUPER_ADMIN" ||
    user.role === "ADMIN" ||
    user.role === "AIRPORT_ADMIN" ||
    user.role === "GATE_AGENT" ||
    user.role === "TICKETING_AGENT" ||
    hasPermission(user, "BOARD_PASSENGER") ||
    hasPermission(user, "CHECK_IN_PASSENGER");

  if (!isAuthorized) {
    redirect("/unauthorized");
  }

  return (
    <div className="p-6 space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-white tracking-tight">
          Gate Operations, Boarding & Passenger Verification
        </h1>
        <p className="text-xs text-slate-400 font-mono">
          Gate scanners, manifest verification, zone boarding sequence, and check-in desks.
        </p>
      </div>

      <div className="space-y-6">
        <BoardingSection />
        <div className="pt-6 border-t border-slate-800">
          <CheckinSection />
        </div>
      </div>
    </div>
  );
}
