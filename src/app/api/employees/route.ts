import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { createEmployee, listEmployees } from "@/lib/services/staff-service";
import { createEmployeeSchema } from "@/lib/validations/authority";
import type { DepartmentType, EmployeeStatus, Role } from "@/lib/domain";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  const auth = assertPermission(user, "VIEW_DASHBOARD");
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const department = (searchParams.get("department") as DepartmentType) || undefined;
  const role = (searchParams.get("role") as Role) || undefined;
  const status = (searchParams.get("status") as EmployeeStatus) || undefined;
  const search = searchParams.get("q") || undefined;

  const employees = await listEmployees({ department, role, status, search });
  return Response.json({ employees });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  const auth = assertPermission(user, "MANAGE_STAFF");
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const parsed = createEmployeeSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const employee = await createEmployee({
      ...parsed.data,
      actorId: user?.id,
      actorName: user?.name,
    });

    return Response.json({ employee }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to create employee" },
      { status: 500 },
    );
  }
}
