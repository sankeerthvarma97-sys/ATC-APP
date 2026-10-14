import { describe, expect, it } from "vitest";
import { createInitialFlights } from "@/lib/data/mock";
import type { FlightDTO } from "@/lib/domain";

// Pure logic mirror to test ILS & TCAS math
function evaluateIlsDeviation(heading: number, runwayHeading: number, vspeed: number) {
  const headingError = ((heading - runwayHeading + 180) % 360) - 180;
  const locDots = Math.max(-2.5, Math.min(2.5, headingError / 5));
  const targetVs = -750;
  const vsError = vspeed - targetVs;
  const gsDots = Math.max(-2.5, Math.min(2.5, vsError / 300));

  return {
    locDots,
    gsDots,
    locCaptured: Math.abs(locDots) < 1.2,
    gsCaptured: Math.abs(gsDots) < 1.2,
  };
}

function evaluateTcasThreat(
  current: { lat: number; lon: number; alt: number },
  traffic: { lat: number; lon: number; alt: number },
) {
  const dLat = (traffic.lat - current.lat) * 60;
  const dLon = (traffic.lon - current.lon) * 60 * Math.cos(((current.lat + traffic.lat) / 2) * (Math.PI / 180));
  const distNm = Math.sqrt(dLat * dLat + dLon * dLon);
  const altDelta = traffic.alt - current.alt;
  const absAltDelta = Math.abs(altDelta);

  if (distNm < 3.5 && absAltDelta < 900) {
    const shouldClimb = altDelta <= 0;
    return {
      level: "RA",
      distNm,
      altDelta,
      action: shouldClimb ? "CLIMB" : "DESCEND",
    };
  }

  if (distNm < 6.0 && absAltDelta < 1500) {
    return {
      level: "TA",
      distNm,
      altDelta,
      action: "MONITOR",
    };
  }

  return {
    level: "CLEAR",
    distNm,
    altDelta,
    action: "NONE",
  };
}

describe("Cockpit PFD Avionics: ILS Localizer/Glideslope & TCAS II Advisory Engine", () => {
  it("computes aligned localizer and glideslope on standard final approach", () => {
    // Exact runway 092 alignment, -750 FPM standard glide path
    const ils = evaluateIlsDeviation(92, 92, -750);
    expect(ils.locDots).toBe(0);
    expect(ils.gsDots).toBe(0);
    expect(ils.locCaptured).toBe(true);
    expect(ils.gsCaptured).toBe(true);
  });

  it("detects localizer lateral deviation when off centerline", () => {
    // 10 degrees right of runway heading 092 (102 deg)
    const ils = evaluateIlsDeviation(102, 92, -750);
    expect(ils.locDots).toBe(2.0); // 2 dots deviation
    expect(ils.locCaptured).toBe(false);
  });

  it("detects glideslope vertical deviation when high on approach", () => {
    // Descending at only -150 FPM instead of -750 FPM (staying high)
    const ils = evaluateIlsDeviation(92, 92, -150);
    expect(ils.gsDots).toBe(2.0); // 2 dots fly-down required
    expect(ils.gsCaptured).toBe(false);
  });

  it("triggers Resolution Advisory (RA) and assigns correct climb avoidance vector", () => {
    const ownship = { lat: 17.240, lon: 78.430, alt: 3000 };
    // Traffic 1.8 NM away and 300 ft below (alt 2700)
    const intruderBelow = { lat: 17.270, lon: 78.430, alt: 2700 };

    const tcas = evaluateTcasThreat(ownship, intruderBelow);
    expect(tcas.level).toBe("RA");
    expect(tcas.action).toBe("CLIMB"); // Intruder below -> CLIMB
  });

  it("triggers Resolution Advisory (RA) and assigns correct descend avoidance vector", () => {
    const ownship = { lat: 17.240, lon: 78.430, alt: 3000 };
    // Traffic 1.8 NM away and 400 ft above (alt 3400)
    const intruderAbove = { lat: 17.270, lon: 78.430, alt: 3400 };

    const tcas = evaluateTcasThreat(ownship, intruderAbove);
    expect(tcas.level).toBe("RA");
    expect(tcas.action).toBe("DESCEND"); // Intruder above -> DESCEND
  });

  it("triggers Traffic Advisory (TA) when within surveillance volume but outside RA threshold", () => {
    const ownship = { lat: 17.240, lon: 78.430, alt: 12000 };
    // Traffic 4.8 NM away and 1100 ft delta
    const trafficInArea = { lat: 17.320, lon: 78.430, alt: 13100 };

    const tcas = evaluateTcasThreat(ownship, trafficInArea);
    expect(tcas.level).toBe("TA");
    expect(tcas.action).toBe("MONITOR");
  });

  it("returns CLEAR when aircraft have adequate lateral or vertical separation", () => {
    const ownship = { lat: 17.240, lon: 78.430, alt: 30000 };
    // Traffic 25 NM away and 8000 ft separation
    const distantTraffic = { lat: 17.650, lon: 78.430, alt: 38000 };

    const tcas = evaluateTcasThreat(ownship, distantTraffic);
    expect(tcas.level).toBe("CLEAR");
  });
});
