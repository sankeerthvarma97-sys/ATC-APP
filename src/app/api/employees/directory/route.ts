import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import {
  getEmployeeDirectory,
  provisionEmployeeAccount,
} from "@/server/employees/employee-data";
import {
  adminResetEmployeePassword,
  toggleEmployeeAccountStatus,
} from "@/lib/services/account-security-service";
import { updateEmployee } from "@/lib/services/staff-service";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ProvisionEmployeeSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Valid work email is required"),
  phone: z.string().optional().default("+91 90000 00000"),
  department: z.string().min(1, "Department is required"),
  jobTitle: z.string().min(2, "Job title is required"),
  role: z.string().min(1, "Role is required"),
  assignedAirport: z.string().optional().default("HYD"),
  terminal: z.string().optional(),
  gateArea: z.string().optional(),
  shift: z.string().optional().default("MORNING"),
  initialPassword: z.string().min(6).optional(),
});

const PatchEmployeeSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  action: z.enum(["RESET_PASSWORD", "TOGGLE_STATUS", "UPDATE_PROFILE"]),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  profile: z
    .object({
      fullName: z.string().optional(),
      phone: z.string().optional(),
      jobTitle: z.string().optional(),
      department: z.string().optional(),
      role: z.string().optional(),
      assignedAirport: z.string().optional(),
      terminal: z.string().optional(),
      gateArea: z.string().optional(),
      shift: z.string().optional(),
    })
    .optional(),
});

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    const auth = assertPermission(user, "VIEW_EMPLOYEE_ACCOUNTS");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const department = searchParams.get("department") || undefined;
    const role = searchParams.get("role") || undefined;
    const status = searchParams.get("status") || undefined;
    const accountStatus = searchParams.get("accountStatus") || undefined;
    const airportCode = searchParams.get("airport") || undefined;
    const shift = searchParams.get("shift") || undefined;
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 20;

    const result = await getEmployeeDirectory({
      search,
      department,
      role,
      status,
      accountStatus,
      airportCode,
      shift,
      page,
      limit,
      viewerRole: user?.role,
      viewerId: user?.id,
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate" },
    });
  } catch (error) {
    console.error("GET /api/employees/directory error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load employee directory" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    const auth = assertPermission(user, "MANAGE_STAFF");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const body = await request.json();
    const parsed = ProvisionEmployeeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await provisionEmployeeAccount({
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      department: parsed.data.department as any,
      jobTitle: parsed.data.jobTitle,
      role: parsed.data.role as any,
      assignedAirport: parsed.data.assignedAirport,
      terminal: parsed.data.terminal,
      gateArea: parsed.data.gateArea,
      shift: parsed.data.shift,
      initialPassword: parsed.data.initialPassword,
      actor: { id: user?.id, name: user?.name },
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: true,
        message: result.message,
        record: result.record,
        temporaryPassword: result.temporaryPassword,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/employees/directory error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to provision employee" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    const auth = assertPermission(user, "MANAGE_STAFF");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const body = await request.json();
    const parsed = PatchEmployeeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { employeeId, action } = parsed.data;

    if (action === "RESET_PASSWORD") {
      const result = await adminResetEmployeePassword({
        employeeId,
        actor: { id: user?.id, name: user?.name, role: user?.role },
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.message }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        message: result.message,
        temporaryPassword: result.temporaryPassword,
      });
    }

    if (action === "TOGGLE_STATUS") {
      const nextStatus = parsed.data.status || "ACTIVE";
      const result = await toggleEmployeeAccountStatus({
        employeeId,
        status: nextStatus,
        actor: { id: user?.id, name: user?.name },
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.message }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        message: result.message,
        newStatus: result.newStatus,
      });
    }

    if (action === "UPDATE_PROFILE" && parsed.data.profile) {
      const p = parsed.data.profile;
      const updated = await updateEmployee(employeeId, {
        fullName: p.fullName,
        phone: p.phone,
        jobTitle: p.jobTitle,
        department: p.department as any,
        role: p.role as any,
        airportCode: p.assignedAirport,
        terminal: p.terminal,
        gateArea: p.gateArea,
        shift: p.shift,
        actorId: user?.id,
        actorName: user?.name,
      });
      if (!updated) {
        return NextResponse.json({ error: "Employee not found or update rejected" }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        message: `Employee profile updated successfully for ${updated.fullName} (${updated.employeeId}).`,
      });
    }

    return NextResponse.json({ error: "Invalid action specified." }, { status: 400 });
  } catch (error) {
    console.error("PATCH /api/employees/directory error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update employee account" },
      { status: 500 }
    );
  }
}
