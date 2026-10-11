import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { EmployeeDirectoryClient } from "./employee-directory-client";

export const dynamic = "force-dynamic";

export default async function EmployeeDirectoryPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?callbackUrl=/admin/employees/directory");
  }

  const isAuthorized =
    user.role === "SUPER_ADMIN" ||
    user.role === "ADMIN" ||
    user.role === "AIRPORT_ADMIN" ||
    user.role === "OPERATIONS_MANAGER";

  if (!isAuthorized) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex-1 min-h-screen bg-[#070b12] text-slate-100 p-6">
      <EmployeeDirectoryClient currentUser={user} />
    </div>
  );
}
