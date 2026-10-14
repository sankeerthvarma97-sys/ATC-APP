import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import {
  createAnnouncement,
  listAnnouncements,
} from "@/lib/services/announcement-service";
import type { AnnouncementCategory, AnnouncementPriority, TargetAudienceType } from "@/lib/domain";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    const auth = assertPermission(user, "VIEW_ANNOUNCEMENTS");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    const announcements = await listAnnouncements({
      viewer: user,
      category,
      priority,
      status,
      search,
    });

    return NextResponse.json({ announcements });
  } catch (error) {
    console.error("GET /api/announcements error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load announcements" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    const auth = assertPermission(user, "MANAGE_ANNOUNCEMENTS");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const body = await request.json();
    const {
      title,
      message,
      category,
      priority,
      targetAudienceType,
      targetRole,
      targetDepartment,
      scheduledAt,
      expiresAt,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Announcement title is required." }, { status: 400 });
    }
    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Announcement message content is required." }, { status: 400 });
    }

    const announcement = await createAnnouncement({
      title: title.trim(),
      message: message.trim(),
      category: (category as AnnouncementCategory) || "GENERAL",
      priority: (priority as AnnouncementPriority) || "NORMAL",
      targetAudienceType: (targetAudienceType as TargetAudienceType) || "ALL_STAFF",
      targetRole,
      targetDepartment,
      scheduledAt,
      expiresAt,
      publisher: user!,
    });

    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error) {
    console.error("POST /api/announcements error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to publish announcement" },
      { status: 500 },
    );
  }
}
