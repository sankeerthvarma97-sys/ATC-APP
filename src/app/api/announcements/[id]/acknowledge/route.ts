import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { acknowledgeAnnouncement, markAnnouncementRead } from "@/lib/services/announcement-service";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthenticatedUser();
    const auth = assertPermission(user, "VIEW_ANNOUNCEMENTS");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    if (body.action === "READ") {
      const res = await markAnnouncementRead(id, user!.id);
      return NextResponse.json(res);
    }

    const result = await acknowledgeAnnouncement(id, user!.id);
    if (!result.success) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      acknowledgementCount: result.acknowledgementCount,
      message: "Announcement acknowledged successfully.",
    });
  } catch (error) {
    console.error("POST /api/announcements/[id]/acknowledge error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to acknowledge announcement" },
      { status: 500 },
    );
  }
}
