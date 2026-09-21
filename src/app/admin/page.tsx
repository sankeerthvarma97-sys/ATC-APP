import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { getOperationsSnapshot } from "@/lib/repositories/operations-repository";
import { AuthorityControlCenter } from "@/components/authority/authority-control-center";

export const dynamic = "force-dynamic";

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

  const snapshot = await getOperationsSnapshot(user);

  return (
    <main className="flex-1 flex flex-col min-h-screen">
      <AuthorityControlCenter currentUser={user} initialSnapshot={snapshot} />
    </main>
  );
}
