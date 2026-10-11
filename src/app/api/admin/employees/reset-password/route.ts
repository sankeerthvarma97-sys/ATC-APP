import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { adminResetEmployeePassword } from "@/lib/services/account-security-service";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ResetPasswordSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  reason: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    const auth = assertPermission(user, "MANAGE_STAFF");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const body = await request.json();
    const parsed = ResetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await adminResetEmployeePassword({
      employeeId: parsed.data.employeeId,
      actor: {
        id: user?.id,
        name: user?.name,
        role: user?.role,
      },
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      temporaryPassword: result.temporaryPassword,
    });
  } catch (error) {
    console.error("POST /api/admin/employees/reset-password error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reset employee password" },
      { status: 500 }
    );
  }
}
