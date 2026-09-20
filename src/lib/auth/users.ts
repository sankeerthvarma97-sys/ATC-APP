import { compare } from "bcryptjs";
import type { UserDTO } from "@/lib/domain";
import { demoUsers } from "@/lib/data/mock";
import { prisma, shouldUseDatabase } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/operations";

export async function validateCredentials(input: unknown): Promise<UserDTO | null> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return null;
  }

  const { email, password } = parsed.data;

  if (shouldUseDatabase()) {
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user?.passwordHash && (await compare(password, user.passwordHash))) {
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as UserDTO["role"],
          shift: user.shift ?? undefined,
        };
      }
    } catch (error) {
      console.warn("Database credential check failed; using demo users.", error);
    }
  }

  const demoUser = demoUsers.find((user) => user.email === email && user.password === password);
  if (!demoUser) {
    return null;
  }

  return {
    id: demoUser.id,
    name: demoUser.name,
    email: demoUser.email,
    role: demoUser.role,
    shift: demoUser.shift,
  };
}
