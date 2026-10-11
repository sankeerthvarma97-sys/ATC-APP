import { describe, expect, it } from "vitest";
import { fetchStationMetar } from "@/lib/services/weather-service";
import { listAirports, createAirport, listGates, updateGateStatus } from "@/lib/services/fleet-service";

describe("AOCC Station Intelligence, METAR Weather & Resource Persistence", () => {
  describe("Aviation Weather & METAR Decoding Engine", () => {
    it("successfully decodes METAR for Hyderabad Begumpet / RGIA (HYD)", async () => {
      const metar = await fetchStationMetar("HYD");

      expect(metar).toBeDefined();
      expect(metar.station).toBe("HYD");
      expect(typeof metar.raw).toBe("string");
      expect(metar.raw.length).toBeGreaterThan(10);
      expect(["VFR", "MVFR", "IFR", "LIFR"]).toContain(metar.flightCategory);
      expect(metar.wind).toBeDefined();
      expect(metar.wind.direction).toBeGreaterThanOrEqual(0);
      expect(metar.wind.direction).toBeLessThanOrEqual(360);
      expect(metar.wind.speed).toBeGreaterThanOrEqual(0);
      expect(metar.visibilityMeters).toBeGreaterThan(0);
      expect(metar.altimeterHpa).toBeGreaterThan(900);
      expect(metar.altimeterHpa).toBeLessThan(1100);
    });

    it("computes runway crosswind and headwind analysis for known stations", async () => {
      const metar = await fetchStationMetar("BOM");

      expect(metar).toBeDefined();
      expect(metar.station).toBe("BOM");
      expect(Array.isArray(metar.runwayAnalysis)).toBe(true);
      expect(metar.runwayAnalysis.length).toBeGreaterThan(0);

      const rwy = metar.runwayAnalysis[0];
      expect(rwy).toHaveProperty("runwayId");
      expect(rwy).toHaveProperty("headwindKt");
      expect(rwy).toHaveProperty("crosswindKt");
      expect(["LEFT", "RIGHT", "DIRECT"]).toContain(rwy.crosswindDir);
    });

    it("falls back reliably for foreign international stations (JFK)", async () => {
      const metar = await fetchStationMetar("JFK");

      expect(metar).toBeDefined();
      expect(metar.station).toBe("JFK");
      expect(metar.altimeterInHg).toBeGreaterThan(28);
      expect(metar.altimeterInHg).toBeLessThan(32);
    });
  });

  describe("Aerodrome Registry & Simulation Grid", () => {
    it("returns authoritative list of registered airports with valid coordinates", async () => {
      const airports = await listAirports();

      expect(airports.length).toBeGreaterThanOrEqual(14);
      const hyd = airports.find((a) => a.iata === "HYD");
      expect(hyd).toBeDefined();
      expect(hyd?.icao).toBe("VOHS");
      expect(hyd?.city).toBe("Hyderabad");
      expect(hyd?.country).toBe("India");
      expect(hyd?.elevationFt).toBeGreaterThan(0);
      expect(hyd?.latitude).toBeCloseTo(17.24, 1);
      expect(hyd?.longitude).toBeCloseTo(78.42, 1);
    });

    it("allows registering a new aerodrome in the simulation network", async () => {
      const testCode = `T${Math.floor(Math.random() * 89 + 10)}`;
      const newAirport = await createAirport({
        iata: testCode,
        icao: `VO${testCode}`,
        name: `Test Aerodrome ${testCode}`,
        city: "Test City",
        country: "India",
        latitude: 15.5,
        longitude: 75.5,
        elevationFt: 500,
        status: "ACTIVE",
      });

      expect(newAirport).toBeDefined();
      expect(newAirport.iata).toBe(testCode);

      const all = await listAirports();
      expect(all.some((a) => a.iata === testCode)).toBe(true);
    });
  });

  describe("Gate Stands & Resource Persistence", () => {
    it("lists default airport gates and permits status toggling", async () => {
      const gates = await listGates();
      expect(gates.length).toBeGreaterThan(0);

      const gate = gates[0];
      const initialStatus = gate.status;
      const targetStatus = initialStatus === "AVAILABLE" ? "OCCUPIED" : "AVAILABLE";

      const updated = await updateGateStatus(gate.id, targetStatus);
      expect(updated).toBeDefined();
      expect(updated?.status).toBe(targetStatus);

      // Restore initial status
      await updateGateStatus(gate.id, initialStatus);
    });
  });

  describe("Commercial Fleet Aircraft Register", () => {
    it("permits updating aircraft maintenance status", async () => {
      const { listAircraft, updateAircraftStatus } = await import("@/lib/services/fleet-service");
      const fleet = await listAircraft();
      expect(fleet.length).toBeGreaterThan(0);

      const ac = fleet[0];
      const updated = await updateAircraftStatus(ac.registration, "MAINTENANCE");
      expect(updated).toBeDefined();
      expect(updated?.status).toBe("MAINTENANCE");

      // Restore status
      await updateAircraftStatus(ac.registration, ac.status);
    });
  });

  describe("Tactical Crisis Response & Distress Squawk Management", () => {
    it("updates flight emergency status and transponder squawk with runway isolation", async () => {
      const { updateFlightStatus } = await import("@/lib/services/flight-service");
      const flightId = "flt-sc101";

      const updated = await updateFlightStatus(
        flightId,
        "EMERGENCY",
        {
          squawk: "7700",
          runway: "09L",
          phase: "Emergency Rollout Active",
        },
        { id: "crisis-admin", name: "Crisis Command" }
      );

      expect(updated).toBeDefined();
      expect(updated?.status).toBe("EMERGENCY");
      expect(updated?.squawk).toBe("7700");
      expect(updated?.runway).toBe("09L");
      expect(updated?.phase).toBe("Emergency Rollout Active");

      // Resolve back to normal
      const resolved = await updateFlightStatus(
        flightId,
        "SCHEDULED",
        {
          squawk: "1200",
          phase: "Pre-flight boarding preparation",
        },
        { id: "crisis-admin", name: "Crisis Command" }
      );

      expect(resolved).toBeDefined();
      expect(resolved?.status).toBe("SCHEDULED");
      expect(resolved?.squawk).toBe("1200");
    });
  });
});
