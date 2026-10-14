import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { AoccPortalShell } from "@/components/shell/aocc-portal-shell";

export const dynamic = "force-dynamic";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?callbackUrl=/staff");
  }

  return <AoccPortalShell user={user}>{children}</AoccPortalShell>;
}
