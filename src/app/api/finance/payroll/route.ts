import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import {
  listPayrollRuns,
  previewPayroll,
  processPayroll,
  getPayrollRunDetails,
} from "@/lib/services/payroll-service";
import type { PayrollFrequency } from "@prisma/client";

export const dynamic = "force-dynamic";

const ProcessPayrollSchema = z.object({
  period: z.string().min(4, "Period format required (e.g. PAYROLL-2026-09)"),
  frequency: z.enum(["MONTHLY", "WEEKLY", "BIWEEKLY", "DAILY", "CUSTOM"]).default("MONTHLY"),
  approveImmediately: z.boolean().default(true),
});

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    const authCheck = assertPermission(user, "VIEW_FINANCE");
    if (!authCheck.ok) {
      return NextResponse.json({ error: authCheck.message }, { status: authCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const preview = searchParams.get("preview") === "true";
    const period = searchParams.get("period");
    const frequency = (searchParams.get("frequency") as PayrollFrequency) || "MONTHLY";

    if (id) {
      const details = await getPayrollRunDetails(id);
      if (!details) {
        return NextResponse.json({ error: "Payroll run not found" }, { status: 404 });
      }
      return NextResponse.json({ payroll: details });
    }

    if (preview) {
      const payrollPeriod = period || `PAYROLL-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
      const previewData = await previewPayroll(payrollPeriod);
      return NextResponse.json({ preview: previewData });
    }

    const runs = await listPayrollRuns();
    return NextResponse.json({ runs });
  } catch (error) {
    console.error("GET /api/finance/payroll error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load payroll data" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    const authCheck = assertPermission(user, "PROCESS_PAYROLL");
    if (!authCheck.ok) {
      return NextResponse.json({ error: authCheck.message }, { status: authCheck.status });
    }

    const body = await request.json();
    const parsed = ProcessPayrollSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await processPayroll({
      payrollPeriod: parsed.data.period,
      approvedBy: user?.id,
      forceRun: true,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.message, payrollId: result.payroll?.id },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      payrollId: result.payroll.id,
    });
  } catch (error) {
    console.error("POST /api/finance/payroll error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Payroll processing failed" },
      { status: 500 }
    );
  }
}
