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

const GroundOpsSection = nextDynamic(
  () => import("@/components/authority/sections/ground-ops-section").then((m) => m.GroundOpsSection),
  { loading: () => <WidgetSkeleton title="Ground Handling & Turnaround" /> }
);
const GatesSection = nextDynamic(
  () => import("@/components/authority/sections/gates-section").then((m) => m.GatesSection),
  { loading: () => <WidgetSkeleton title="Gate & Stand Management" /> }
);

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
