import { redirect } from "next/navigation";
import { AoccUnifiedView } from "@/components/operations/aocc-unified-view";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { getOperationsSnapshot } from "@/lib/repositories/operations-repository";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  if (params?.view === "unified") {
    const snapshot = await getOperationsSnapshot(user);
    return <AoccUnifiedView user={user} initialSnapshot={snapshot} />;
  }

  // Route according to authoritative role
  if (
    user.role === "SUPER_ADMIN" ||
    user.role === "ADMIN" ||
    user.role === "AIRPORT_ADMIN" ||
    user.role === "OPERATIONS_MANAGER"
  ) {
    redirect("/admin");
  }

  redirect("/staff");
}
