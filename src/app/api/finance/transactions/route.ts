import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { listFinancialTransactions } from "@/lib/services/company-finance-service";
import type { FinancialTransactionType, TransactionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    const authCheck = assertPermission(user, "VIEW_TRANSACTIONS");
    if (!authCheck.ok) {
      return NextResponse.json({ error: authCheck.message }, { status: authCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("pageSize") || "20", 10)));
    const accountId = searchParams.get("accountId") || undefined;
    const type = (searchParams.get("type") as FinancialTransactionType) || undefined;
    const status = (searchParams.get("status") as TransactionStatus) || undefined;
    const search = searchParams.get("search") || undefined;

    const result = await listFinancialTransactions({
      page,
      pageSize,
      accountId,
      type,
      status,
      search,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/finance/transactions error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load financial transactions" },
      { status: 500 }
    );
  }
}
