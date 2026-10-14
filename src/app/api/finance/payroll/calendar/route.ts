import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { getPayrollCalendar } from "@/lib/services/payroll-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    const authCheck = assertPermission(user, "VIEW_FINANCE");
    if (!authCheck.ok) {
      return NextResponse.json({ error: authCheck.message }, { status: authCheck.status });
    }

    const calendar = await getPayrollCalendar();
    return NextResponse.json({ calendar });
  } catch (error) {
    console.error("GET /api/finance/payroll/calendar error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load payroll calendar" },
      { status: 500 }
    );
  }
}
