import type {
  GatePassDTO,
  GatePassType,
  SecurityZone,
  TurnstileScanEntry,
} from "@/lib/domain";
import { logAuditEvent } from "./audit-service";

// Canonical collision-resistant sequence tracker
let gatePassSequence = 1000;

export interface CreateGatePassInput {
  holderName: string;
  idNumber: string;
  passType: GatePassType;
  organization: string;
  airportCode?: string;
  terminal?: string;
  authorizedZones: SecurityZone[];
  durationHours?: number;
  escortRequired?: boolean;
  purpose: string;
}

export interface VerifyGatePassInput {
  passNumberOrQr: string;
  turnstileId: string;
  turnstileName?: string;
  zone: SecurityZone;
  direction?: "ENTRY" | "EXIT";
}

export interface VerifyGatePassResult {
  granted: boolean;
  reason: string;
  pass?: GatePassDTO;
  scanEntry: TurnstileScanEntry;
}

// In-Memory store
export const memoryGatePasses: Map<string, GatePassDTO> = new Map();
export const memoryTurnstileScans: TurnstileScanEntry[] = [];

// Seed realistic gate passes on startup
function initSeedGatePasses() {
  if (memoryGatePasses.size > 0) return;

  const now = Date.now();
  const seedPasses: Array<Omit<GatePassDTO, "id" | "qrCode" | "createdAt" | "updatedAt" | "accessLogs">> = [
    {
      passNumber: "GP-HYD-2026-000101",
      passType: "CREW",
      holderName: "Capt. Rohit Verma",
      idNumber: "IND-CREW-9042",
      organization: "SkyConnect Flight Ops",
      airportCode: "HYD",
      terminal: "T1",
      authorizedZones: ["ZONE_A_PUBLIC", "ZONE_B_SECURITY", "ZONE_C_BOARDING", "ZONE_D_RAMP"],
      validFrom: new Date(now - 3600_000 * 2).toISOString(),
      validUntil: new Date(now + 3600_000 * 22).toISOString(),
      status: "ACTIVE",
      escortRequired: false,
      purpose: "Operating Flight SC101 Flight Deck & Turnaround",
      issuedBy: "Chief of Airside Security",
      issuedById: "usr-admin",
    },
    {
      passNumber: "GP-HYD-2026-000102",
      passType: "CONTRACTOR",
      holderName: "Rajesh Kumar",
      idNumber: "AADHAAR-8129-3041",
      organization: "Siemens Airport Automation & Baggage",
      airportCode: "HYD",
      terminal: "T1",
      authorizedZones: ["ZONE_A_PUBLIC", "ZONE_B_SECURITY", "ZONE_D_RAMP"],
      validFrom: new Date(now - 3600_000 * 5).toISOString(),
      validUntil: new Date(now + 3600_000 * 19).toISOString(),
      status: "ACTIVE",
      escortRequired: false,
      purpose: "Preventive maintenance on Carousel B2 baggage sorter",
      issuedBy: "Duty Operations Manager",
      issuedById: "usr-opsmgr",
    },
    {
      passNumber: "GP-HYD-2026-000103",
      passType: "VISITOR",
      holderName: "Dr. Priya Nair",
      idNumber: "PP-K7492019",
      organization: "DGCA Air Safety Directorate",
      airportCode: "HYD",
      terminal: "T1",
      authorizedZones: ["ZONE_A_PUBLIC", "ZONE_B_SECURITY", "ZONE_C_BOARDING", "ZONE_E_ATC"],
      validFrom: new Date(now - 3600_000).toISOString(),
      validUntil: new Date(now + 3600_000 * 7).toISOString(),
      status: "ACTIVE",
      escortRequired: true,
      purpose: "Annual ATC tower radar and safety redundancy audit",
      issuedBy: "Super Administrator",
      issuedById: "usr-super",
    },
    {
      passNumber: "GP-HYD-2026-000104",
      passType: "VIP",
      holderName: "Hon. Arjun Singhania",
      idNumber: "DIPLOMAT-IN-0041",
      organization: "Ministry of Civil Aviation Delegation",
      airportCode: "HYD",
      terminal: "T1",
      authorizedZones: ["ZONE_A_PUBLIC", "ZONE_B_SECURITY", "ZONE_C_BOARDING", "ZONE_D_RAMP", "ZONE_E_ATC"],
      validFrom: new Date(now - 3600_000 * 4).toISOString(),
      validUntil: new Date(now + 3600_000 * 8).toISOString(),
      status: "ACTIVE",
      escortRequired: true,
      purpose: "New Terminal Pier C Inauguration Walkthrough",
      issuedBy: "Super Administrator",
      issuedById: "usr-super",
    },
    {
      passNumber: "GP-HYD-2026-000105",
      passType: "TEMPORARY_STAFF",
      holderName: "Meera Krishnan",
      idNumber: "IND-EMP-TMP-88",
      organization: "Bird Airport Ground Services",
      airportCode: "HYD",
      terminal: "T1",
      authorizedZones: ["ZONE_A_PUBLIC", "ZONE_B_SECURITY"],
      validFrom: new Date(now - 3600_000 * 12).toISOString(),
      validUntil: new Date(now - 3600_000 * 4).toISOString(),
      status: "EXPIRED",
      escortRequired: false,
      purpose: "Passenger queue marshal morning shift",
      issuedBy: "Ground Handling Supervisor",
      issuedById: "usr-opsmgr",
    },
    {
      passNumber: "GP-HYD-2026-000106",
      passType: "CONTRACTOR",
      holderName: "Sanjay Dutta",
      idNumber: "VOTER-ID-671049",
      organization: "Apex Fueling Systems",
      airportCode: "HYD",
      terminal: "T1",
      authorizedZones: ["ZONE_D_RAMP"],
      validFrom: new Date(now - 3600_000 * 8).toISOString(),
      validUntil: new Date(now + 3600_000 * 16).toISOString(),
      status: "REVOKED",
      escortRequired: false,
      purpose: "Ramp safety security credential revoked due to badge compliance audit",
      issuedBy: "Chief of Airside Security",
      issuedById: "usr-admin",
    },
  ];

  for (const seed of seedPasses) {
    const id = `gp-${Date.now()}-${seed.passNumber.slice(-4)}`;
    const qrCode = `AOCC-GP|ID:${seed.passNumber}|TYPE:${seed.passType}|ZONES:${seed.authorizedZones.join(",")}|EXP:${seed.validUntil}`;
    const passDTO: GatePassDTO = {
      ...seed,
      id,
      qrCode,
      createdAt: seed.validFrom,
      updatedAt: seed.validFrom,
      accessLogs: [],
    };
    memoryGatePasses.set(seed.passNumber, passDTO);
  }

  // Seed sample initial turnstile scans
  const sampleScans: TurnstileScanEntry[] = [
    {
      id: `scan-${Date.now() - 600_000}`,
      timestamp: new Date(now - 600_000).toISOString(),
      turnstileId: "TURNSTILE-01",
      turnstileName: "Turnstile T-01 Ramp Access",
      zone: "ZONE_D_RAMP",
      direction: "ENTRY",
      granted: true,
      reason: "Clearance verified for ZONE_D_RAMP",
      passNumber: "GP-HYD-2026-001001",
      holderName: "Capt. Rohit Verma",
      organization: "SkyConnect Flight Ops",
    },
    {
      id: `scan-${Date.now() - 420_000}`,
      timestamp: new Date(now - 420_000).toISOString(),
      turnstileId: "TURNSTILE-02",
      turnstileName: "Turnstile T-02 Boarding Pier",
      zone: "ZONE_C_BOARDING",
      direction: "ENTRY",
      granted: false,
      reason: "Access Denied: Zone ZONE_C_BOARDING is not authorized for this pass",
      passNumber: "GP-HYD-2026-001002",
      holderName: "Rajesh Kumar",
      organization: "Siemens Airport Automation & Baggage",
    },
    {
      id: `scan-${Date.now() - 180_000}`,
      timestamp: new Date(now - 180_000).toISOString(),
      turnstileId: "TURNSTILE-03",
      turnstileName: "Turnstile T-03 ATC Cab Security",
      zone: "ZONE_E_ATC",
      direction: "ENTRY",
      granted: true,
      reason: "Clearance verified for ZONE_E_ATC (Escort flagged)",
      passNumber: "GP-HYD-2026-001003",
      holderName: "Dr. Priya Nair",
      organization: "DGCA Air Safety Directorate",
    },
  ];

  for (const scan of sampleScans) {
    memoryTurnstileScans.push(scan);
    const pass = memoryGatePasses.get(scan.passNumber);
    if (pass) {
      pass.accessLogs.push(scan);
    }
  }
}

initSeedGatePasses();

export function generateGatePassNumber(airportCode = "HYD"): string {
  gatePassSequence += 1;
  const currentYear = new Date().getFullYear();
  const sequenceStr = String(gatePassSequence).padStart(6, "0");
  return `GP-${airportCode.toUpperCase()}-${currentYear}-${sequenceStr}`;
}

export function extractPassNumber(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("AOCC-GP|")) {
    const match = trimmed.match(/ID:([A-Z0-9-]+)/i);
    if (match) return match[1].toUpperCase();
  }
  return trimmed.toUpperCase();
}

export async function issueGatePass(
  input: CreateGatePassInput,
  actor?: { id?: string; name?: string }
): Promise<GatePassDTO> {
  initSeedGatePasses();

  const airportCode = (input.airportCode || "HYD").toUpperCase();
  const terminal = (input.terminal || "T1").toUpperCase();
  const durationHours = Math.max(1, Math.min(input.durationHours ?? 8, 168));
  const now = Date.now();
  const validFrom = new Date(now).toISOString();
  const validUntil = new Date(now + durationHours * 3600_000).toISOString();

  const passNumber = generateGatePassNumber(airportCode);
  const id = `gp-${now}-${passNumber.slice(-4)}`;
  const qrCode = `AOCC-GP|ID:${passNumber}|TYPE:${input.passType}|ZONES:${input.authorizedZones.join(",")}|EXP:${validUntil}`;

  const pass: GatePassDTO = {
    id,
    passNumber,
    passType: input.passType,
    holderName: input.holderName.trim(),
    idNumber: input.idNumber.trim().toUpperCase(),
    organization: input.organization.trim(),
    airportCode,
    terminal,
    authorizedZones: input.authorizedZones,
    validFrom,
    validUntil,
    status: "ACTIVE",
    escortRequired: Boolean(input.escortRequired),
    purpose: input.purpose.trim(),
    issuedBy: actor?.name || "Airside Security Officer",
    issuedById: actor?.id,
    qrCode,
    createdAt: validFrom,
    updatedAt: validFrom,
    accessLogs: [],
  };

  memoryGatePasses.set(passNumber, pass);

  await logAuditEvent({
    actorId: actor?.id,
    actorName: actor?.name,
    action: "GATE_PASS_ISSUED",
    entity: "GATE_PASS",
    entityId: passNumber,
    after: {
      passNumber,
      holderName: pass.holderName,
      passType: pass.passType,
      authorizedZones: pass.authorizedZones,
      validUntil,
    },
  });

  return pass;
}

export async function verifyGatePassAndScan(
  input: VerifyGatePassInput,
  officer?: { id?: string; name?: string }
): Promise<VerifyGatePassResult> {
  initSeedGatePasses();

  const passNumber = extractPassNumber(input.passNumberOrQr);
  const now = Date.now();
  const pass = memoryGatePasses.get(passNumber);
  const scanTime = new Date(now).toISOString();

  const scanId = `scan-${now}-${Math.random().toString(36).substring(2, 7)}`;

  if (!pass) {
    const scanEntry: TurnstileScanEntry = {
      id: scanId,
      timestamp: scanTime,
      turnstileId: input.turnstileId,
      turnstileName: input.turnstileName || `Turnstile ${input.turnstileId}`,
      zone: input.zone,
      direction: input.direction || "ENTRY",
      granted: false,
      reason: `Unknown gate pass number: "${passNumber}"`,
      passNumber,
      holderName: "UNKNOWN",
      organization: "UNREGISTERED",
      officerId: officer?.id,
    };
    memoryTurnstileScans.unshift(scanEntry);

    await logAuditEvent({
      actorId: officer?.id,
      actorName: officer?.name,
      action: "TURNSTILE_ACCESS_DENIED",
      entity: "TURNSTILE",
      entityId: input.turnstileId,
      after: { passNumber, zone: input.zone, reason: scanEntry.reason },
    });

    return { granted: false, reason: scanEntry.reason, scanEntry };
  }

  // 1. Check if pass was revoked
  if (pass.status === "REVOKED") {
    const scanEntry: TurnstileScanEntry = {
      id: scanId,
      timestamp: scanTime,
      turnstileId: input.turnstileId,
      turnstileName: input.turnstileName || `Turnstile ${input.turnstileId}`,
      zone: input.zone,
      direction: input.direction || "ENTRY",
      granted: false,
      reason: "Access Denied: Gate pass has been REVOKED by security.",
      passNumber: pass.passNumber,
      holderName: pass.holderName,
      organization: pass.organization,
      officerId: officer?.id,
    };
    pass.accessLogs.unshift(scanEntry);
    memoryTurnstileScans.unshift(scanEntry);

    await logAuditEvent({
      actorId: officer?.id,
      actorName: officer?.name,
      action: "TURNSTILE_ACCESS_DENIED",
      entity: "TURNSTILE",
      entityId: input.turnstileId,
      after: { passNumber: pass.passNumber, zone: input.zone, reason: scanEntry.reason },
    });

    return { granted: false, reason: scanEntry.reason, pass, scanEntry };
  }

  // 2. Check if pass has expired
  if (now > new Date(pass.validUntil).getTime()) {
    pass.status = "EXPIRED";
    pass.updatedAt = scanTime;

    const scanEntry: TurnstileScanEntry = {
      id: scanId,
      timestamp: scanTime,
      turnstileId: input.turnstileId,
      turnstileName: input.turnstileName || `Turnstile ${input.turnstileId}`,
      zone: input.zone,
      direction: input.direction || "ENTRY",
      granted: false,
      reason: `Access Denied: Gate pass EXPIRED at ${new Date(pass.validUntil).toLocaleTimeString()}.`,
      passNumber: pass.passNumber,
      holderName: pass.holderName,
      organization: pass.organization,
      officerId: officer?.id,
    };
    pass.accessLogs.unshift(scanEntry);
    memoryTurnstileScans.unshift(scanEntry);

    await logAuditEvent({
      actorId: officer?.id,
      actorName: officer?.name,
      action: "TURNSTILE_ACCESS_DENIED",
      entity: "TURNSTILE",
      entityId: input.turnstileId,
      after: { passNumber: pass.passNumber, zone: input.zone, reason: scanEntry.reason },
    });

    return { granted: false, reason: scanEntry.reason, pass, scanEntry };
  }

  // 3. Check zone authorization
  if (!pass.authorizedZones.includes(input.zone)) {
    const scanEntry: TurnstileScanEntry = {
      id: scanId,
      timestamp: scanTime,
      turnstileId: input.turnstileId,
      turnstileName: input.turnstileName || `Turnstile ${input.turnstileId}`,
      zone: input.zone,
      direction: input.direction || "ENTRY",
      granted: false,
      reason: `Access Denied: Not authorized for ${input.zone}. Permitted zones: ${pass.authorizedZones.join(", ")}.`,
      passNumber: pass.passNumber,
      holderName: pass.holderName,
      organization: pass.organization,
      officerId: officer?.id,
    };
    pass.accessLogs.unshift(scanEntry);
    memoryTurnstileScans.unshift(scanEntry);

    await logAuditEvent({
      actorId: officer?.id,
      actorName: officer?.name,
      action: "TURNSTILE_ACCESS_DENIED",
      entity: "TURNSTILE",
      entityId: input.turnstileId,
      after: { passNumber: pass.passNumber, zone: input.zone, reason: scanEntry.reason },
    });

    return { granted: false, reason: scanEntry.reason, pass, scanEntry };
  }

  // 4. Access Granted
  const grantReason = pass.escortRequired
    ? `Access Granted: Clearance verified for ${input.zone} (⚠️ ESCORT REQUIRED)`
    : `Access Granted: Clearance verified for ${input.zone}`;

  const scanEntry: TurnstileScanEntry = {
    id: scanId,
    timestamp: scanTime,
    turnstileId: input.turnstileId,
    turnstileName: input.turnstileName || `Turnstile ${input.turnstileId}`,
    zone: input.zone,
    direction: input.direction || "ENTRY",
    granted: true,
    reason: grantReason,
    passNumber: pass.passNumber,
    holderName: pass.holderName,
    organization: pass.organization,
    officerId: officer?.id,
  };

  pass.accessLogs.unshift(scanEntry);
  pass.updatedAt = scanTime;
  memoryTurnstileScans.unshift(scanEntry);

  await logAuditEvent({
    actorId: officer?.id,
    actorName: officer?.name,
    action: "TURNSTILE_ACCESS_GRANTED",
    entity: "TURNSTILE",
    entityId: input.turnstileId,
    after: {
      passNumber: pass.passNumber,
      holderName: pass.holderName,
      zone: input.zone,
      turnstile: input.turnstileId,
    },
  });

  return { granted: true, reason: grantReason, pass, scanEntry };
}

export async function revokeGatePass(
  passNumber: string,
  reason: string,
  officer?: { id?: string; name?: string }
): Promise<{ ok: boolean; message: string; pass?: GatePassDTO }> {
  initSeedGatePasses();

  const canonicalPassNumber = extractPassNumber(passNumber);
  const pass = memoryGatePasses.get(canonicalPassNumber);

  if (!pass) {
    return { ok: false, message: `Gate pass "${canonicalPassNumber}" not found.` };
  }

  const beforeStatus = pass.status;
  pass.status = "REVOKED";
  pass.updatedAt = new Date().toISOString();

  await logAuditEvent({
    actorId: officer?.id,
    actorName: officer?.name,
    action: "GATE_PASS_REVOKED",
    entity: "GATE_PASS",
    entityId: canonicalPassNumber,
    before: { status: beforeStatus },
    after: { status: "REVOKED", reason },
  });

  return {
    ok: true,
    message: `Gate pass ${canonicalPassNumber} successfully revoked.`,
    pass,
  };
}

export async function listGatePasses(filters?: {
  airportCode?: string;
  status?: string;
  passType?: string;
  search?: string;
}): Promise<GatePassDTO[]> {
  initSeedGatePasses();

  let passes = Array.from(memoryGatePasses.values());

  if (filters?.airportCode) {
    const code = filters.airportCode.toUpperCase();
    passes = passes.filter((p) => p.airportCode === code);
  }

  if (filters?.status) {
    passes = passes.filter((p) => p.status === filters.status);
  }

  if (filters?.passType) {
    passes = passes.filter((p) => p.passType === filters.passType);
  }

  if (filters?.search) {
    const q = filters.search.toLowerCase().trim();
    passes = passes.filter(
      (p) =>
        p.passNumber.toLowerCase().includes(q) ||
        p.holderName.toLowerCase().includes(q) ||
        p.organization.toLowerCase().includes(q) ||
        p.idNumber.toLowerCase().includes(q)
    );
  }

  // Sort newest first
  return passes.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getGatePassByNumber(passNumber: string): Promise<GatePassDTO | null> {
  initSeedGatePasses();
  return memoryGatePasses.get(extractPassNumber(passNumber)) || null;
}

export async function getRecentTurnstileScans(limit = 20): Promise<TurnstileScanEntry[]> {
  initSeedGatePasses();
  return memoryTurnstileScans.slice(0, limit);
}

export async function getGatePassKPIs(airportCode?: string) {
  initSeedGatePasses();

  let passes = Array.from(memoryGatePasses.values());
  if (airportCode) {
    passes = passes.filter((p) => p.airportCode === airportCode.toUpperCase());
  }

  const activePasses = passes.filter((p) => p.status === "ACTIVE");
  const rampAirsidePasses = activePasses.filter((p) =>
    p.authorizedZones.includes("ZONE_D_RAMP")
  );

  const scans = memoryTurnstileScans;
  const grantedCount = scans.filter((s) => s.granted).length;
  const deniedCount = scans.filter((s) => !s.granted).length;

  return {
    totalPasses: passes.length,
    activePasses: activePasses.length,
    rampAirsidePasses: rampAirsidePasses.length,
    turnstileGrantedScans: grantedCount,
    turnstileDeniedScans: deniedCount,
    recentScansCount: scans.length,
  };
}
