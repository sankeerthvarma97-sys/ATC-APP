import { redirect } from "next/navigation";
import { AoccUnifiedView } from "@/components/operations/aocc-unified-view";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { getOperationsSnapshot } from "@/lib/repositories/operations-repository";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const snapshot = await getOperationsSnapshot(user);
  return <AoccUnifiedView user={user} initialSnapshot={snapshot} />;
}
