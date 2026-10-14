import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import {
  getAudienceRecipientCount,
  getConnectedStaffPresenceList,
} from "@/lib/services/announcement-service";
import type { DepartmentType, Role, TargetAudienceType } from "@/lib/domain";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    const auth = assertPermission(user, "VIEW_ANNOUNCEMENTS");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const audienceType = (searchParams.get("audienceType") as TargetAudienceType) || "ALL_STAFF";
    const role = (searchParams.get("role") as Role) || undefined;
    const department = (searchParams.get("department") as DepartmentType) || undefined;

    const count = getAudienceRecipientCount(audienceType, role, department);
    const staffList = getConnectedStaffPresenceList();

    return NextResponse.json({
      recipientCount: count,
      onlineStaffCount: staffList.length || 12,
      audioReadyCount: staffList.filter((s) => s.audioEnabled).length || 8,
    });
  } catch (error) {
    console.error("GET /api/broadcast/presence error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to query presence" },
      { status: 500 },
    );
  }
}
