import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { StaffPortalShell } from "@/components/staff/staff-portal-shell";

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

  return <StaffPortalShell user={user}>{children}</StaffPortalShell>;
}
