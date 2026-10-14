import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import {
  endVoiceBroadcast,
  getActiveVoiceBroadcast,
  getBroadcastHistory,
  startVoiceBroadcast,
  toggleVoiceBroadcastMute,
} from "@/lib/services/announcement-service";
import type { TargetAudienceType } from "@/lib/domain";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    const auth = assertPermission(user, "VIEW_ANNOUNCEMENTS");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const activeSession = getActiveVoiceBroadcast();
    const history = getBroadcastHistory();

    return NextResponse.json({
      activeBroadcast: activeSession,
      history,
    });
  } catch (error) {
    console.error("GET /api/broadcast/voice error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load broadcast status" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    const auth = assertPermission(user, "BROADCAST_LIVE_VOICE");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const body = await request.json();
    const { action, sessionId, targetAudienceType, targetRole, targetDepartment, isMuted } = body;

    if (action === "START") {
      const session = await startVoiceBroadcast({
        admin: user!,
        targetAudienceType: (targetAudienceType as TargetAudienceType) || "ALL_STAFF",
        targetRole,
        targetDepartment,
      });
      return NextResponse.json({ success: true, session }, { status: 201 });
    }

    if (action === "MUTE") {
      if (!sessionId) {
        return NextResponse.json({ error: "Session ID required" }, { status: 400 });
      }
      const session = await toggleVoiceBroadcastMute(sessionId, Boolean(isMuted), user!.id);
      return NextResponse.json({ success: true, session });
    }

    if (action === "END") {
      if (!sessionId) {
        return NextResponse.json({ error: "Session ID required" }, { status: 400 });
      }
      const session = await endVoiceBroadcast(sessionId, user!.id);
      return NextResponse.json({ success: true, session });
    }

    return NextResponse.json({ error: "Invalid action. Supported: START, MUTE, END" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/broadcast/voice error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Voice broadcast operation failed" },
      { status: 500 },
    );
  }
}
