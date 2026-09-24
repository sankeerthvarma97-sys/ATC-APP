import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { getCompanyFinanceSummary } from "@/lib/services/company-finance-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    const authCheck = assertPermission(user, "VIEW_FINANCE");
    if (!authCheck.ok) {
      return NextResponse.json({ error: authCheck.message }, { status: authCheck.status });
    }

    const summary = await getCompanyFinanceSummary();
    return NextResponse.json(summary);
  } catch (error) {
    console.error("GET /api/finance/summary error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load company finance summary" },
      { status: 500 }
    );
  }
}
