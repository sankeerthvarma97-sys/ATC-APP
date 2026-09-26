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
    expect(isOriginAllowed("http://localhost:3000", ["http://localhost:3000"])) .toBe(true);
  });
});
