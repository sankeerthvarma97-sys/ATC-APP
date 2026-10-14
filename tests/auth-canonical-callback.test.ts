import { describe, it, expect } from "vitest";
import { authOptions } from "@/lib/auth/options";
import { validateCredentials } from "@/lib/auth/users";

describe("Auth.js Canonical Callback URL & Redirection Guardrails", () => {
  const redirectCallback = authOptions.callbacks?.redirect;

  it("exports a valid redirect callback in authOptions", () => {
    expect(redirectCallback).toBeDefined();
    expect(typeof redirectCallback).toBe("function");
  });

  it("safely resolves relative callback URLs against baseUrl", async () => {
    if (!redirectCallback) throw new Error("redirect callback missing");

    const baseUrl = "https://atc-app-one.vercel.app";

    const adminResult = await redirectCallback({ url: "/admin", baseUrl });
    expect(adminResult).toBe("https://atc-app-one.vercel.app/admin");

    const staffResult = await redirectCallback({ url: "/staff/atc", baseUrl });
    expect(staffResult).toBe("https://atc-app-one.vercel.app/staff/atc");

    const rootResult = await redirectCallback({ url: "/", baseUrl });
    expect(rootResult).toBe("https://atc-app-one.vercel.app/");
  });

  it("preserves exact same-origin callback URLs", async () => {
    if (!redirectCallback) throw new Error("redirect callback missing");

    const baseUrl = "https://atc-app-one.vercel.app";
    const sameOriginUrl = "https://atc-app-one.vercel.app/passenger?from=HYD&to=DEL";

    const result = await redirectCallback({ url: sameOriginUrl, baseUrl });
    expect(result).toBe(sameOriginUrl);
  });

  it("safely handles canonical Vercel deployment alias origins without host mismatch drops", async () => {
    if (!redirectCallback) throw new Error("redirect callback missing");

    // Scenario: baseUrl is set to primary domain, but user accesses via alias or vice versa
    const baseUrl = "https://atc-app.vercel.app";
    const canonicalOneUrl = "https://atc-app-one.vercel.app/admin";

    const result = await redirectCallback({ url: canonicalOneUrl, baseUrl });
    expect(result).toBe("https://atc-app-one.vercel.app/admin");
  });

  it("strictly rejects untrusted external/phishing URLs and falls back to baseUrl", async () => {
    if (!redirectCallback) throw new Error("redirect callback missing");

    const baseUrl = "https://atc-app-one.vercel.app";
    const phishingUrls = [
      "https://evil-attacker.com/steal-credentials",
      "https://phishing-site.test/login",
      "https://fake-aocc.org/auth",
      "javascript:alert(1)",
    ];

    for (const url of phishingUrls) {
      const result = await redirectCallback({ url, baseUrl });
      expect(result).toBe(baseUrl);
    }
  });

  it("safely handles localhost and 127.0.0.1 in development environments", async () => {
    if (!redirectCallback) throw new Error("redirect callback missing");

    const baseUrl = "http://localhost:3005";
    const localResult = await redirectCallback({ url: "http://localhost:3005/admin", baseUrl });
    expect(localResult).toBe("http://localhost:3005/admin");

    const loopbackResult = await redirectCallback({ url: "http://127.0.0.1:3005/staff", baseUrl });
    expect(loopbackResult).toBe("http://127.0.0.1:3005/staff");
  });
});

describe("Auth Credentials Validation Security Boundary", () => {
  it("rejects invalid input payloads gracefully with null", async () => {
    expect(await validateCredentials(null)).toBeNull();
    expect(await validateCredentials(undefined)).toBeNull();
    expect(await validateCredentials({})).toBeNull();
    expect(await validateCredentials({ email: "invalid-email-format" })).toBeNull();
    expect(await validateCredentials({ email: "unknown@nowhere.test", password: "some-password" })).toBeNull();
  });

  it("enforces email normalization during credential lookup", async () => {
    // Malformed spaces or capitalization should not cause internal error
    const result = await validateCredentials({
      email: "  NONEXISTENT.USER@UNKNOWN.TEST  ",
      password: "incorrect-password",
    });
    expect(result).toBeNull();
  });
});
