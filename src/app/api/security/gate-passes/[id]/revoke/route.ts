import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { revokeGatePass } from "@/lib/services/gate-pass-service";
import { revokeGatePassSchema } from "@/lib/validations/authority";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const auth = assertPermission(user, "VERIFY_TICKET");
  if (!auth.ok && user.role !== "SUPER_ADMIN" && user.role !== "ADMIN" && user.role !== "AIRPORT_ADMIN" && user.role !== "SECURITY_OFFICER") {
    return NextResponse.json({ error: "Unauthorized to revoke gate passes" }, { status: 403 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Gate pass number is required" }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = revokeGatePassSchema.safeParse(body);
    const reason = parsed.success ? parsed.data.reason : "Revoked by airport security officer";

    const result = await revokeGatePass(id, reason, {
      id: user.id,
      name: user.name,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to revoke gate pass" },
      { status: 500 }
    );
  }
}
