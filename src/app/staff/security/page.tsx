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

const VerificationSection = nextDynamic(
  () => import("@/components/authority/sections/verification-section").then((m) => m.VerificationSection),
  { loading: () => <WidgetSkeleton title="Security Screening & Verification" /> }
);
const EmergenciesSection = nextDynamic(
  () => import("@/components/authority/sections/emergencies-section").then((m) => m.EmergenciesSection),
  { loading: () => <WidgetSkeleton title="Emergency Response Incident Center" /> }
);

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
