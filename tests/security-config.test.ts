import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  buildAllowedOrigins,
  getRequiredRuntimeValue,
  isOriginAllowed,
} from "@/lib/config/security";

describe("production security configuration", () => {
  it("requires explicit runtime secrets in production", () => {
    expect(() =>
      getRequiredRuntimeValue("NEXTAUTH_SECRET", {
        env: {},
        production: true,
        fallback: "fallback-secret",
      }),
    ).toThrow(/NEXTAUTH_SECRET/);
  });

  it("rejects wildcard origins when no explicit allowlist is configured", () => {
    expect(buildAllowedOrigins({ env: {}, production: true })).toEqual([]);
    expect(isOriginAllowed("https://example.com", [])).toBe(false);
    expect(isOriginAllowed("http://localhost:3000", ["http://localhost:3000"])).toBe(true);
  });
});

describe("load and performance script target safety", () => {
  it.each([
    {
      script: "scripts/load-test-1000.mjs",
      variable: "AOCC_BASE_URL",
    },
    {
      script: "scripts/performance-audit.mjs",
      variable: "BASE_URL",
    },
  ])("refuses the known production host in $script", ({ script, variable }) => {
    let output = "";
    try {
      execFileSync("node", [script], {
        encoding: "utf8",
        env: {
          ...process.env,
          [variable]: "https://atc-app-one.vercel.app",
          AOCC_ALLOW_REMOTE_TEST_TARGET: "true",
          AOCC_ALLOWED_TEST_HOSTS: "atc-app-one.vercel.app",
        },
        timeout: 5000,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error: unknown) {
      if (error && typeof error === "object") {
        const processError = error as { stdout?: unknown; stderr?: unknown };
        output = [
          String(processError.stdout ?? ""),
          String(processError.stderr ?? ""),
        ].join("\\n");
      }
    }

    expect(output).toMatch(/Refusing to (load-test|benchmark) known production host/);
  });
});
