import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { GroundOpsSection } from "@/components/authority/sections/ground-ops-section";

export const dynamic = "force-dynamic";

export default async function StaffBaggagePage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?callbackUrl=/staff/baggage");
  }

  // Server-side authorization check
  const isAuthorized =
    user.role === "SUPER_ADMIN" ||
    user.role === "ADMIN" ||
    user.role === "AIRPORT_ADMIN" ||
    user.role === "BAGGAGE_STAFF" ||
    user.role === "GROUND" ||
    user.role === "GROUND_OPERATOR" ||
    hasPermission(user, "MANAGE_BAGGAGE") ||
    hasPermission(user, "MANAGE_GROUND_OPERATIONS");

  if (!isAuthorized) {
    redirect("/unauthorized");
  }

  return (
    <div className="p-6 space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-white tracking-tight">
          Baggage Handling, Sortation & Reconciliation
        </h1>
        <p className="text-xs text-slate-400 font-mono">
          Baggage belt allocation, container scanning, and transit carousel operations.
        </p>
      </div>

      <div className="space-y-6">
        <GroundOpsSection />
      </div>
    </div>
  );
}
