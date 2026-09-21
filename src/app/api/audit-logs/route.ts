import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { getAuditLogs } from "@/lib/services/audit-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  const auth = assertPermission(user, "VIEW_AUDIT_LOGS");
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number.parseInt(searchParams.get("limit") || "100", 10), 200);

  const logs = await getAuditLogs(limit);
  return Response.json({ logs });
}
