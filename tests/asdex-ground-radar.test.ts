import { describe, expect, it } from "vitest";

interface RunwaySafetyArea {
  rwy: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

const HYD_RSA: RunwaySafetyArea = {
  rwy: "09L/27R",
  xMin: 45,
  xMax: 55,
  yMin: 45,
  yMax: 55,
};

function evaluateIncursionRisk(
  groundTarget: { callsign: string; x: number; y: number; status: string },
  approachTraffic: { callsign: string; rwy: string; distanceNm: number },
  rsa = HYD_RSA,
) {
  const isInsideRsa =
    groundTarget.x >= rsa.xMin &&
    groundTarget.x <= rsa.xMax &&
    groundTarget.y >= rsa.yMin &&
    groundTarget.y <= rsa.yMax;

  if (isInsideRsa && approachTraffic.distanceNm < 3.0) {
    return {
      incursion: true,
      severity: "CRITICAL",
      intruder: groundTarget.callsign,
      landingTraffic: approachTraffic.callsign,
      resolution: "COMMAND_GO_AROUND",
    };
  }

  return {
    incursion: false,
    severity: "NONE",
    intruder: null,
    landingTraffic: null,
    resolution: "CONTINUE_APPROACH",
  };
}

describe("ASDE-X Surface Movement Radar: Incursion Detection & Protection Zone", () => {
  it("detects critical runway incursion when target enters Runway Safety Area during final approach", () => {
    // Aircraft taxiing past hold short line into RSA (x: 52, y: 48)
    const intruder = { callsign: "AV245", x: 52, y: 48, status: "LINEUP_WAIT" };
    // Aircraft on short final (1.4 NM out)
    const landing = { callsign: "BH310", rwy: "09L", distanceNm: 1.4 };

    const result = evaluateIncursionRisk(intruder, landing);
    expect(result.incursion).toBe(true);
    expect(result.severity).toBe("CRITICAL");
    expect(result.intruder).toBe("AV245");
    expect(result.landingTraffic).toBe("BH310");
    expect(result.resolution).toBe("COMMAND_GO_AROUND");
  });

  it("permits nominal operations when ground target is safely holding short", () => {
    // Aircraft safely holding short behind hold bar (x: 42, y: 62)
    const holdingTarget = { callsign: "SC101", x: 42, y: 62, status: "HOLDING_SHORT" };
    const landing = { callsign: "BH310", rwy: "09L", distanceNm: 1.4 };

    const result = evaluateIncursionRisk(holdingTarget, landing);
    expect(result.incursion).toBe(false);
    expect(result.resolution).toBe("CONTINUE_APPROACH");
  });

  it("handles lineup and wait safely when no approach traffic is within critical window", () => {
    const liningUpTarget = { callsign: "IS101", x: 50, y: 50, status: "LINEUP_WAIT" };
    // Inbound traffic still 12 NM away
    const distantTraffic = { callsign: "NV404", rwy: "09L", distanceNm: 12.0 };

    const result = evaluateIncursionRisk(liningUpTarget, distantTraffic);
    expect(result.incursion).toBe(false);
  });
});
