import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { VerificationSection } from "@/components/authority/sections/verification-section";
import { EmergenciesSection } from "@/components/authority/sections/emergencies-section";

export const dynamic = "force-dynamic";

export default async function StaffSecurityPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?callbackUrl=/staff/security");
  }

  // Server-side authorization check
  const isAuthorized =
    user.role === "SUPER_ADMIN" ||
    user.role === "ADMIN" ||
    user.role === "AIRPORT_ADMIN" ||
    user.role === "SECURITY_OFFICER" ||
    hasPermission(user, "VERIFY_TICKET") ||
    hasPermission(user, "MANAGE_EMERGENCIES");

  if (!isAuthorized) {
    redirect("/unauthorized");
  }

  return (
    <div className="p-6 space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-white tracking-tight">
          Airside Security, Credential Screening & Crisis Response
        </h1>
        <p className="text-xs text-slate-400 font-mono">
          Security checkpoint verification, fraud detection, and emergency incident coordination.
        </p>
      </div>

      <div className="space-y-6">
        <VerificationSection />
        <div className="pt-6 border-t border-slate-800">
          <EmergenciesSection />
        </div>
      </div>
    </div>
  );
}
