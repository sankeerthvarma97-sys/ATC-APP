import { describe, it, expect, beforeEach } from "vitest";
import {
  createAnnouncement,
  listAnnouncements,
  acknowledgeAnnouncement,
  markAnnouncementRead,
  cancelAnnouncement,
  startVoiceBroadcast,
  toggleVoiceBroadcastMute,
  endVoiceBroadcast,
  getActiveVoiceBroadcast,
  getBroadcastHistory,
  getAudienceRecipientCount,
  registerStaffPresence,
  removeStaffPresence,
} from "@/lib/services/announcement-service";
import type { UserDTO } from "@/lib/domain";

describe("AOCC Announcement Board & Live Voice Broadcast Engine", () => {
  const superAdminUser: UserDTO = {
    id: "usr-super-admin",
    name: "Permanent Super Admin",
    email: "admin@gmail.com",
    role: "SUPER_ADMIN",
    shift: "ALL",
  };

  const atcStaffUser: UserDTO = {
    id: "usr-atc",
    name: "Evan Torres",
    email: "atc@aocc.test",
    role: "ATC",
    shift: "TOWER-E",
  };

  const securityStaffUser: UserDTO = {
    id: "usr-sec",
    name: "Rajesh Kumar",
    email: "security@aocc.test",
    role: "SECURITY_OFFICER",
    shift: "T1-GATE",
  };

  const passengerUser: UserDTO = {
    id: "usr-pass",
    name: "Aarav Sharma",
    email: "passenger@aocc.test",
    role: "PASSENGER",
  };

  it("allows authorized admin to create and publish an announcement with audience targeting", async () => {
    const ann = await createAnnouncement({
      title: "Runway 09L Emergency Maintenance Drill",
      message: "Runway 09L closed for 30 minutes due to simulated friction testing.",
      category: "EMERGENCY_DRILL",
      priority: "URGENT",
      targetAudienceType: "ALL_STAFF",
      publisher: superAdminUser,
    });

    expect(ann.id).toBeDefined();
    expect(ann.status).toBe("PUBLISHED");
    expect(ann.title).toBe("Runway 09L Emergency Maintenance Drill");
    expect(ann.publisherRole).toBe("SUPER_ADMIN");
    expect(ann.priority).toBe("URGENT");
  });

  it("filters announcements according to recipient audience role and permissions", async () => {
    // 1. Create announcement targeted specifically to ATC
    const atcOnlyAnn = await createAnnouncement({
      title: "ATC Frequency Coordination",
      message: "Switch tower backup frequency to 119.50 MHz.",
      category: "OPERATIONAL_UPDATE",
      priority: "HIGH",
      targetAudienceType: "ROLE",
      targetRole: "ATC",
      publisher: superAdminUser,
    });

    // 2. Query as ATC staff viewer
    const atcFeed = await listAnnouncements({ viewer: atcStaffUser });
    const foundInAtc = atcFeed.some((a) => a.id === atcOnlyAnn.id);
    expect(foundInAtc).toBe(true);

    // 3. Query as Security staff viewer (should NOT see ATC-only announcement)
    const secFeed = await listAnnouncements({ viewer: securityStaffUser });
    const foundInSec = secFeed.some((a) => a.id === atcOnlyAnn.id);
    expect(foundInSec).toBe(false);

    // 4. Admin sees all announcements
    const adminFeed = await listAnnouncements({ viewer: superAdminUser });
    expect(adminFeed.some((a) => a.id === atcOnlyAnn.id)).toBe(true);
  });

  it("records staff acknowledgements and read events accurately", async () => {
    const ann = await createAnnouncement({
      title: "Mandatory Safety Briefing",
      message: "Please acknowledge receipt of updated ramp safety SOP.",
      category: "STAFF_INSTRUCTIONS",
      priority: "NORMAL",
      targetAudienceType: "ALL_STAFF",
      publisher: superAdminUser,
    });

    expect(ann.acknowledgementCount).toBe(0);

    // Staff acknowledges
    const ackResult = await acknowledgeAnnouncement(ann.id, atcStaffUser.id);
    expect(ackResult.success).toBe(true);
    expect(ackResult.acknowledgementCount).toBe(1);

    // Staff reads again (idempotent, doesn't duplicate)
    const ackAgain = await acknowledgeAnnouncement(ann.id, atcStaffUser.id);
    expect(ackAgain.acknowledgementCount).toBe(1);

    // Different staff acknowledges
    const secAck = await acknowledgeAnnouncement(ann.id, securityStaffUser.id);
    expect(secAck.acknowledgementCount).toBe(2);
  });

  it("allows admin to cancel an announcement with an audit trail", async () => {
    const ann = await createAnnouncement({
      title: "Temporary Power Outage Alert",
      message: "Backup diesel generators initiating.",
      category: "OPERATIONAL_UPDATE",
      priority: "HIGH",
      targetAudienceType: "ALL_STAFF",
      publisher: superAdminUser,
    });

    expect(ann.status).toBe("PUBLISHED");

    const cancelled = await cancelAnnouncement(ann.id, superAdminUser);
    expect(cancelled).toBe(true);

    // Verify status updated in store
    const list = await listAnnouncements({ viewer: superAdminUser, status: "CANCELLED" });
    const found = list.find((a) => a.id === ann.id);
    expect(found?.status).toBe("CANCELLED");
  });

  it("only allows authorized administrators to start a live voice broadcast", async () => {
    // 1. Non-admin staff attempting to start a broadcast must be rejected
    await expect(
      startVoiceBroadcast({
        admin: atcStaffUser,
        targetAudienceType: "ALL_STAFF",
      }),
    ).rejects.toThrow("Unauthorized");

    // 2. Passenger attempting to start must be rejected
    await expect(
      startVoiceBroadcast({
        admin: passengerUser,
        targetAudienceType: "ALL_STAFF",
      }),
    ).rejects.toThrow("Unauthorized");

    // 3. Super Admin successfully starts broadcast
    const session = await startVoiceBroadcast({
      admin: superAdminUser,
      targetAudienceType: "ALL_STAFF",
    });

    expect(session.id).toBeDefined();
    expect(session.status).toBe("TRANSMITTING");
    expect(session.adminRole).toBe("SUPER_ADMIN");
    expect(getActiveVoiceBroadcast()?.id).toBe(session.id);
  });

  it("manages the full live voice broadcast lifecycle (start, mute, resume, end)", async () => {
    // Start session
    const session = await startVoiceBroadcast({
      admin: superAdminUser,
      targetAudienceType: "DEPARTMENT",
      targetDepartment: "AIR_TRAFFIC_CONTROL",
    });

    expect(session.status).toBe("TRANSMITTING");

    // Mute microphone
    const mutedSession = await toggleVoiceBroadcastMute(session.id, true, superAdminUser.id);
    expect(mutedSession?.status).toBe("MUTED");

    // Resume microphone
    const resumedSession = await toggleVoiceBroadcastMute(session.id, false, superAdminUser.id);
    expect(resumedSession?.status).toBe("TRANSMITTING");

    // End broadcast
    const endedSession = await endVoiceBroadcast(session.id, superAdminUser.id);
    expect(endedSession?.status).toBe("ENDED");
    expect(endedSession?.endedAt).toBeDefined();
    expect(endedSession?.durationSeconds).toBeGreaterThanOrEqual(1);

    // Active session should now be null
    expect(getActiveVoiceBroadcast()).toBeNull();

    // Session should be recorded in broadcast history
    const history = getBroadcastHistory();
    expect(history.some((h) => h.id === session.id)).toBe(true);
  });

  it("tracks online audience presence and computes recipient counts accurately", () => {
    // Register connected staff sockets
    registerStaffPresence({
      socketId: "sock-01",
      userId: "usr-atc-1",
      userName: "Evan Torres",
      role: "ATC",
      department: "AIR_TRAFFIC_CONTROL",
      audioEnabled: true,
      connectedAt: new Date().toISOString(),
      lastPingAt: new Date().toISOString(),
    });

    registerStaffPresence({
      socketId: "sock-02",
      userId: "usr-sec-1",
      userName: "Rajesh Kumar",
      role: "SECURITY_OFFICER",
      department: "SECURITY",
      audioEnabled: false,
      connectedAt: new Date().toISOString(),
      lastPingAt: new Date().toISOString(),
    });

    // Count for all staff
    const allCount = getAudienceRecipientCount("ALL_STAFF");
    expect(allCount).toBe(2);

    // Count for ATC role
    const atcCount = getAudienceRecipientCount("ROLE", "ATC");
    expect(atcCount).toBe(1);

    // Count for Security department
    const secCount = getAudienceRecipientCount("DEPARTMENT", undefined, "SECURITY");
    expect(secCount).toBe(1);

    // Clean up
    removeStaffPresence("sock-01");
    removeStaffPresence("sock-02");
  });
});
