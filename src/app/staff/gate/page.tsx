import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { BoardingSection } from "@/components/authority/sections/boarding-section";
import { CheckinSection } from "@/components/authority/sections/checkin-section";

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
