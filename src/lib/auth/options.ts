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
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    redirect({ url, baseUrl }) {
      // 1. Allow relative callback URLs (e.g. /admin, /staff, /passenger)
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      try {
        const candidateUrl = new URL(url);
        const baseOrigin = new URL(baseUrl).origin;

        // 2. Allow same-origin redirects
        if (candidateUrl.origin === baseOrigin) {
          return url;
        }

        // 3. Allow verified canonical deployment origins to prevent host mismatch drops
        const hostname = candidateUrl.hostname.toLowerCase();
        if (
          hostname === "atc-app-one.vercel.app" ||
          hostname === "atc-app.vercel.app" ||
          hostname === "localhost" ||
          hostname === "127.0.0.1" ||
          (process.env.VERCEL_URL && hostname === process.env.VERCEL_URL.toLowerCase())
        ) {
          return url;
        }
      } catch {
        // Fall back on malformed URL
      }

      // Safe default fallback to baseUrl
      return baseUrl;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = (user as typeof user & { role?: string }).role;
        token.shift = (user as typeof user & { shift?: string }).shift;
        token.mustChangePassword = (user as typeof user & { mustChangePassword?: boolean }).mustChangePassword;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as string | undefined) ?? "VIEWER";
        session.user.shift = token.shift as string | undefined;
        session.user.mustChangePassword = Boolean(token.mustChangePassword);
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
