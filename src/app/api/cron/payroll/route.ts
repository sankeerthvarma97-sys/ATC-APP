import { NextResponse } from "next/server";
import { processPayroll, getPayrollCalendar } from "@/lib/services/payroll-service";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handlePayrollCron(request);
}

export async function POST(request: Request) {
  return handlePayrollCron(request);
}

async function handlePayrollCron(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = request.headers.get("x-vercel-cron") === "1";

    let isAuthorized = false;

    // Authorized if matching CRON_SECRET or Vercel cron header
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      isAuthorized = true;
    } else if (isVercelCron) {
      isAuthorized = true;
    } else {
      // Or if an authorized admin is running it
      const user = await getAuthenticatedUser();
      if (
        user?.role === "SUPER_ADMIN" ||
        user?.role === "ADMIN" ||
        user?.role === "AIRPORT_ADMIN"
      ) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized && process.env.NODE_ENV === "production" && cronSecret) {
      return NextResponse.json({ error: "Unauthorized cron request" }, { status: 401 });
    }

    // Determine current payroll period (e.g. PAYROLL-2026-09)
    const now = new Date();
    const currentPeriod = `PAYROLL-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Inspect calendar to see if today is the scheduled payment date or if past due
    const calendar = await getPayrollCalendar();
    const scheduledRun = calendar.find(
      (c) => c.period === currentPeriod || c.status === "SCHEDULED"
    );

    const periodToRun = scheduledRun ? scheduledRun.period : currentPeriod;

    // Run payroll with automatic flag
    const result = await processPayroll({
      payrollPeriod: periodToRun,
      approvedBy: "SYSTEM_AUTOMATIC_CRON",
      forceRun: false,
    });

    return NextResponse.json({
      success: result.success,
      message: result.message,
      payrollId: result.payroll.id,
      period: periodToRun,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron /api/cron/payroll error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Scheduled payroll failed",
      },
      { status: 500 }
    );
  }
}
