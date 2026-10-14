import { describe, it, expect, beforeEach } from "vitest";
import {
  generateLoveMessage,
  checkLoveMessageRateLimit,
  LoveMessageOccasion,
  LoveMessageLanguage,
} from "../src/lib/services/love-message-service";

describe("AI Love Messages via n8n Subsystem", () => {
  it("should generate romantic message using local fallback engine when n8n is offline", async () => {
    const result = await generateLoveMessage({
      recipientNickname: "Aria",
      occasion: "ROMANTIC",
      tone: "PASSIONATE",
      style: "BALANCED",
      language: "EN",
      senderName: "Leo",
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("Aria");
    expect(result.meta.occasion).toBe("ROMANTIC");
    expect(result.meta.language).toBe("EN");
    expect(result.meta.wordCount).toBeGreaterThan(5);
    expect(result.meta.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.provider).toBe("local-ai-engine");
  });

  it("should support diverse occasions (Apology, Poetry, Good Morning, Anniversary)", async () => {
    const occasions: LoveMessageOccasion[] = [
      "APOLOGY",
      "POETRY",
      "GOOD_MORNING",
      "ANNIVERSARY",
    ];

    for (const occasion of occasions) {
      const res = await generateLoveMessage({
        recipientNickname: "Elena",
        occasion,
        language: "EN",
      });

      expect(res.success).toBe(true);
      expect(res.message.length).toBeGreaterThan(15);
      expect(res.meta.occasion).toBe(occasion);
    }
  });

  it("should support multi-lingual message generation (Spanish, French, Hindi, Telugu)", async () => {
    const languages: LoveMessageLanguage[] = ["ES", "FR", "HI", "TE"];

    for (const language of languages) {
      const res = await generateLoveMessage({
        recipientNickname: "Ananya",
        occasion: "ROMANTIC",
        language,
      });

      expect(res.success).toBe(true);
      expect(res.meta.language).toBe(language);
      expect(res.message.length).toBeGreaterThan(10);
    }
  });

  it("should enforce rate limiting after 10 requests per minute per identifier", () => {
    const testId = `test-user-${Date.now()}`;

    // 10 requests should succeed
    for (let i = 0; i < 10; i++) {
      const check = checkLoveMessageRateLimit(testId);
      expect(check.allowed).toBe(true);
      expect(check.remaining).toBe(10 - (i + 1));
    }

    // 11th request should be blocked by rate limiter
    const blockedCheck = checkLoveMessageRateLimit(testId);
    expect(blockedCheck.allowed).toBe(false);
    expect(blockedCheck.remaining).toBe(0);
  });

  it("should incorporate personal context safely into generated message", async () => {
    const contextNote = "Remember that evening under the stars at Hyderabad airport.";
    const result = await generateLoveMessage({
      recipientNickname: "Zara",
      occasion: "SWEET_CARING",
      context: contextNote,
      language: "EN",
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("Zara");
    expect(result.message.length).toBeGreaterThan(30);
  });
});
