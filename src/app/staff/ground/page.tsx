import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { GroundOpsSection } from "@/components/authority/sections/ground-ops-section";
import { GatesSection } from "@/components/authority/sections/gates-section";

export const dynamic = "force-dynamic";

export default async function StaffGroundPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?callbackUrl=/staff/ground");
  }

  // Server-side authorization check
  const isAuthorized =
    user.role === "SUPER_ADMIN" ||
    user.role === "ADMIN" ||
    user.role === "AIRPORT_ADMIN" ||
    user.role === "GROUND" ||
    user.role === "GROUND_OPERATOR" ||
    user.role === "OPERATIONS_MANAGER" ||
    hasPermission(user, "MANAGE_GROUND_OPERATIONS");

  if (!isAuthorized) {
    redirect("/unauthorized");
  }

  return (
    <div className="p-6 space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-white tracking-tight">
          Ground Handling, Ramp Servicing & Apron Control
        </h1>
        <p className="text-xs text-slate-400 font-mono">
          Gate assignments, tug dispatches, turnaround services, and stand management.
        </p>
      </div>

      <div className="space-y-6">
        <GroundOpsSection />
        <div className="pt-6 border-t border-slate-800">
          <GatesSection />
        </div>
      </div>
    </div>
  );
}
