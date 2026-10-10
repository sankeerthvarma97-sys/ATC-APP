import { describe, expect, it } from "vitest";
import { createFlight } from "@/lib/services/flight-service";

describe("Flight Creation Audit & Conflict Tests", () => {
  it("creates a valid flight successfully", async () => {
    const flightInput = {
      flightName: "SkyConnect Test 701",
      flightNumber: "SC701",
      airline: "SkyConnect Airlines",
      aircraftType: "Airbus A320neo",
      origin: "HYD",
      destination: "BOM",
      departureTime: new Date(Date.now() + 10000000).toISOString(),
      arrivalTime: new Date(Date.now() + 15400000).toISOString(),
      gate: "B12",
      runway: "09L",
      terminal: "T1",
      economyCapacity: 150,
      businessCapacity: 20,
    };

    const f1 = await createFlight(flightInput);
    expect(f1).toBeDefined();
    expect(f1.flightNumber).toBe("SC701");
    expect(f1.status).toBe("SCHEDULED");
  });

  it("rejects duplicate flight creation with identical schedule", async () => {
    const flightInput = {
      flightName: "Duplicate Test 702",
      flightNumber: "SC702",
      airline: "SkyConnect Airlines",
      aircraftType: "Airbus A320neo",
      origin: "HYD",
      destination: "DEL",
      departureTime: new Date(Date.now() + 20000000).toISOString(),
      arrivalTime: new Date(Date.now() + 26000000).toISOString(),
      gate: "A4",
      runway: "09L",
      terminal: "T1",
    };

    const f1 = await createFlight(flightInput);
    expect(f1).toBeDefined();

    // Attempting to create duplicate should throw Conflict error
    await expect(createFlight(flightInput)).rejects.toThrow(/Conflict:/);
  });

  it("rejects flight with arrival time earlier than departure time", async () => {
    const invalidFlight = {
      flightName: "Invalid Time Flight",
      flightNumber: "SC703",
      airline: "SkyConnect Airlines",
      aircraftType: "Airbus A320neo",
      origin: "HYD",
      destination: "DEL",
      departureTime: new Date(Date.now() + 20000000).toISOString(),
      arrivalTime: new Date(Date.now() + 10000000).toISOString(), // earlier!
    };

    await expect(createFlight(invalidFlight)).rejects.toThrow(/arrivalTime must be later than departureTime/);
  });

  it("rejects flight where origin equals destination", async () => {
    const invalidRoute = {
      flightName: "Circular Flight",
      flightNumber: "SC704",
      airline: "SkyConnect Airlines",
      aircraftType: "Airbus A320neo",
      origin: "HYD",
      destination: "HYD",
      departureTime: new Date(Date.now() + 30000000).toISOString(),
      arrivalTime: new Date(Date.now() + 36000000).toISOString(),
    };

    await expect(createFlight(invalidRoute)).rejects.toThrow(/cannot be identical/);
  });

  it("rejects international routes on the server in domestic-only mode", async () => {
    const internationalFlight = {
      flightName: "International Route Test",
      flightNumber: "SC705",
      airline: "SkyConnect Airlines",
      aircraftType: "Airbus A320neo",
      origin: "HYD",
      destination: "DXB",
      departureTime: new Date(Date.now() + 40000000).toISOString(),
      arrivalTime: new Date(Date.now() + 50000000).toISOString(),
    };

    await expect(createFlight(internationalFlight)).rejects.toThrow(/International routes are disabled/);
  });

  it("accepts an Indian airport added to the domestic airport catalog", async () => {
    const flight = await createFlight({
      flightName: "Hyderabad to Lucknow Test",
      flightNumber: "SC706",
      airline: "SkyConnect Airlines",
      aircraftType: "Airbus A320neo",
      origin: "HYD",
      destination: "LKO",
      departureTime: new Date(Date.now() + 60000000).toISOString(),
      arrivalTime: new Date(Date.now() + 70000000).toISOString(),
    });

    expect(flight.destination).toBe("LKO");
  });
});
