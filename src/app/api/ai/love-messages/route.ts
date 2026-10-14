import { z } from "zod";
import { getAuthenticatedUser, getCurrentUserOrDemo } from "@/lib/auth/session";
import {
  generateLoveMessage,
  checkLoveMessageRateLimit,
  LoveMessageOccasion,
  LoveMessageTone,
  LoveMessageStyle,
  LoveMessageLanguage,
} from "@/lib/services/love-message-service";

export const dynamic = "force-dynamic";

const loveMessageRequestSchema = z.object({
  recipientNickname: z.string().max(60).optional(),
  occasion: z.enum([
    "ROMANTIC",
    "SWEET_CARING",
    "PLAYFUL",
    "HEARTFELT",
    "APOLOGY",
    "GOOD_MORNING",
    "GOOD_NIGHT",
    "ANNIVERSARY",
    "BIRTHDAY",
    "GRATITUDE",
    "LONG_LETTER",
    "POETRY",
    "RECONCILIATION",
  ] as const),
  tone: z
    .enum([
      "PASSIONATE",
      "GENTLE",
      "PLAYFUL",
      "POETIC",
      "ELEGANT",
      "WITTY",
      "WARM",
    ] as const)
    .optional(),
  style: z
    .enum(["SHORT", "BALANCED", "LONG_LETTER", "POETRY"] as const)
    .optional(),
  language: z
    .enum(["EN", "ES", "FR", "DE", "HI", "TE", "JA", "IT"] as const)
    .optional(),
  context: z.string().max(400).optional(),
  senderName: z.string().max(60).optional(),
});

export async function POST(request: Request) {
  try {
    // 1. Identify actor (authenticated user or client IP fallback)
    const user = (await getAuthenticatedUser()) || (await getCurrentUserOrDemo());
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "anonymous-client";
    const rateLimitIdentifier = user?.id ? `user:${user.id}` : `ip:${clientIp}`;

    // 2. Check rate limit (10 requests per minute)
    const rateLimit = checkLoveMessageRateLimit(rateLimitIdentifier);
    if (!rateLimit.allowed) {
      return Response.json(
        {
          error: "Rate limit exceeded. Please wait a minute before generating new messages.",
          remaining: rateLimit.remaining,
        },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
          },
        },
      );
    }

    // 3. Parse and validate JSON payload
    const body = await request.json().catch(() => null);
    const parsed = loveMessageRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        {
          error: "Invalid love message generation request.",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    // 4. Generate message via n8n with local AI engine fallback
    const result = await generateLoveMessage({
      recipientNickname: parsed.data.recipientNickname,
      occasion: parsed.data.occasion as LoveMessageOccasion,
      tone: parsed.data.tone as LoveMessageTone | undefined,
      style: parsed.data.style as LoveMessageStyle | undefined,
      language: parsed.data.language as LoveMessageLanguage | undefined,
      context: parsed.data.context,
      senderName: parsed.data.senderName || user?.name || undefined,
    });

    return Response.json(result, {
      status: 200,
      headers: {
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      },
    });
  } catch (error) {
    console.error("AI Love Messages Route Error:", error);
    return Response.json(
      { error: "An unexpected error occurred while generating the message." },
      { status: 500 },
    );
  }
}
