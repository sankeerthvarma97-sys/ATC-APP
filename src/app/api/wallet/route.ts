import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { getUserWallet, topUpUserWallet, setUserWalletMode } from "@/lib/services/wallet-service";

export const dynamic = "force-dynamic";

const TopUpSchema = z.object({
  action: z.enum(["TOP_UP", "SET_MODE"]).optional(),
  mode: z.enum(["NORMAL", "UNLIMITED_SIMULATION"]).optional(),
  amount: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value, ctx) => {
      if (value === undefined || value === null) return undefined;
      const text = String(value).trim();
      if (!/^\d+(\.\d{1,2})?$/.test(text) || Number(text) <= 0) {
        ctx.addIssue({ code: "custom", message: "Top-up amount must be a positive finite decimal" });
        return z.NEVER;
      }
      return text;
    }),
  idempotencyKey: z.string().min(16).max(128).optional(),
});

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const wallet = await getUserWallet(user.id);
    return NextResponse.json(
      { wallet },
      {
        headers: {
          "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
        },
      },
    );
  } catch (error) {
    console.error("GET /api/wallet error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load wallet" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = TopUpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Handle wallet mode change
    if (parsed.data.mode || parsed.data.action === "SET_MODE") {
      const targetMode = parsed.data.mode || "UNLIMITED_SIMULATION";
      const result = await setUserWalletMode(user.id, targetMode);
      return NextResponse.json({
        success: true,
        message: `Wallet mode set to ${targetMode === "UNLIMITED_SIMULATION" ? "Unlimited Simulation" : "Standard"} Mode.`,
        wallet: result,
      });
    }

    if (!parsed.data.amount) {
      return NextResponse.json({ error: "Amount is required for top-up" }, { status: 400 });
    }

    const result = await topUpUserWallet({
      userId: user.id,
      amount: parsed.data.amount,
      idempotencyKey: parsed.data.idempotencyKey,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully added ₹${Number(parsed.data.amount).toLocaleString("en-IN")} simulation money to your wallet.`,
      wallet: result,
    });
  } catch (error) {
    console.error("POST /api/wallet error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Wallet top-up failed" },
      { status: 400 }
    );
  }
}
