import { describe, expect, it } from "vitest";
import { checkRateLimit, buildRateLimitHeaders } from "../src/lib/security/rate-limiter";
import {
  generateCaptchaChallenge,
  verifyCaptchaSolution,
} from "../src/lib/security/captcha-service";

describe("Enterprise Rate Limiting & CAPTCHA Subsystem", () => {
  describe("Sliding Window Rate Limiter", () => {
    it("allows requests under the threshold and decrements remaining quota", () => {
      const id = `test-ip-${Date.now()}`;
      const res1 = checkRateLimit(id, 5, 60_000);
      expect(res1.allowed).toBe(true);
      expect(res1.remaining).toBe(4);

      const res2 = checkRateLimit(id, 5, 60_000);
      expect(res2.allowed).toBe(true);
      expect(res2.remaining).toBe(3);
    });

    it("blocks requests once the threshold is exceeded and provides Retry-After headers", () => {
      const id = `block-test-${Date.now()}`;
      for (let i = 0; i < 3; i++) {
        checkRateLimit(id, 3, 60_000);
      }

      const blocked = checkRateLimit(id, 3, 60_000);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);

      const headers = buildRateLimitHeaders(blocked) as Record<string, string>;
      expect(headers["X-RateLimit-Limit"]).toBe("3");
      expect(headers["X-RateLimit-Remaining"]).toBe("0");
      expect(headers["Retry-After"]).toBeDefined();
    });
  });

  describe("Cryptographic Anti-Bot CAPTCHA Challenge", () => {
    it("generates a signed challenge with question, token, and expiry", () => {
      const challenge = generateCaptchaChallenge();
      expect(challenge.token).toBeDefined();
      expect(challenge.token.split(".").length).toBe(3);
      expect(challenge.question).toContain("Aviation Security Challenge");
      expect(challenge.expiresAt).toBeGreaterThan(Date.now());
    });

    it("verifies correct math solutions and prevents replay attacks", async () => {
      const challenge = generateCaptchaChallenge();
      const match = challenge.question.match(/What is (\d+) \+ (\d+)\?/);
      expect(match).not.toBeNull();

      const num1 = Number.parseInt(match![1], 10);
      const num2 = Number.parseInt(match![2], 10);
      const correctAnswer = String(num1 + num2);

      // First solution attempt should succeed
      const verification = await verifyCaptchaSolution(challenge.token, correctAnswer);
      expect(verification.success).toBe(true);

      // Replay attempt with the same token must be rejected
      const replay = await verifyCaptchaSolution(challenge.token, correctAnswer);
      expect(replay.success).toBe(false);
      expect(replay.error).toContain("already been redeemed");
    });

    it("rejects incorrect challenge solutions and tampered tokens", async () => {
      const challenge = generateCaptchaChallenge();
      const failVerification = await verifyCaptchaSolution(challenge.token, "9999");
      expect(failVerification.success).toBe(false);
      expect(failVerification.error).toContain("Incorrect challenge answer");

      const tampered = await verifyCaptchaSolution("tampered.token.hmac", "10");
      expect(tampered.success).toBe(false);
    });
  });
});
