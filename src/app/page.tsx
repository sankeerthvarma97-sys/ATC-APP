import { redirect } from "next/navigation";
import { OperationsConsole } from "@/components/operations/operations-console";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { getOperationsSnapshot } from "@/lib/repositories/operations-repository";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const snapshot = await getOperationsSnapshot(user);
  return <OperationsConsole initialSnapshot={snapshot} />;
}
