import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { StaffAnnouncementBoard } from "@/components/announcements/staff-announcement-board";
import { Megaphone } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StaffAnnouncementsPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?callbackUrl=/staff/announcements");
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Megaphone className="h-6 w-6 text-cyan-400" />
            Station Announcement Board & Live Voice Receiver
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time executive directives, operational updates, emergency drill notices, and incoming live admin voice broadcasts.
          </p>
        </div>
      </div>

      <StaffAnnouncementBoard currentUser={user} />
    </div>
  );
}
