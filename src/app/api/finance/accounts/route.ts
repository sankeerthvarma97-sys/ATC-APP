import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { listFinancialAccounts, executeInternalTransfer } from "@/lib/services/company-finance-service";

export const dynamic = "force-dynamic";

const TransferSchema = z.object({
  sourceAccountId: z.string().min(1, "Source account ID is required"),
  destinationAccountId: z.string().min(1, "Destination account ID is required"),
  amount: z.number().positive("Transfer amount must be positive"),
  reason: z.string().min(3, "Transfer reason must be at least 3 characters"),
});

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    const authCheck = assertPermission(user, "VIEW_ACCOUNTS");
    if (!authCheck.ok) {
      return NextResponse.json({ error: authCheck.message }, { status: authCheck.status });
    }

    const accounts = await listFinancialAccounts();
    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("GET /api/finance/accounts error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load financial accounts" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    const authCheck = assertPermission(user, "MANAGE_ACCOUNTS");
    if (!authCheck.ok) {
      return NextResponse.json({ error: authCheck.message }, { status: authCheck.status });
    }

    const body = await request.json();
    const parsed = TransferSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const transaction = await executeInternalTransfer({
      sourceAccountId: parsed.data.sourceAccountId,
      destinationAccountId: parsed.data.destinationAccountId,
      amount: parsed.data.amount,
      reason: parsed.data.reason,
      actorId: user?.id,
    });

    return NextResponse.json({
      success: true,
      message: "Internal transfer executed successfully",
      transaction,
    });
  } catch (error) {
    console.error("POST /api/finance/accounts error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Transfer failed" },
      { status: 400 }
    );
  }
}
