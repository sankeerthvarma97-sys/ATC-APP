import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { getOperationsSnapshot } from "@/lib/repositories/operations-repository";
import { AuthorityControlCenter } from "@/components/authority/authority-control-center";
import type { UserDTO } from "@/lib/domain";

export const dynamic = "force-dynamic";

function DashboardLoadingFallback() {
  return (
    <main
      className="flex-1 min-h-screen bg-[#070b13] p-6 text-slate-100"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="h-12 w-72 animate-pulse rounded-xl bg-slate-900" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl border border-slate-800 bg-slate-900/60" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-xl border border-slate-800 bg-slate-900/40" />
        <p className="text-sm text-slate-400">Loading live operations data…</p>
      </div>
    </main>
  );
}

async function AdminDashboardData({ user }: { user: UserDTO }) {
  const snapshot = await getOperationsSnapshot(user);

  return (
    <main className="flex-1 flex flex-col min-h-screen">
      <AuthorityControlCenter currentUser={user} initialSnapshot={snapshot} />
    </main>
  );
}

export default async function AdminPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?callbackUrl=/admin");
  }

  const isAuthorized =
    user.role === "SUPER_ADMIN" ||
    user.role === "ADMIN" ||
    user.role === "AIRPORT_ADMIN" ||
    user.role === "OPERATIONS_MANAGER";

  if (!isAuthorized) {
    redirect("/unauthorized");
  }

  // Stream the authenticated shell immediately while the database snapshot loads.
  return (
    <Suspense fallback={<DashboardLoadingFallback />}>
      <AdminDashboardData user={user} />
    </Suspense>
  );
}
