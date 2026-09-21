import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { updateEmployee } from "@/lib/services/staff-service";
import { updateEmployeeSchema } from "@/lib/validations/authority";

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
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to update employee" },
      { status: 500 },
    );
  }
}
