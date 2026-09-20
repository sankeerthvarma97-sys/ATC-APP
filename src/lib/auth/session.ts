import { getServerSession } from "next-auth";
import type { UserDTO } from "@/lib/domain";
import { authOptions } from "@/lib/auth/options";
import { getDemoUser } from "@/lib/data/store";

export async function getCurrentUserOrDemo(): Promise<UserDTO> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return getDemoUser("ATC");
  }

  return {
    id: session.user.id,
    name: session.user.name ?? "AOCC Operator",
    email: session.user.email,
    role: (session.user.role as UserDTO["role"]) ?? "VIEWER",
    shift: session.user.shift,
  };
}

export async function getAuthenticatedUser(): Promise<UserDTO | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return null;
  }

  return {
    id: session.user.id,
    name: session.user.name ?? "AOCC Operator",
    email: session.user.email,
    role: (session.user.role as UserDTO["role"]) ?? "VIEWER",
    shift: session.user.shift,
  };
}
