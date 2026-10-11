import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import {
  getEmployeeSalaryProfile,
  reviseEmployeeSalary,
  applySalaryHike,
  listEmployeeSalaryRoster,
  SALARY_GRADES,
  addEmployeeBonus,
  addEmployeeDeduction,
} from "@/lib/services/payroll-service";
import type { BonusType, DeductionType } from "@prisma/client";
import type { SalaryGradeCode } from "@/lib/domain";

export const dynamic = "force-dynamic";

const ReviseSalarySchema = z.object({
  action: z.enum(["HIKE", "REVISION", "BONUS", "DEDUCTION"]).default("HIKE"),
  employeeId: z.string().min(1, "Employee ID is required"),
  hikeType: z.enum(["PERCENTAGE", "FIXED"]).optional(),
  changeType: z
    .enum(["INITIAL", "PROMOTION", "ANNUAL_HIKE", "PERFORMANCE_HIKE", "MARKET_ADJUSTMENT", "DEMOTION", "CORRECTION"])
    .optional(),
  amount: z.number().positive("Amount must be positive").optional(),
  value: z.number().positive("Value must be positive").optional(),
  percentage: z.number().optional(),
  newGrade: z
    .enum([
      "EXECUTIVE",
      "SENIOR_MANAGEMENT",
      "MANAGEMENT",
      "SENIOR_SPECIALIST",
      "SPECIALIST",
      "SUPERVISOR",
      "EXPERIENCED_STAFF",
      "ENTRY_LEVEL",
      "TRAINEE",
    ])
    .optional(),
  effectiveDate: z.string().optional(),
  reason: z.string().min(3, "Reason must be at least 3 characters"),
  bonusType: z.enum(["PERFORMANCE", "ATTENDANCE", "OPERATIONAL", "SIMULATOR", "EMERGENCY", "MANUAL"]).optional(),
  deductionType: z.enum(["ABSENCE", "PENALTY", "ADVANCE_RECOVERY", "UNIFORM_EQUIPMENT", "OTHER"]).optional(),
  period: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");

    const authCheck = assertPermission(user, "VIEW_EMPLOYEE_ACCOUNTS");
    if (!authCheck.ok) {
      return NextResponse.json({ error: authCheck.message }, { status: authCheck.status });
    }

    if (!employeeId) {
      const roster = await listEmployeeSalaryRoster();
      return NextResponse.json(
        { roster, grades: Object.values(SALARY_GRADES) },
        { headers: { "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate" } }
      );
    }

    const profile = await getEmployeeSalaryProfile(employeeId);
    if (!profile) {
      return NextResponse.json({ error: "Salary profile not found" }, { status: 404 });
    }

    return NextResponse.json(
      { profile, grades: Object.values(SALARY_GRADES) },
      { headers: { "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate" } }
    );
  } catch (error) {
    console.error("GET /api/finance/salary error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load salary data" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    const body = await request.json();
    const parsed = ReviseSalarySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.action === "BONUS") {
      const authCheck = assertPermission(user, "MANAGE_BONUSES");
      if (!authCheck.ok) {
        return NextResponse.json({ error: authCheck.message }, { status: authCheck.status });
      }

      const bonus = await addEmployeeBonus({
        employeeId: parsed.data.employeeId,
        type: (parsed.data.bonusType as BonusType) || "MANUAL",
        amount: parsed.data.amount || 0,
        reason: parsed.data.reason,
        effectivePayrollPeriod: parsed.data.period,
        createdBy: user?.id,
      });

      return NextResponse.json({ success: true, bonus });
    }

    if (parsed.data.action === "DEDUCTION") {
      const authCheck = assertPermission(user, "MANAGE_DEDUCTIONS");
      if (!authCheck.ok) {
        return NextResponse.json({ error: authCheck.message }, { status: authCheck.status });
      }

      const deduction = await addEmployeeDeduction({
        employeeId: parsed.data.employeeId,
        type: (parsed.data.deductionType as DeductionType) || "OTHER",
        amount: parsed.data.amount || 0,
        reason: parsed.data.reason,
        effectivePayrollPeriod: parsed.data.period,
        createdBy: user?.id,
      });

      return NextResponse.json({ success: true, deduction });
    }

    // Regular salary revision / hike
    const authCheck = assertPermission(user, "MANAGE_SALARY_HIKES");
    if (!authCheck.ok) {
      return NextResponse.json({ error: authCheck.message }, { status: authCheck.status });
    }

    if (parsed.data.action === "HIKE") {
      const hikeType = parsed.data.hikeType || (parsed.data.percentage ? "PERCENTAGE" : "FIXED");
      const hikeValue = parsed.data.value || parsed.data.amount || parsed.data.percentage || 0;
      if (hikeValue <= 0) {
        return NextResponse.json({ error: "Hike value must be greater than zero." }, { status: 400 });
      }

      const updated = await applySalaryHike({
        employeeId: parsed.data.employeeId,
        hikeType,
        value: hikeValue,
        reason: parsed.data.reason,
        newGrade: parsed.data.newGrade as SalaryGradeCode | undefined,
        effectiveDate: parsed.data.effectiveDate,
        adminId: user?.id,
        adminName: user?.name,
      });

      return NextResponse.json({ success: true, profile: updated });
    }

    const updated = await reviseEmployeeSalary({
      employeeId: parsed.data.employeeId,
      changeType: parsed.data.changeType || "ANNUAL_HIKE",
      amount: parsed.data.amount || parsed.data.value || 0,
      percentage: parsed.data.percentage,
      reason: parsed.data.reason,
      revisedBy: user?.id,
    });

    return NextResponse.json({ success: true, profile: updated });
  } catch (error) {
    console.error("POST /api/finance/salary error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update salary" },
      { status: 400 }
    );
  }
}
