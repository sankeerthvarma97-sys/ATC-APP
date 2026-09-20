import type { DefaultSession } from "next-auth";
import type { Role } from "@/lib/domain";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role | string;
      shift?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role | string;
    shift?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role | string;
    shift?: string;
  }
}
