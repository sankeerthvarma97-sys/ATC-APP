import { describe, expect, it } from "vitest";
import { validateStartupConfiguration } from "@/lib/config/runtime";

describe("startup config validation", () => {
  it("flags missing runtime configuration in production", () => {
    const result = validateStartupConfiguration({
      NODE_ENV: "production",
      DATABASE_URL: "",
      NEXTAUTH_SECRET: "",
      ADMIN_BOOTSTRAP_EMAIL: "",
      ADMIN_BOOTSTRAP_PASSWORD: "",
    });

    expect(result.ok).toBe(false);
    expect(result.missing).toContain("DATABASE_URL");
    expect(result.missing).toContain("NEXTAUTH_SECRET");
    expect(result.missing).toContain("ADMIN_BOOTSTRAP_PASSWORD");
  });

  it("accepts non-placeholder production values", () => {
    const result = validateStartupConfiguration({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://user:pass@host:5432/app",
      NEXTAUTH_SECRET: "prod-secret-123",
      ADMIN_BOOTSTRAP_EMAIL: "admin@example.com",
      ADMIN_BOOTSTRAP_PASSWORD: "StrongPassword!123",
    });

    expect(result.ok).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("treats placeholder values as missing runtime configuration", () => {
    const result = validateStartupConfiguration({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://user:pass@host:5432/app",
      NEXTAUTH_SECRET: "changeme",
      ADMIN_BOOTSTRAP_EMAIL: "admin@example.com",
      ADMIN_BOOTSTRAP_PASSWORD: "StrongPassword!123",
    });

    expect(result.ok).toBe(false);
    expect(result.missing).toContain("NEXTAUTH_SECRET");
    expect(result.warnings).toContain("NEXTAUTH_SECRET is using a placeholder or insecure fallback value.");
  });
});
