import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { AtcOperationsSection } from "@/components/authority/sections/atc-operations-section";
import { LiveTrafficSection } from "@/components/authority/sections/live-traffic-section";

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

      <div className="space-y-6">
        <AtcOperationsSection />
        <div className="pt-6 border-t border-slate-800">
          <LiveTrafficSection />
        </div>
      </div>
    </div>
  );
}
