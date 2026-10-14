import { describe, expect, it } from "vitest";
import {
  generateGatePassNumber,
  extractPassNumber,
  issueGatePass,
  verifyGatePassAndScan,
  revokeGatePass,
  listGatePasses,
  getGatePassKPIs,
} from "../src/lib/services/gate-pass-service";

describe("AOCC Gate Pass & Airside Turnstile Security Subsystem", () => {
  it("generates collision-resistant canonical gate pass IDs", () => {
    const id1 = generateGatePassNumber("HYD");
    const id2 = generateGatePassNumber("HYD");
    const id3 = generateGatePassNumber("BOM");

    expect(id1).toMatch(/^GP-HYD-\d{4}-\d{6}$/);
    expect(id2).toMatch(/^GP-HYD-\d{4}-\d{6}$/);
    expect(id3).toMatch(/^GP-BOM-\d{4}-\d{6}$/);
    expect(id1).not.toBe(id2);
  });

  it("extracts pass numbers from raw strings and QR payloads", () => {
    expect(extractPassNumber("GP-HYD-2026-001001")).toBe("GP-HYD-2026-001001");
    expect(extractPassNumber("  gp-hyd-2026-001001  ")).toBe("GP-HYD-2026-001001");
    expect(
      extractPassNumber("AOCC-GP|ID:GP-HYD-2026-001001|TYPE:CREW|ZONES:ZONE_D_RAMP|EXP:2026-10-12T00:00:00Z")
    ).toBe("GP-HYD-2026-001001");
  });

  it("issues a new gate pass with correct expiration, QR payload, and security zones", async () => {
    const pass = await issueGatePass(
      {
        holderName: "Deepak Varma",
        idNumber: "IND-PASS-49219",
        passType: "CONTRACTOR",
        organization: "Jet Aviation Ground Support",
        airportCode: "HYD",
        terminal: "T1",
        authorizedZones: ["ZONE_A_PUBLIC", "ZONE_D_RAMP"],
        durationHours: 12,
        escortRequired: true,
        purpose: "Aircraft towing gear inspection",
      },
      { id: "usr-admin", name: "Security Chief" }
    );

    expect(pass.passNumber).toMatch(/^GP-HYD-\d{4}-\d{6}$/);
    expect(pass.status).toBe("ACTIVE");
    expect(pass.authorizedZones).toEqual(["ZONE_A_PUBLIC", "ZONE_D_RAMP"]);
    expect(pass.escortRequired).toBe(true);
    expect(pass.qrCode).toContain(`ID:${pass.passNumber}`);
    expect(pass.qrCode).toContain("TYPE:CONTRACTOR");

    const validFromTime = new Date(pass.validFrom).getTime();
    const validUntilTime = new Date(pass.validUntil).getTime();
    expect(validUntilTime - validFromTime).toBe(12 * 3600_000);
  });

  it("allows access when scanning at an authorized zone turnstile", async () => {
    const pass = await issueGatePass(
      {
        holderName: "Kavita Rao",
        idNumber: "CREW-7712",
        passType: "CREW",
        organization: "Vistara Ops",
        airportCode: "HYD",
        authorizedZones: ["ZONE_C_BOARDING", "ZONE_D_RAMP"],
        durationHours: 24,
        purpose: "Crew pre-flight preparation",
      },
      { id: "usr-admin", name: "Security Chief" }
    );

    const scanResult = await verifyGatePassAndScan({
      passNumberOrQr: pass.passNumber,
      turnstileId: "TURNSTILE-01",
      turnstileName: "Turnstile T-01 Ramp Access",
      zone: "ZONE_D_RAMP",
      direction: "ENTRY",
    });

    expect(scanResult.granted).toBe(true);
    expect(scanResult.reason).toContain("Access Granted");
    expect(scanResult.pass?.passNumber).toBe(pass.passNumber);
    expect(scanResult.scanEntry.granted).toBe(true);
    expect(scanResult.scanEntry.zone).toBe("ZONE_D_RAMP");
  });

  it("denies turnstile access when pass lacks zone clearance", async () => {
    const pass = await issueGatePass(
      {
        holderName: "Nitin Seth",
        idNumber: "VISITOR-901",
        passType: "VISITOR",
        organization: "Terminal Retail Concessions",
        airportCode: "HYD",
        authorizedZones: ["ZONE_A_PUBLIC"], // Only Public zone
        durationHours: 8,
        purpose: "Food court inspection",
      },
      { id: "usr-admin", name: "Security Chief" }
    );

    const scanResult = await verifyGatePassAndScan({
      passNumberOrQr: pass.passNumber,
      turnstileId: "TURNSTILE-03",
      turnstileName: "Turnstile T-03 ATC Cab Security",
      zone: "ZONE_E_ATC", // ATC Tower access attempt
      direction: "ENTRY",
    });

    expect(scanResult.granted).toBe(false);
    expect(scanResult.reason).toContain("Access Denied: Not authorized for ZONE_E_ATC");
    expect(scanResult.scanEntry.granted).toBe(false);
  });

  it("denies turnstile access for expired gate passes", async () => {
    // Seed pass GP-HYD-2026-000105 is pre-expired in seed data
    const scanResult = await verifyGatePassAndScan({
      passNumberOrQr: "GP-HYD-2026-000105",
      turnstileId: "TURNSTILE-02",
      turnstileName: "Turnstile T-02 Boarding Pier",
      zone: "ZONE_B_SECURITY",
      direction: "ENTRY",
    });

    expect(scanResult.granted).toBe(false);
    expect(scanResult.reason).toContain("EXPIRED");
  });

  it("revokes gate passes and strictly enforces revocation at all turnstiles", async () => {
    const pass = await issueGatePass(
      {
        holderName: "Tarun Bajaj",
        idNumber: "IND-CONT-552",
        passType: "CONTRACTOR",
        organization: "Ground HVAC",
        airportCode: "HYD",
        authorizedZones: ["ZONE_D_RAMP"],
        durationHours: 24,
        purpose: "Chiller maintenance",
      },
      { id: "usr-admin", name: "Security Chief" }
    );

    // Revoke the pass
    const revokeResult = await revokeGatePass(pass.passNumber, "Safety violation on taxiway apron", {
      id: "usr-admin",
      name: "Security Officer",
    });

    expect(revokeResult.ok).toBe(true);
    expect(revokeResult.pass?.status).toBe("REVOKED");

    // Scan revoked pass
    const scanResult = await verifyGatePassAndScan({
      passNumberOrQr: pass.passNumber,
      turnstileId: "TURNSTILE-01",
      zone: "ZONE_D_RAMP",
      direction: "ENTRY",
    });

    expect(scanResult.granted).toBe(false);
    expect(scanResult.reason).toContain("REVOKED");
  });

  it("returns KPI summary metrics accurately", async () => {
    const kpis = await getGatePassKPIs("HYD");

    expect(kpis.totalPasses).toBeGreaterThanOrEqual(4);
    expect(kpis.activePasses).toBeGreaterThanOrEqual(1);
    expect(kpis.rampAirsidePasses).toBeGreaterThanOrEqual(1);
    expect(kpis.turnstileGrantedScans).toBeGreaterThanOrEqual(1);
  });

  it("filters passes by search keyword, airport, and status", async () => {
    const allHyd = await listGatePasses({ airportCode: "HYD" });
    expect(allHyd.length).toBeGreaterThan(0);

    const rohitMatches = await listGatePasses({ search: "Rohit" });
    expect(rohitMatches.some((p) => p.holderName.includes("Rohit"))).toBe(true);
  });
});
