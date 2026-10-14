import crypto from "node:crypto";

/**
 * Server-Side Cryptographic CAPTCHA & Anti-Bot Challenge Subsystem
 * Protects public login and ticket lookup forms against credential stuffing and automated scraping.
 */

const CAPTCHA_SECRET =
  process.env.CAPTCHA_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "aocc-enterprise-security-anti-bot-key-2026";

const CHALLENGE_EXPIRY_MS = 300_000; // 5 minutes validity
const usedNonces = new Set<string>();

// Cleanup stale nonces every 10 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    usedNonces.clear();
  }, 600_000).unref?.();
}

export interface CaptchaChallenge {
  token: string;
  question: string;
  expiresAt: number;
}

export interface CaptchaVerificationResult {
  success: boolean;
  error?: string;
}

/**
 * Generates a signed cryptographic anti-bot challenge for public forms.
 */
export function generateCaptchaChallenge(): CaptchaChallenge {
  const nonce = crypto.randomBytes(8).toString("hex");
  const num1 = Math.floor(Math.random() * 20) + 5;
  const num2 = Math.floor(Math.random() * 15) + 3;
  const answer = String(num1 + num2);
  const expiresAt = Date.now() + CHALLENGE_EXPIRY_MS;

  const payload = `${nonce}:${expiresAt}:${answer}`;
  const hmac = crypto.createHmac("sha256", CAPTCHA_SECRET).update(payload).digest("hex");
  const token = `${nonce}.${expiresAt}.${hmac}`;

  return {
    token,
    question: `Aviation Security Challenge: What is ${num1} + ${num2}?`,
    expiresAt,
  };
}

/**
 * Verifies a client's solution to an anti-bot challenge or Cloudflare Turnstile token.
 */
export async function verifyCaptchaSolution(
  token: string,
  userAnswer: string,
): Promise<CaptchaVerificationResult> {
  if (!token || !userAnswer) {
    return { success: false, error: "Missing anti-bot challenge parameters." };
  }

  // 1. If Cloudflare Turnstile is configured in production, verify via remote endpoint
  if (process.env.TURNSTILE_SECRET_KEY && token.startsWith("0.")) {
    try {
      const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: token,
        }),
      });

      const outcome = await res.json();
      if (outcome.success) {
        return { success: true };
      }
      return { success: false, error: "Cloudflare Turnstile verification failed." };
    } catch {
      return { success: false, error: "Turnstile verification service unreachable." };
    }
  }

  // 2. Cryptographic Proof-of-Work / Challenge Verification
  const parts = token.split(".");
  if (parts.length !== 3) {
    return { success: false, error: "Malformed anti-bot token." };
  }

  const [nonce, expiresAtStr, receivedHmac] = parts;
  const expiresAt = Number.parseInt(expiresAtStr, 10);

  // Check expiration
  if (Number.isNaN(expiresAt) || Date.now() > expiresAt) {
    return { success: false, error: "Anti-bot challenge has expired. Please refresh." };
  }

  // Prevent replay attacks
  if (usedNonces.has(nonce)) {
    return { success: false, error: "Challenge token has already been redeemed." };
  }

  // Verify HMAC signature
  const cleanAnswer = userAnswer.trim();
  const payload = `${nonce}:${expiresAt}:${cleanAnswer}`;
  const expectedHmac = crypto.createHmac("sha256", CAPTCHA_SECRET).update(payload).digest("hex");

  try {
    const receivedBuf = Buffer.from(receivedHmac, "hex");
    const expectedBuf = Buffer.from(expectedHmac, "hex");

    if (receivedBuf.length !== expectedBuf.length) {
      return { success: false, error: "Incorrect challenge answer." };
    }

    const isValid = crypto.timingSafeEqual(receivedBuf, expectedBuf);
    if (!isValid) {
      return { success: false, error: "Incorrect challenge answer." };
    }

    // Mark nonce as redeemed
    usedNonces.add(nonce);
    return { success: true };
  } catch {
    return { success: false, error: "Anti-bot cryptographic verification failed." };
  }
}
