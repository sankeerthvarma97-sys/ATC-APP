import { getAuthenticatedUser } from "@/lib/auth/session";
import { listVirtualStaffPaged } from "@/lib/simulation/staff-engine";
import { prisma, shouldUseDatabase } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("pageSize") || "20", 10)));
    const department = searchParams.get("department") || undefined;
    const role = searchParams.get("role") || undefined;
    const shift = searchParams.get("shift") || undefined;
    const search = searchParams.get("search") || searchParams.get("q") || undefined;

    const result = await listVirtualStaffPaged({
      page,
      pageSize,
      department,
      role,
      shift,
      search,
    });

    return Response.json(result);
  } catch (error) {
    console.error("GET /api/simulation/staff error:", error);
    return Response.json(
      { error: "Failed to retrieve virtual staff directory." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const allowedRoles = ["SUPER_ADMIN", "ADMIN", "AIRPORT_ADMIN", "OPERATIONS_MANAGER", "SUPERVISOR"];
  if (!allowedRoles.includes(user.role)) {
    return Response.json(
      { error: "Insufficient permissions to modify virtual staff." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { staffId, currentTask, currentLocation, status } = body;

    if (!staffId) {
      return Response.json({ error: "staffId is required." }, { status: 400 });
    }

    if (shouldUseDatabase()) {
      const updated = await prisma.employee.update({
        where: { id: staffId },
        data: {
          currentTask: currentTask || undefined,
          currentLocation: currentLocation || undefined,
          status: status || undefined,
        },
      });

      return Response.json({ success: true, staff: updated });
    }

    return Response.json({
      success: true,
      message: "Virtual staff updated in simulation cache.",
    });
  } catch (error) {
    console.error("PATCH /api/simulation/staff error:", error);
    const msg = error instanceof Error ? error.message : "Failed to update virtual staff.";
    return Response.json({ error: msg }, { status: 500 });
  }
}
