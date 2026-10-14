import type {
  AnnouncementCategory,
  AnnouncementDTO,
  AnnouncementPriority,
  AnnouncementStatus,
  DepartmentType,
  Role,
  StaffOnlinePresenceDTO,
  TargetAudienceType,
  UserDTO,
  VoiceBroadcastSessionDTO,
} from "@/lib/domain";
import { logAuditEvent } from "./audit-service";

export interface CreateAnnouncementInput {
  title: string;
  message: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  targetAudienceType: TargetAudienceType;
  targetRole?: Role;
  targetDepartment?: DepartmentType;
  targetStaffIds?: string[];
  scheduledAt?: string;
  expiresAt?: string;
  publisher: UserDTO;
}

// In-memory store initialized with realistic educational airport operations announcements
const memoryAnnouncements: Map<string, AnnouncementDTO> = new Map();

// Track online staff presence in-memory
const activeConnectedStaff: Map<string, StaffOnlinePresenceDTO> = new Map();

function seedInitialAnnouncements() {
  if (memoryAnnouncements.size > 0) return;

  const now = Date.now();
  const sampleAnnouncements: AnnouncementDTO[] = [
    {
      id: "ann-001",
      title: "Simulated Weather Alert: Low Visibility Approach Operations in Effect",
      message:
        "Dense radiation fog forecasted over Runway 09L/27R. Begumpet/RGIA Tower initiating CAT II ILS procedures. All ground tugs, marshallers, and follow-me vehicles must illuminate flashing beacon strobes.",
      category: "OPERATIONAL_UPDATE",
      priority: "HIGH",
      status: "PUBLISHED",
      targetAudienceType: "ALL_STAFF",
      publisherId: "usr-super-admin",
      publisherName: "Permanent Super Admin",
      publisherRole: "SUPER_ADMIN",
      publishedAt: new Date(now - 45 * 60_000).toISOString(),
      expiresAt: new Date(now + 24 * 3600_000).toISOString(),
      readCount: 42,
      acknowledgementCount: 28,
      readByUsers: ["usr-super-admin", "usr-atc"],
      acknowledgedByUsers: ["usr-atc"],
      createdAt: new Date(now - 45 * 60_000).toISOString(),
      updatedAt: new Date(now - 45 * 60_000).toISOString(),
    },
    {
      id: "ann-002",
      title: "Mandatory Apron Security Drill — Terminal 1 Airside",
      message:
        "All security officers and gate agents please report for scheduled emergency turnstile drill at Concourse B. Please test turnstile QR fallback scanners and ensure secondary perimeter gates are locked.",
      category: "EMERGENCY_DRILL",
      priority: "URGENT",
      status: "PUBLISHED",
      targetAudienceType: "DEPARTMENT",
      targetDepartment: "SECURITY",
      publisherId: "usr-super-admin",
      publisherName: "Permanent Super Admin",
      publisherRole: "SUPER_ADMIN",
      publishedAt: new Date(now - 2 * 3600_000).toISOString(),
      expiresAt: new Date(now + 12 * 3600_000).toISOString(),
      readCount: 19,
      acknowledgementCount: 15,
      readByUsers: ["usr-super-admin"],
      acknowledgedByUsers: [],
      createdAt: new Date(now - 2 * 3600_000).toISOString(),
      updatedAt: new Date(now - 2 * 3600_000).toISOString(),
    },
    {
      id: "ann-003",
      title: "Air Traffic Control Station Handover Meeting at 14:00Z",
      message:
        "Shift handover briefing for Approach Control, Tower Frequency 118.10 MHz, and Ground Radar Sector 2. Please review pending NOTAMs and fuel reserve advisories before logging in.",
      category: "MEETING",
      priority: "NORMAL",
      status: "PUBLISHED",
      targetAudienceType: "ROLE",
      targetRole: "ATC",
      publisherId: "usr-super-admin",
      publisherName: "Permanent Super Admin",
      publisherRole: "SUPER_ADMIN",
      publishedAt: new Date(now - 4 * 3600_000).toISOString(),
      readCount: 8,
      acknowledgementCount: 6,
      readByUsers: ["usr-atc"],
      acknowledgedByUsers: ["usr-atc"],
      createdAt: new Date(now - 4 * 3600_000).toISOString(),
      updatedAt: new Date(now - 4 * 3600_000).toISOString(),
    },
  ];

  for (const ann of sampleAnnouncements) {
    memoryAnnouncements.set(ann.id, ann);
  }
}

// Initialize seed data
seedInitialAnnouncements();

/**
 * Filter and list announcements according to target audience and user permissions.
 */
export async function listAnnouncements(filters?: {
  viewer?: UserDTO | null;
  category?: string;
  priority?: string;
  status?: string;
  search?: string;
}): Promise<AnnouncementDTO[]> {
  const { viewer, category, priority, status, search } = filters || {};
  let list = Array.from(memoryAnnouncements.values());

  // Audience matching logic:
  // Admins see all announcements. Non-admin staff only see announcements targeting them.
  if (viewer) {
    const isPrivilegedAdmin =
      viewer.role === "SUPER_ADMIN" ||
      viewer.role === "ADMIN" ||
      viewer.role === "AIRPORT_ADMIN" ||
      viewer.role === "OPERATIONS_MANAGER";

    if (!isPrivilegedAdmin) {
      list = list.filter((ann) => {
        if (ann.status !== "PUBLISHED") return false;
        if (ann.targetAudienceType === "ALL_STAFF") return true;
        if (ann.targetAudienceType === "ROLE" && ann.targetRole === viewer.role) return true;
        if (ann.targetAudienceType === "DEPARTMENT") {
          // If staff viewer has shift/department metadata or matching department
          return true; // Staff receives department broadcasts in simulated environment
        }
        if (ann.targetAudienceType === "SPECIFIC_STAFF" && ann.targetStaffIds?.includes(viewer.id)) {
          return true;
        }
        return false;
      });
    }
  }

  if (category && category !== "ALL") {
    list = list.filter((a) => a.category === category);
  }
  if (priority && priority !== "ALL") {
    list = list.filter((a) => a.priority === priority);
  }
  if (status && status !== "ALL") {
    list = list.filter((a) => a.status === status);
  }
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.message.toLowerCase().includes(q) ||
        a.publisherName.toLowerCase().includes(q),
    );
  }

  // Sort: published and unexpired first, then newest first
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Create a new Announcement with audit logging.
 */
export async function createAnnouncement(input: CreateAnnouncementInput): Promise<AnnouncementDTO> {
  const now = new Date().toISOString();
  const id = `ann-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const isScheduled = input.scheduledAt && new Date(input.scheduledAt).getTime() > Date.now();
  const status: AnnouncementStatus = isScheduled ? "SCHEDULED" : "PUBLISHED";
  const publishedAt = isScheduled ? undefined : now;

  const announcement: AnnouncementDTO = {
    id,
    title: input.title.trim(),
    message: input.message.trim(),
    category: input.category,
    priority: input.priority,
    status,
    targetAudienceType: input.targetAudienceType,
    targetRole: input.targetRole,
    targetDepartment: input.targetDepartment,
    targetStaffIds: input.targetStaffIds,
    publisherId: input.publisher.id,
    publisherName: input.publisher.name,
    publisherRole: input.publisher.role,
    scheduledAt: input.scheduledAt,
    publishedAt,
    expiresAt: input.expiresAt,
    readCount: 0,
    acknowledgementCount: 0,
    readByUsers: [input.publisher.id],
    acknowledgedByUsers: [],
    createdAt: now,
    updatedAt: now,
  };

  memoryAnnouncements.set(id, announcement);

  await logAuditEvent({
    actorId: input.publisher.id,
    action: "ANNOUNCEMENT_PUBLISHED",
    entity: "ANNOUNCEMENT",
    entityId: id,
    after: {
      title: announcement.title,
      category: announcement.category,
      priority: announcement.priority,
      targetAudience: announcement.targetAudienceType,
    },
  });

  return announcement;
}

/**
 * Update an existing announcement.
 */
export async function updateAnnouncement(
  id: string,
  input: Partial<CreateAnnouncementInput> & { status?: AnnouncementStatus },
  actor: UserDTO,
): Promise<AnnouncementDTO | null> {
  const existing = memoryAnnouncements.get(id);
  if (!existing) return null;

  const updated: AnnouncementDTO = {
    ...existing,
    title: input.title !== undefined ? input.title.trim() : existing.title,
    message: input.message !== undefined ? input.message.trim() : existing.message,
    category: input.category ?? existing.category,
    priority: input.priority ?? existing.priority,
    status: input.status ?? existing.status,
    targetAudienceType: input.targetAudienceType ?? existing.targetAudienceType,
    targetRole: input.targetRole ?? existing.targetRole,
    targetDepartment: input.targetDepartment ?? existing.targetDepartment,
    expiresAt: input.expiresAt ?? existing.expiresAt,
    updatedAt: new Date().toISOString(),
  };

  memoryAnnouncements.set(id, updated);

  await logAuditEvent({
    actorId: actor.id,
    action: "ANNOUNCEMENT_UPDATED",
    entity: "ANNOUNCEMENT",
    entityId: id,
    after: { title: updated.title, status: updated.status },
  });

  return updated;
}

/**
 * Cancel or revoke an announcement.
 */
export async function cancelAnnouncement(id: string, actor: UserDTO): Promise<boolean> {
  const existing = memoryAnnouncements.get(id);
  if (!existing) return false;

  existing.status = "CANCELLED";
  existing.updatedAt = new Date().toISOString();
  memoryAnnouncements.set(id, existing);

  await logAuditEvent({
    actorId: actor.id,
    action: "ANNOUNCEMENT_CANCELLED",
    entity: "ANNOUNCEMENT",
    entityId: id,
    after: { title: existing.title },
  });

  return true;
}

/**
 * Record a staff member acknowledging an announcement.
 */
export async function acknowledgeAnnouncement(
  announcementId: string,
  userId: string,
): Promise<{ success: boolean; acknowledgementCount: number }> {
  const announcement = memoryAnnouncements.get(announcementId);
  if (!announcement) return { success: false, acknowledgementCount: 0 };

  if (!announcement.acknowledgedByUsers) {
    announcement.acknowledgedByUsers = [];
  }

  if (!announcement.acknowledgedByUsers.includes(userId)) {
    announcement.acknowledgedByUsers.push(userId);
    announcement.acknowledgementCount = announcement.acknowledgedByUsers.length;
  }

  if (!announcement.readByUsers) {
    announcement.readByUsers = [];
  }
  if (!announcement.readByUsers.includes(userId)) {
    announcement.readByUsers.push(userId);
    announcement.readCount = announcement.readByUsers.length;
  }

  announcement.updatedAt = new Date().toISOString();
  memoryAnnouncements.set(announcementId, announcement);

  return { success: true, acknowledgementCount: announcement.acknowledgementCount };
}

/**
 * Record a staff member opening/reading an announcement.
 */
export async function markAnnouncementRead(
  announcementId: string,
  userId: string,
): Promise<{ success: boolean; readCount: number }> {
  const announcement = memoryAnnouncements.get(announcementId);
  if (!announcement) return { success: false, readCount: 0 };

  if (!announcement.readByUsers) {
    announcement.readByUsers = [];
  }

  if (!announcement.readByUsers.includes(userId)) {
    announcement.readByUsers.push(userId);
    announcement.readCount = announcement.readByUsers.length;
    announcement.updatedAt = new Date().toISOString();
    memoryAnnouncements.set(announcementId, announcement);
  }

  return { success: true, readCount: announcement.readCount };
}

// Active in-memory voice broadcast session
let activeBroadcastSession: VoiceBroadcastSessionDTO | null = null;
const memoryBroadcastSessions: Map<string, VoiceBroadcastSessionDTO> = new Map();

// ==========================================
// LIVE VOICE BROADCAST SESSIONS
// ==========================================

/**
 * Start a live admin voice broadcast session.
 */
export async function startVoiceBroadcast(input: {
  admin: UserDTO;
  targetAudienceType: TargetAudienceType;
  targetRole?: Role;
  targetDepartment?: DepartmentType;
}): Promise<VoiceBroadcastSessionDTO> {
  const isAuthorized =
    input.admin.role === "SUPER_ADMIN" ||
    input.admin.role === "ADMIN" ||
    input.admin.role === "AIRPORT_ADMIN" ||
    input.admin.role === "OPERATIONS_MANAGER";

  if (!isAuthorized) {
    throw new Error("Unauthorized: Only Airport Administrators can initiate live voice broadcasts.");
  }

  // End any currently running broadcast first
  if (activeBroadcastSession && activeBroadcastSession.status !== "ENDED") {
    await endVoiceBroadcast(activeBroadcastSession.id, input.admin.id);
  }

  const sessionId = `vbc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  // Compute recipient count from online connected presence
  const audienceCount = getAudienceRecipientCount(
    input.targetAudienceType,
    input.targetRole,
    input.targetDepartment,
  );

  const session: VoiceBroadcastSessionDTO = {
    id: sessionId,
    adminId: input.admin.id,
    adminName: input.admin.name,
    adminRole: input.admin.role,
    targetAudienceType: input.targetAudienceType,
    targetRole: input.targetRole,
    targetDepartment: input.targetDepartment,
    status: "TRANSMITTING",
    connectedRecipientsCount: audienceCount,
    startedAt: now,
  };

  activeBroadcastSession = session;
  memoryBroadcastSessions.set(sessionId, session);

  await logAuditEvent({
    actorId: input.admin.id,
    action: "VOICE_BROADCAST_STARTED",
    entity: "VOICE_BROADCAST",
    entityId: sessionId,
    after: {
      targetAudience: session.targetAudienceType,
      targetRole: session.targetRole,
      targetDepartment: session.targetDepartment,
      connectedRecipients: audienceCount,
    },
  });

  return session;
}

/**
 * Toggle mute on the active voice broadcast.
 */
export async function toggleVoiceBroadcastMute(
  sessionId?: string,
  isMuted?: boolean,
  actorId?: string,
): Promise<VoiceBroadcastSessionDTO | null> {
  if (!activeBroadcastSession || (sessionId && activeBroadcastSession.id !== sessionId)) {
    return null;
  }

  activeBroadcastSession.status = isMuted ? "MUTED" : "TRANSMITTING";
  memoryBroadcastSessions.set(activeBroadcastSession.id, activeBroadcastSession);

  if (actorId) {
    await logAuditEvent({
      actorId,
      action: isMuted ? "VOICE_BROADCAST_MUTED" : "VOICE_BROADCAST_RESUMED",
      entity: "VOICE_BROADCAST",
      entityId: activeBroadcastSession.id,
    });
  }

  return activeBroadcastSession;
}

/**
 * End the active voice broadcast.
 */
export async function endVoiceBroadcast(
  sessionId?: string,
  actorId?: string,
): Promise<VoiceBroadcastSessionDTO | null> {
  const session = (sessionId ? memoryBroadcastSessions.get(sessionId) : null) || activeBroadcastSession;
  if (!session) return null;

  const now = new Date();
  session.status = "ENDED";
  session.endedAt = now.toISOString();

  const startMs = new Date(session.startedAt).getTime();
  session.durationSeconds = Math.max(1, Math.round((now.getTime() - startMs) / 1000));

  memoryBroadcastSessions.set(session.id, session);
  if (activeBroadcastSession?.id === session.id) {
    activeBroadcastSession = null;
  }

  if (actorId) {
    await logAuditEvent({
      actorId,
      action: "VOICE_BROADCAST_ENDED",
      entity: "VOICE_BROADCAST",
      entityId: session.id,
      after: { durationSeconds: session.durationSeconds },
    });
  }

  return session;
}

/**
 * Get active voice broadcast session if currently broadcasting.
 */
export function getActiveVoiceBroadcast(): VoiceBroadcastSessionDTO | null {
  return activeBroadcastSession;
}

/**
 * Get list of historical voice broadcast sessions.
 */
export function getBroadcastHistory(): VoiceBroadcastSessionDTO[] {
  return Array.from(memoryBroadcastSessions.values()).sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );
}

// ==========================================
// ONLINE STAFF PRESENCE TRACKING
// ==========================================

export function registerStaffPresence(data: StaffOnlinePresenceDTO) {
  activeConnectedStaff.set(data.socketId, data);
}

export function updateStaffAudioState(socketId: string, audioEnabled: boolean) {
  const existing = activeConnectedStaff.get(socketId);
  if (existing) {
    existing.audioEnabled = audioEnabled;
    existing.lastPingAt = new Date().toISOString();
  }
}

export function removeStaffPresence(socketId: string) {
  activeConnectedStaff.delete(socketId);
}

export function getAudienceRecipientCount(
  audienceType: TargetAudienceType,
  role?: Role,
  department?: DepartmentType,
): number {
  if (activeConnectedStaff.size === 0) {
    // If no sockets connected yet in isolated environment, return sensible default simulation count
    return 12;
  }

  let count = 0;
  for (const staff of activeConnectedStaff.values()) {
    if (audienceType === "ALL_STAFF") {
      count++;
    } else if (audienceType === "ROLE" && staff.role === role) {
      count++;
    } else if (audienceType === "DEPARTMENT" && staff.department === department) {
      count++;
    }
  }
  return Math.max(count, 1);
}

export function getConnectedStaffPresenceList(): StaffOnlinePresenceDTO[] {
  return Array.from(activeConnectedStaff.values());
}
