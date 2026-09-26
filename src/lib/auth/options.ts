import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma, shouldUseDatabase } from "@/lib/prisma";
import { validateCredentials } from "@/lib/auth/users";
import { getRequiredRuntimeValue } from "@/lib/config/security";

export const authOptions: NextAuthOptions = {
  secret: getRequiredRuntimeValue("NEXTAUTH_SECRET", {
    production: process.env.NODE_ENV === "production",
    fallback: "dev-only-auth-secret",
  }),
  // Pure JWT session strategy without database adapter overhead for instantaneous credentials authentication
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "AOCC demo credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const user = await validateCredentials(credentials);
        if (!user) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          shift: user.shift,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as typeof user & { role?: string }).role;
        token.shift = (user as typeof user & { shift?: string }).shift;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as string | undefined) ?? "VIEWER";
        session.user.shift = token.shift as string | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
