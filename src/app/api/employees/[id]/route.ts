import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { deleteEmployee, resetEmployeeAccess, updateEmployee } from "@/lib/services/staff-service";
import { updateEmployeeSchema } from "@/lib/validations/authority";
import { PROTECTED_ERROR_MESSAGE } from "@/lib/auth/protection";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  const auth = assertPermission(user, "MANAGE_STAFF");
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const parsed = updateEmployeeSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const updated = await updateEmployee(id, {
      ...parsed.data,
      actorId: user?.id,
      actorName: user?.name,
    });

    if (!updated) {
      return Response.json({ error: "Employee not found" }, { status: 404 });
    }

    return Response.json({ employee: updated });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to update employee";
    const status = msg.includes(PROTECTED_ERROR_MESSAGE) ? 403 : 500;
    return Response.json({ error: msg }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  const auth = assertPermission(user, "MANAGE_STAFF");
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status });
  }

  const result = await deleteEmployee(id, { id: user?.id, name: user?.name });
  if (!result.ok) {
    const status = result.error?.includes(PROTECTED_ERROR_MESSAGE) ? 403 : 400;
    return Response.json({ error: result.error }, { status });
  }

  return Response.json({ success: true });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  const auth = assertPermission(user, "MANAGE_STAFF");
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    if (body.action === "reset-access") {
      const res = await resetEmployeeAccess(id, { id: user?.id, name: user?.name });
      if (!res.ok) {
        const status = res.error?.includes(PROTECTED_ERROR_MESSAGE) ? 403 : 400;
        return Response.json({ error: res.error }, { status });
      }
      return Response.json({ success: true, message: res.message });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Action failed" },
      { status: 500 },
    );
  }
}
