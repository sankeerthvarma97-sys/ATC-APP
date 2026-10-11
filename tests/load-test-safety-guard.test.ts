import { describe, it, expect } from "vitest";
import { validateTestTarget, SAFETY_LIMITS } from "../scripts/load-test-safety-guard.mjs";

describe("Load-Test Target Fail-Closed Safety Guardrails", () => {
  it("exports documented safety limits", () => {
    expect(SAFETY_LIMITS).toBeDefined();
    expect(SAFETY_LIMITS.MAX_VIRTUAL_USERS).toBe(10000);
    expect(SAFETY_LIMITS.MAX_CONCURRENCY).toBeGreaterThanOrEqual(10);
    expect(SAFETY_LIMITS.MAX_TIMEOUT_MS).toBeGreaterThanOrEqual(10000);
  });

  it("strictly rejects known production domains (vercel.app, atc-app-one, etc.)", () => {
    const productionUrls = [
      "https://atc-app-one.vercel.app",
      "https://atc-app.vercel.app",
      "https://preview-deploy.vercel.app",
      "https://aocc-aviation.onrender.com",
      "https://production.internal.aocc",
      "http://prod.aocc.test",
    ];

    for (const url of productionUrls) {
      expect(() => validateTestTarget(url, { throwOnError: true })).toThrow(/PRODUCTION/i);
    }
  });

  it("fails closed on unapproved arbitrary internet hosts", () => {
    const unapprovedUrls = [
      "https://example.com",
      "https://google.com",
      "https://aws.amazon.com",
      "http://192.168.1.100:8080",
      "https://random-server.org",
    ];

    for (const url of unapprovedUrls) {
      expect(() => validateTestTarget(url, { throwOnError: true })).toThrow(/not an approved/i);
    }
  });

  it("fails closed on empty, null, or malformed URLs", () => {
    expect(() => validateTestTarget("", { throwOnError: true })).toThrow(/non-empty/i);
    expect(() => validateTestTarget("not-a-valid-url", { throwOnError: true })).toThrow(/Invalid target URL/i);
  });

  it("accepts explicitly approved local and loopback test environments", () => {
    const approvedUrls = [
      "http://localhost:3000",
      "http://localhost:3005",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3005",
      "http://0.0.0.0:3000",
      "http://[::1]:3000",
    ];

    for (const url of approvedUrls) {
      const parsed = validateTestTarget(url, { throwOnError: true });
      expect(parsed).toBeInstanceOf(URL);
      expect(parsed.origin).toContain(new URL(url).hostname);
    }
  });
});
