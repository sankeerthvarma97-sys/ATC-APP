import { getAuthenticatedUser, getCurrentUserOrDemo } from "@/lib/auth/session";
import { requireAnyRole } from "@/lib/auth/rbac";
import {
  createBranch,
  createSnapshot,
  deleteBranch,
  getDisasterRecoveryStatus,
  listBranches,
  listSnapshots,
  restoreFromSnapshot,
  triggerDisasterRecoveryDrill,
} from "@/lib/services/neon-branch-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = (await getAuthenticatedUser()) || (await getCurrentUserOrDemo());
  const authz = requireAnyRole(user ?? undefined, [
    "SUPER_ADMIN",
    "ADMIN",
    "AIRPORT_ADMIN",
    "OPERATIONS_MANAGER",
  ]);

  if (!authz.ok) {
    return Response.json({ error: authz.message }, { status: authz.status });
  }

  try {
    const [branches, snapshots, drStatus] = await Promise.all([
      listBranches(),
      listSnapshots(),
      getDisasterRecoveryStatus(),
    ]);

    return Response.json({
      branches,
      snapshots,
      drStatus,
    });
  } catch (error) {
    console.error("Neon branches query failed:", error);
    return Response.json({ error: "Failed to fetch Neon branches." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = (await getAuthenticatedUser()) || (await getCurrentUserOrDemo());
  const authz = requireAnyRole(user ?? undefined, [
    "SUPER_ADMIN",
    "ADMIN",
    "AIRPORT_ADMIN",
  ]);

  if (!authz.ok) {
    return Response.json({ error: authz.message }, { status: authz.status });
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.action) {
    return Response.json({ error: "Invalid action payload." }, { status: 400 });
  }

  try {
    switch (body.action) {
      case "CREATE_BRANCH": {
        if (!body.name) {
          return Response.json({ error: "Branch name is required." }, { status: 400 });
        }
        const branch = await createBranch({
          name: body.name,
          parentBranchId: body.parentBranchId,
          role: body.role,
        });
        return Response.json({ branch, message: "Branch created successfully." });
      }

      case "CREATE_SNAPSHOT": {
        if (!body.branchId || !body.label) {
          return Response.json({ error: "Branch ID and snapshot label required." }, { status: 400 });
        }
        const snapshot = await createSnapshot(body.branchId, body.label);
        return Response.json({ snapshot, message: "Snapshot captured successfully." });
      }

      case "RESTORE_SNAPSHOT": {
        if (!body.branchId || !body.snapshotId) {
          return Response.json({ error: "Branch ID and snapshot ID required." }, { status: 400 });
        }
        const result = await restoreFromSnapshot(body.branchId, body.snapshotId);
        return Response.json(result);
      }

      case "DR_DRILL": {
        const result = await triggerDisasterRecoveryDrill(body.branchId);
        return Response.json(result);
      }

      default:
        return Response.json({ error: `Unknown action '${body.action}'` }, { status: 400 });
    }
  } catch (error: unknown) {
    const err = error as Error;
    return Response.json({ error: err.message || "Operation failed." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = (await getAuthenticatedUser()) || (await getCurrentUserOrDemo());
  const authz = requireAnyRole(user ?? undefined, ["SUPER_ADMIN", "ADMIN"]);

  if (!authz.ok) {
    return Response.json({ error: authz.message }, { status: authz.status });
  }

  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branchId");

  if (!branchId) {
    return Response.json({ error: "branchId is required." }, { status: 400 });
  }

  try {
    const result = await deleteBranch(branchId);
    return Response.json(result);
  } catch (error: unknown) {
    const err = error as Error;
    return Response.json({ error: err.message || "Failed to delete branch." }, { status: 500 });
  }
}
