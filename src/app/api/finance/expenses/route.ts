import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { listCompanyExpenses, recordCompanyExpense } from "@/lib/services/company-finance-service";
import type { ExpenseCategory } from "@prisma/client";

export const dynamic = "force-dynamic";

const CreateExpenseSchema = z.object({
  category: z.enum([
    "PAYROLL",
    "MAINTENANCE",
    "FUEL_SIMULATION",
    "GROUND_OPERATIONS",
    "AIRPORT_OPERATIONS",
    "SECURITY",
    "EQUIPMENT",
    "UTILITIES",
    "MARKETING",
    "EMERGENCY_OPERATIONS",
    "OTHER",
  ]),
  amount: z.number().positive("Amount must be positive"),
  description: z.string().min(3, "Description must be at least 3 characters"),
  reference: z.string().optional(),
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
    const category = (searchParams.get("category") as ExpenseCategory) || undefined;
    const status = searchParams.get("status") || undefined;

    const result = await listCompanyExpenses({
      page,
      pageSize,
      category,
      status,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/finance/expenses error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load company expenses" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    const authCheck = assertPermission(user, "MANAGE_EXPENSES");
    if (!authCheck.ok) {
      return NextResponse.json({ error: authCheck.message }, { status: authCheck.status });
    }

    const body = await request.json();
    const parsed = CreateExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const expense = await recordCompanyExpense({
      category: parsed.data.category,
      amount: parsed.data.amount,
      description: parsed.data.description,
      reference: parsed.data.reference,
      actorId: user?.id,
    });

    return NextResponse.json({
      success: true,
      message: "Company expense recorded successfully",
      expense,
    });
  } catch (error) {
    console.error("POST /api/finance/expenses error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to record expense" },
      { status: 400 }
    );
  }
}
