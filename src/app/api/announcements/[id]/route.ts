import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { cancelAnnouncement, updateAnnouncement } from "@/lib/services/announcement-service";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthenticatedUser();
    const auth = assertPermission(user, "MANAGE_ANNOUNCEMENTS");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const { id } = await params;
    const body = await request.json();

    if (body.action === "CANCEL") {
      const ok = await cancelAnnouncement(id, user!);
      if (!ok) {
        return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: "Announcement cancelled." });
    }

    const updated = await updateAnnouncement(id, body, user!);
    if (!updated) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }

    return NextResponse.json({ announcement: updated });
  } catch (error) {
    console.error("PATCH /api/announcements/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update announcement" },
      { status: 500 },
    );
  }
}
