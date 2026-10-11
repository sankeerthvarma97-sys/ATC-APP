import { NextResponse } from "next/server";
import { executeScheduledPayrollRun, getSchedulerStatus } from "@/lib/services/payroll-scheduler";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("status") === "true") {
    const status = await getSchedulerStatus();
    return NextResponse.json({ status });
  }
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

    const result = await executeScheduledPayrollRun();

    return NextResponse.json({
      success: result.success,
      message: result.message,
      payrollId: result.payrollId,
      period: result.period,
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
