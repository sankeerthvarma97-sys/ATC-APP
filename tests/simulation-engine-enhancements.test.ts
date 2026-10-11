import { describe, expect, it } from "vitest";
import {
  getWakeCategory,
  getRequiredWakeSeparationNm,
  getRushHourMultiplier,
  calculateDistanceNm,
  advanceFlights,
} from "@/lib/simulation/logic";
import { createInitialFlights } from "@/lib/data/mock";
import type { FlightDTO } from "@/lib/domain";

describe("Simulation Engine Enhancements: Wake Turbulence, Rush Hours & Diversions", () => {
  it("categorizes aircraft into correct ICAO wake turbulence classes", () => {
    expect(getWakeCategory("Boeing 787-9")).toBe("HEAVY");
    expect(getWakeCategory("Airbus A350-900")).toBe("HEAVY");
    expect(getWakeCategory("Airbus A380")).toBe("HEAVY");
    expect(getWakeCategory("Airbus A320neo")).toBe("MEDIUM");
    expect(getWakeCategory("Boeing 737-800")).toBe("MEDIUM");
    expect(getWakeCategory("ATR 72-600")).toBe("LIGHT");
    expect(getWakeCategory("Cessna 172")).toBe("LIGHT");
  });

  it("calculates accurate ICAO wake turbulence separation minimums", () => {
    // HEAVY leader
    expect(getRequiredWakeSeparationNm("HEAVY", "HEAVY")).toBe(4.0);
    expect(getRequiredWakeSeparationNm("HEAVY", "MEDIUM")).toBe(5.0);
    expect(getRequiredWakeSeparationNm("HEAVY", "LIGHT")).toBe(6.0);

    // MEDIUM leader
    expect(getRequiredWakeSeparationNm("MEDIUM", "LIGHT")).toBe(5.0);
    expect(getRequiredWakeSeparationNm("MEDIUM", "MEDIUM")).toBe(3.0);

    // Standard radar
    expect(getRequiredWakeSeparationNm("LIGHT", "LIGHT")).toBe(3.0);
  });

  it("evaluates time-of-day rush hour multipliers across operational periods", () => {
    // Morning rush (08:30 IST)
    const morning = getRushHourMultiplier(8.5);
    expect(morning.isPeak).toBe(true);
    expect(morning.multiplier).toBeGreaterThanOrEqual(1.5);

    // Evening rush (18:00 IST)
    const evening = getRushHourMultiplier(18);
    expect(evening.isPeak).toBe(true);
    expect(evening.multiplier).toBeGreaterThanOrEqual(1.7);

    // Overnight window (03:00 IST)
    const night = getRushHourMultiplier(3);
    expect(night.isPeak).toBe(false);
    expect(night.multiplier).toBeLessThan(1.0);
  });

  it("calculates spherical planar distance in nautical miles", () => {
    // Points separated by ~1 degree latitude is ~60 NM
    const dist = calculateDistanceNm(17.24, 78.43, 18.24, 78.43);
    expect(Math.round(dist)).toBe(60);
  });

  it("enforces wake turbulence speed regulation on trailing aircraft", () => {
    const leader: FlightDTO = {
      ...createInitialFlights()[0],
      id: "flt-leader",
      callsign: "AV-787",
      aircraftType: "Boeing 787-9", // HEAVY
      status: "APPROACH",
      runway: "09L",
      latitude: 17.240,
      longitude: 78.430,
      altitudeFt: 2500,
      speedKt: 160,
    };

    const follower: FlightDTO = {
      ...createInitialFlights()[1],
      id: "flt-follower",
      callsign: "SC-320",
      aircraftType: "Airbus A320neo", // MEDIUM (needs 5NM behind HEAVY)
      status: "APPROACH",
      runway: "09L",
      latitude: 17.280, // ~2.4 NM away (< 5.0 NM)
      longitude: 78.430,
      altitudeFt: 3000,
      speedKt: 180,
    };

    const result = advanceFlights([leader, follower], 5000);
    const regulatedFollower = result.find((f) => f.id === "flt-follower");

    expect(regulatedFollower?.speedKt).toBeLessThan(180);
    expect(regulatedFollower?.phase).toContain("Wake vortex spacing active");
  });

  it("triggers dynamic diversion protocol for flights under severe convective stress and low fuel", () => {
    const stormStressedFlight: FlightDTO = {
      ...createInitialFlights()[0],
      id: "flt-stressed",
      callsign: "IS-101",
      status: "HOLDING",
      fuelKg: 1200, // Below minimum 1600kg reserve
      riskScore: 96,
      destination: "HYD",
    };

    const result = advanceFlights([stormStressedFlight], 5000);
    const divertedFlight = result.find((f) => f.id === "flt-stressed");

    expect(divertedFlight?.status).toBe("DIVERTED");
    expect(divertedFlight?.destination).toBe("BOM");
    expect(divertedFlight?.phase).toContain("Diverting to alternate airfield");
  });
});
