import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?callbackUrl=/admin");
  }

  // Enforce server-side role requirement for Admin Portal
  const isAuthorizedAdmin =
    user.role === "SUPER_ADMIN" ||
    user.role === "ADMIN" ||
    user.role === "AIRPORT_ADMIN" ||
    user.role === "OPERATIONS_MANAGER";

  if (!isAuthorizedAdmin) {
    redirect("/unauthorized");
  }

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 flex flex-col antialiased">
      {children}
    </div>
  );
}
