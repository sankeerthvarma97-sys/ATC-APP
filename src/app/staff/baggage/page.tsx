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

const BaggageSection = nextDynamic(
  () => import("@/components/authority/sections/baggage-section").then((m) => m.BaggageSection),
  { loading: () => <WidgetSkeleton title="Baggage Sortation & Tracking" /> }
);

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
        <BaggageSection />
      </div>
    </div>
  );
}
