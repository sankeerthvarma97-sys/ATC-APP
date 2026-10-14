import { describe, expect, it } from "vitest";
import {
  listBaggage,
  getBaggageByTag,
  scanBaggageBarcode,
  updateBaggageStatus,
  listUlds,
  packBagIntoUld,
  updateUldStatus,
  listCarousels,
  assignFlightToCarousel,
  verifyBaggagePnr,
  acceptBaggageForPnr,
} from "@/lib/services/baggage-service";
import { memoryBookings } from "@/lib/services/booking-service";

describe("AOCC Baggage Handling System (BHS) & Sortation Center", () => {
  describe("Baggage Manifest & Optical Barcode Reconciliation", () => {
    it("returns active baggage manifest with valid IATA tag numbers and flight routing", async () => {
      const bags = await listBaggage();

      expect(bags.length).toBeGreaterThanOrEqual(4);
      const bag = bags[0];
      expect(bag).toHaveProperty("tagNumber");
      expect(bag.tagNumber).toMatch(/^BAG-/);
      expect(bag).toHaveProperty("pnr");
      expect(bag).toHaveProperty("passengerName");
      expect(bag).toHaveProperty("weightKg");
      expect(bag.weightKg).toBeGreaterThan(0);
      expect(["FIRST", "BUSINESS", "ECONOMY"]).toContain(bag.classType);
      expect(["CLEARED", "LEVEL_2_INSPECTION", "SUSPECT", "PENDING"]).toContain(bag.edsStatus);
    });

    it("retrieves a specific baggage item by either tag number or PNR", async () => {
      const bag = await getBaggageByTag("BAG-SC101-0841");
      expect(bag).toBeDefined();
      expect(bag?.pnr).toBe("SC7K92P");
      expect(bag?.passengerName).toBe("Rahul Varma");
      expect(bag?.flightNumber).toBe("SC101");

      const byPnr = await getBaggageByTag("SC7K92P");
      expect(byPnr).toBeDefined();
      expect(byPnr?.tagNumber).toBe("BAG-SC101-0841");
    });

    it("scans baggage barcode and returns optical reconciliation match", async () => {
      const scan = await scanBaggageBarcode("BAG-AV201-1904", { id: "agent-1", name: "Ramp Agent" });
      expect(scan.ok).toBe(true);
      expect(scan.item).toBeDefined();
      expect(scan.item?.passengerName).toBe("Ananya Desai");
      expect(scan.item?.flightNumber).toBe("AV201");

      const invalidScan = await scanBaggageBarcode("NON-EXISTENT-TAG");
      expect(invalidScan.ok).toBe(false);
      expect(invalidScan.item).toBeUndefined();
    });
  });

  describe("EDS Multi-Level Explosive Detection Security", () => {
    it("permits clearing Level 2 inspection by authorized security personnel", async () => {
      const tag = "BAG-SEC-9912";
      const before = await getBaggageByTag(tag);
      expect(before?.edsStatus).toBe("LEVEL_2_INSPECTION");

      const updated = await updateBaggageStatus(
        tag,
        { edsStatus: "CLEARED", securityNotes: "Manual CT slice verified safe." },
        { id: "sec-officer", name: "Chief Inspector" }
      );

      expect(updated).toBeDefined();
      expect(updated?.edsStatus).toBe("CLEARED");
      expect(updated?.securityNotes).toContain("Manual CT slice verified safe");

      // Reset for state integrity
      await updateBaggageStatus(tag, { edsStatus: "LEVEL_2_INSPECTION" });
    });
  });

  describe("ULD Container Stowage & Weight-and-Balance", () => {
    it("lists active ULD containers and verifies capacity limits", async () => {
      const ulds = await listUlds();
      expect(ulds.length).toBeGreaterThanOrEqual(3);

      const akh = ulds.find((u) => u.code === "AKH-88214-SC");
      expect(akh).toBeDefined();
      expect(akh?.maxWeightKg).toBe(1588);
      expect(akh?.tareWeightKg).toBe(82);
      expect(akh?.bagCount).toBeGreaterThan(0);
      expect(akh?.currentWeightKg).toBeLessThanOrEqual(akh?.maxWeightKg || 1588);
    });

    it("prevents packing an un-cleared baggage item into a ULD container", async () => {
      const blocked = await packBagIntoUld("BAG-SEC-9912", "AKH-88214-SC");
      expect(blocked.ok).toBe(false);
      expect(blocked.message).toContain("Security Lock");
    });

    it("allows packing cleared bags into an open ULD and updates gross weight", async () => {
      const bagTag = "BAG-BH301-4411";
      const uldCode = "AKH-88214-SC";

      const initialUld = (await listUlds()).find((u) => u.code === uldCode);
      const initialCount = initialUld?.bagCount || 0;
      const initialWeight = initialUld?.currentWeightKg || 0;

      const pack = await packBagIntoUld(bagTag, uldCode, { id: "loader-1", name: "Baggage Loader" });
      expect(pack.ok).toBe(true);
      expect(pack.bag?.assignedUld).toBe(uldCode);
      expect(pack.bag?.sortationStatus).toBe("PACKED_ULD");
      expect(pack.uld?.bagCount).toBe(initialCount + 1);
      expect(pack.uld?.currentWeightKg).toBeGreaterThan(initialWeight);
    });

    it("advances ULD container lifecycle status from packing to sealed and transit", async () => {
      const uldCode = "AKH-10492-AV";
      const sealed = await updateUldStatus(uldCode, "SEALED");
      expect(sealed?.status).toBe("SEALED");

      const transit = await updateUldStatus(uldCode, "RAMP_TRANSIT");
      expect(transit?.status).toBe("RAMP_TRANSIT");

      // Reset
      await updateUldStatus(uldCode, "OPEN_PACKING");
    });
  });

  describe("BHS Sortation Carousels & Belts", () => {
    it("lists make-up and arrival reclaim carousels", async () => {
      const carousels = await listCarousels();
      expect(carousels.length).toBeGreaterThanOrEqual(4);

      const c1 = carousels.find((c) => c.id === 1);
      expect(c1).toBeDefined();
      expect(c1?.type).toBe("DEPARTURE_MAKEUP");
      expect(c1?.status).toBe("OPERATIONAL");
    });

    it("assigns a flight to an active conveyor loop", async () => {
      const assigned = await assignFlightToCarousel(5, "SC102", { id: "ops-lead", name: "Apron Supervisor" });
      expect(assigned).toBeDefined();
      expect(assigned?.assignedFlight).toBe("SC102");
      expect(assigned?.status).toBe("OPERATIONAL");
    });
  });

  describe("Baggage Counter PNR Verification Engine & Tag Association", () => {
    it("returns INVALID for non-existent or blank PNRs", async () => {
      const res = await verifyBaggagePnr("INVALID999");
      expect(res.ok).toBe(false);
      expect(res.outcome).toBe("INVALID");
      expect(res.message).toContain("not found");
    });

    it("verifies eligible booking and returns VALID outcome with default 15kg allowance", async () => {
      const testPnr = "TSTBAGGAGE1";
      memoryBookings.unshift({
        id: "bkg-test-baggage-1",
        pnr: testPnr,
        flightId: "flt-test-1",
        flightNumber: "SC101",
        flightCallsign: "SECA101",
        origin: "HYD",
        destination: "BOM",
        departureTime: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
        passengerId: "psg-test-1",
        passengerName: "Vikram Malhotra",
        seatNumber: "14B",
        travelClass: "ECONOMY",
        fare: 4500,
        paymentStatus: "SUCCESSFUL",
        bookingStatus: "CONFIRMED",
        checkInStatus: "NOT_CHECKED_IN",
        boardingStatus: "NOT_BOARDED",
        verificationStatus: "VERIFIED",
        baggageTag: `BAG-${testPnr}-1`,
        baggageAllowanceKg: 15.0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const res = await verifyBaggagePnr(testPnr);
      expect(res.ok).toBe(true);
      expect(res.outcome).toBe("VALID");
      expect(res.booking?.passengerName).toBe("Vikram Malhotra");
      expect(res.booking?.baggageTag).toBe(`BAG-${testPnr}-1`);
    });

    it("accepts baggage at counter, issues tag BAG-${pnr}-1, and blocks duplicate processing", async () => {
      const testPnr = "TSTBAGGAGE2";
      memoryBookings.unshift({
        id: "bkg-test-baggage-2",
        pnr: testPnr,
        flightId: "flt-test-2",
        flightNumber: "AV201",
        origin: "HYD",
        destination: "DEL",
        departureTime: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
        passengerId: "psg-test-2",
        passengerName: "Kavita Rao",
        seatNumber: "08A",
        travelClass: "ECONOMY",
        fare: 5200,
        paymentStatus: "SUCCESSFUL",
        bookingStatus: "CONFIRMED",
        checkInStatus: "NOT_CHECKED_IN",
        boardingStatus: "NOT_BOARDED",
        verificationStatus: "VERIFIED",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 1. Accept baggage
      const acceptRes = await acceptBaggageForPnr(testPnr, { weightKg: 16.5 }, { id: "staff-1", name: "Counter Staff" });
      expect(acceptRes.ok).toBe(true);
      expect(acceptRes.outcome).toBe("VALID");
      expect(acceptRes.baggage?.tagNumber).toBe(`BAG-${testPnr}-1`);
      expect(acceptRes.baggage?.weightKg).toBe(16.5);
      expect(acceptRes.baggage?.sortationStatus).toBe("INDUCTED");

      // 2. Pack into ULD to transition status
      const packRes = await packBagIntoUld(acceptRes.baggage!.tagNumber, "AKH-88214-SC");
      expect(packRes.ok).toBe(true);

      // 3. Second verification or accept attempt must return ALREADY_PROCESSED
      const secondVerify = await verifyBaggagePnr(testPnr);
      expect(secondVerify.ok).toBe(false);
      expect(secondVerify.outcome).toBe("ALREADY_PROCESSED");

      const duplicateAccept = await acceptBaggageForPnr(testPnr, { weightKg: 16.5 });
      expect(duplicateAccept.ok).toBe(false);
      expect(duplicateAccept.outcome).toBe("ALREADY_PROCESSED");
    });

    it("rejects cancelled, no-show, and departed flight bookings with correct outcome codes", async () => {
      // Cancelled
      const pnrCancelled = "TSTCANCELLED";
      memoryBookings.unshift({
        id: "bkg-test-cancelled",
        pnr: pnrCancelled,
        flightId: "flt-test-3",
        flightNumber: "SC101",
        passengerId: "psg-3",
        passengerName: "Cancelled Passenger",
        seatNumber: "12A",
        travelClass: "ECONOMY",
        fare: 4500,
        paymentStatus: "REFUNDED",
        bookingStatus: "CANCELLED",
        checkInStatus: "NOT_CHECKED_IN",
        boardingStatus: "NOT_BOARDED",
        verificationStatus: "VERIFIED",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const resCancelled = await verifyBaggagePnr(pnrCancelled);
      expect(resCancelled.outcome).toBe("CANCELLED");

      // No-Show
      const pnrNoShow = "TSTNOSHOW";
      memoryBookings.unshift({
        id: "bkg-test-noshow",
        pnr: pnrNoShow,
        flightId: "flt-test-4",
        flightNumber: "SC101",
        passengerId: "psg-4",
        passengerName: "No-Show Passenger",
        seatNumber: "12B",
        travelClass: "ECONOMY",
        fare: 4500,
        paymentStatus: "SUCCESSFUL",
        bookingStatus: "NO_SHOW",
        checkInStatus: "NOT_CHECKED_IN",
        boardingStatus: "NOT_BOARDED",
        verificationStatus: "VERIFIED",
        noShowAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const resNoShow = await verifyBaggagePnr(pnrNoShow);
      expect(resNoShow.outcome).toBe("NO_SHOW");

      // Departed / Completed
      const pnrCompleted = "TSTCOMPLETED";
      memoryBookings.unshift({
        id: "bkg-test-completed",
        pnr: pnrCompleted,
        flightId: "flt-test-5",
        flightNumber: "SC101",
        passengerId: "psg-5",
        passengerName: "Completed Passenger",
        seatNumber: "12C",
        travelClass: "ECONOMY",
        fare: 4500,
        paymentStatus: "SUCCESSFUL",
        bookingStatus: "COMPLETED",
        checkInStatus: "CHECKED_IN",
        boardingStatus: "BOARDED",
        verificationStatus: "VERIFIED",
        journeyStatus: "COMPLETED",
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const resCompleted = await verifyBaggagePnr(pnrCompleted);
      expect(resCompleted.outcome).toBe("NOT_ELIGIBLE");
    });
  });
});
