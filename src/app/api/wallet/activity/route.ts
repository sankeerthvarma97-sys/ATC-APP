import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { getAdminWalletActivity, adjustUserWallet } from "@/lib/services/wallet-service";

export const dynamic = "force-dynamic";

const AdjustmentSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  direction: z.enum(["CREDIT", "DEBIT"]),
  amount: z.union([z.string(), z.number()]).transform((value, ctx) => {
    const text = String(value).trim();
    if (!/^\d+(\.\d{1,2})?$/.test(text) || Number(text) <= 0) {
      ctx.addIssue({ code: "custom", message: "Amount must be a positive finite decimal" });
      return z.NEVER;
    }
    return text;
  }),
  reason: z.string().min(3, "Reason must be at least 3 characters"),
  reference: z.string().max(120).optional(),
  idempotencyKey: z.string().min(16).max(128).optional(),
});

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    const authCheck = assertPermission(user, "VIEW_FINANCE");
    if (!authCheck.ok) {
      return NextResponse.json({ error: authCheck.message }, { status: authCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("pageSize") || "20", 10)));
    const search = searchParams.get("search") || undefined;

    const activity = await getAdminWalletActivity({ page, pageSize, search });
    return NextResponse.json(activity, {
      headers: {
        "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    console.error("GET /api/wallet/activity error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load wallet activity" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    const authCheck = assertPermission(user, "MANAGE_CREDITS");
    if (!authCheck.ok) {
      return NextResponse.json({ error: authCheck.message }, { status: authCheck.status });
    }

    const body = await request.json();
    const parsed = AdjustmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await adjustUserWallet({
      userId: parsed.data.userId,
      direction: parsed.data.direction,
      amount: parsed.data.amount,
      reason: parsed.data.reason,
      adminId: user?.id || "ADMIN",
      reference: parsed.data.reference,
      idempotencyKey: parsed.data.idempotencyKey,
    });

    return NextResponse.json({
      success: true,
      message: `Adjusted user wallet by ${parsed.data.direction === "CREDIT" ? "+" : "-"}₹${Number(parsed.data.amount).toLocaleString("en-IN")}`,
      adjustment: result,
    });
  } catch (error) {
    console.error("POST /api/wallet/activity error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Adjustment failed" },
      { status: 400 }
    );
  }
}
