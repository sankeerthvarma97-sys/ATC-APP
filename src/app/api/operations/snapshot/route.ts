import { getAuthenticatedUser } from "@/lib/auth/session";
import { getOperationsSnapshot } from "@/lib/repositories/operations-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const diagnosticsEnabled = process.env.AOCC_PERF_DIAGNOSTICS === "true";
  const startedAt = Date.now();
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const snapshot = await getOperationsSnapshot(user);
  if (diagnosticsEnabled) {
    console.info("[AOCC_PERF]", JSON.stringify({
      area: "operations_snapshot_api",
      durationMs: Date.now() - startedAt,
    }));
  }
  return Response.json(snapshot, {
    headers: {
      "Cache-Control": "private, no-cache, no-transform",
    },
  });
}
