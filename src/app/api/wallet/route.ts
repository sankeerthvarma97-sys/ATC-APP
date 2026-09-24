import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { getUserWallet, topUpUserWallet } from "@/lib/services/wallet-service";

export const dynamic = "force-dynamic";

const TopUpSchema = z.object({
  amount: z.number().positive("Top-up amount must be positive"),
});

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const wallet = await getUserWallet(user.id);
    return NextResponse.json({ wallet });
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

    const result = await topUpUserWallet({
      userId: user.id,
      amount: parsed.data.amount,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully added ₹${parsed.data.amount.toLocaleString("en-IN")} simulation money to your wallet.`,
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
