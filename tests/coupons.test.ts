import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateFareDiscount,
  createCoupon,
  getCouponByCode,
  listCoupons,
  redeemCouponAtomic,
  archiveCoupon,
  generateUniqueCouponCode,
  normalizeCouponCode,
  memoryCoupons,
  memoryCouponRedemptions,
} from "@/lib/services/coupon-service";
import { createBooking } from "@/lib/services/booking-service";

describe("AOCC Coupon & Special Fare Discount System", () => {
  beforeEach(() => {
    // Reset memoryCoupons to default clean state before each test
    memoryCoupons.length = 0;
    memoryCoupons.push(
      {
        id: "cpn-student-test",
        code: "AOCC-STUDENT-2026",
        description: "Verified Student Special: 15% off base fare up to ₹1,500",
        discountType: "PERCENTAGE",
        discountValue: 15,
        maxDiscountCap: 1500,
        minBookingFare: 1000,
        category: "STUDENT",
        applicableClasses: ["ECONOMY"],
        maxTotalRedemptions: 500,
        redemptionsCount: 0,
        maxPerPassenger: 2,
        validFrom: "2026-01-01T00:00:00.000Z",
        validUntil: "2026-12-31T23:59:59.000Z",
        status: "ACTIVE",
        requiresVerification: true,
        isArchived: false,
        createdBy: "TEST_SYSTEM",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "cpn-defence-test",
        code: "AOCC-DEFENCE-2026",
        description: "Armed Forces & Paramilitary: 20% discount up to ₹2,000",
        discountType: "PERCENTAGE",
        discountValue: 20,
        maxDiscountCap: 2000,
        minBookingFare: 1000,
        category: "ARMED_FORCES",
        applicableClasses: ["ECONOMY", "BUSINESS"],
        maxTotalRedemptions: 500,
        redemptionsCount: 0,
        maxPerPassenger: 4,
        validFrom: "2026-01-01T00:00:00.000Z",
        validUntil: "2026-12-31T23:59:59.000Z",
        status: "ACTIVE",
        requiresVerification: true,
        isArchived: false,
        createdBy: "TEST_SYSTEM",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "cpn-flysafe-test",
        code: "AOCC-FLYSAFE-2026",
        description: "Flat ₹500 instant discount on bookings above ₹3,000",
        discountType: "FIXED_AMOUNT",
        discountValue: 500,
        minBookingFare: 3000,
        category: "GENERAL",
        applicableClasses: ["ECONOMY", "BUSINESS", "FIRST"],
        maxTotalRedemptions: 10,
        redemptionsCount: 0,
        maxPerPassenger: 1,
        validFrom: "2026-01-01T00:00:00.000Z",
        validUntil: "2026-12-31T23:59:59.000Z",
        status: "ACTIVE",
        requiresVerification: false,
        isArchived: false,
        createdBy: "TEST_SYSTEM",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }
    );
    memoryCouponRedemptions.length = 0;
  });

  describe("Code Generation & Normalization", () => {
    it("generates collision-resistant codes in AOCC-<TAG>-<CHARS> format", () => {
      const studentCode = generateUniqueCouponCode("STUDENT");
      expect(studentCode).toMatch(/^AOCC-STUD-[A-Z0-9]{6}$/);

      const armyCode = generateUniqueCouponCode("ARMED_FORCES");
      expect(armyCode).toMatch(/^AOCC-ARMY-[A-Z0-9]{6}$/);

      const customCode = generateUniqueCouponCode("GENERAL", "SUMMER");
      expect(customCode).toMatch(/^AOCC-SUMMER-[A-Z0-9]{6}$/);
    });

    it("normalizes code with uppercase, trimmed spaces, and stripped illegal characters", () => {
      expect(normalizeCouponCode("  aocc-student-2026 ")).toBe("AOCC-STUDENT-2026");
      expect(normalizeCouponCode("AOCC_FLY$AFE#2026")).toBe("AOCCFLYAFE2026");
    });
  });

  describe("Authoritative Fare & Discount Calculation Engine", () => {
    it("calculates exact percentage discounts accurately", async () => {
      const result = await calculateFareDiscount({
        baseFare: 4500,
        couponCode: "AOCC-STUDENT-2026",
        passengerCategory: "STUDENT",
        seatClass: "ECONOMY",
      });

      expect(result.valid).toBe(true);
      expect(result.eligibleFare).toBe(4500);
      expect(result.discountAmount).toBe(675); // 15% of 4500 = 675
      expect(result.finalFare).toBe(3825); // 4500 - 675
      expect(result.couponApplied?.code).toBe("AOCC-STUDENT-2026");
    });

    it("enforces maximum discount cap for percentage vouchers", async () => {
      // 15% of 20,000 is 3,000, but cap is 1,500
      const result = await calculateFareDiscount({
        baseFare: 20000,
        couponCode: "AOCC-STUDENT-2026",
        passengerCategory: "STUDENT",
        seatClass: "ECONOMY",
      });

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(1500);
      expect(result.finalFare).toBe(18500);
    });

    it("applies fixed amount discounts correctly", async () => {
      const result = await calculateFareDiscount({
        baseFare: 5000,
        couponCode: "AOCC-FLYSAFE-2026",
        passengerCategory: "GENERAL",
      });

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(500);
      expect(result.finalFare).toBe(4500);
    });

    it("rejects coupon when minimum booking fare threshold is not met", async () => {
      const result = await calculateFareDiscount({
        baseFare: 2500, // Below minBookingFare 3000
        couponCode: "AOCC-FLYSAFE-2026",
        passengerCategory: "GENERAL",
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("requires a minimum booking fare of ₹3,000");
      expect(result.discountAmount).toBe(0);
      expect(result.finalFare).toBe(2500);
    });

    it("enforces passenger category gating strictly", async () => {
      // Trying to use STUDENT coupon as GENERAL passenger
      const result = await calculateFareDiscount({
        baseFare: 4500,
        couponCode: "AOCC-STUDENT-2026",
        passengerCategory: "GENERAL",
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("exclusively reserved for STUDENT travelers");
      expect(result.discountAmount).toBe(0);
    });

    it("enforces seat class applicability restrictions", async () => {
      // STUDENT coupon is ECONOMY only; try booking BUSINESS
      const result = await calculateFareDiscount({
        baseFare: 8500,
        couponCode: "AOCC-STUDENT-2026",
        passengerCategory: "STUDENT",
        seatClass: "BUSINESS",
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("valid for ECONOMY class only");
    });

    it("rejects non-existent coupon codes gracefully", async () => {
      const result = await calculateFareDiscount({
        baseFare: 4500,
        couponCode: "AOCC-FAKE-9999",
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid coupon code "AOCC-FAKE-9999"');
    });

    it("rejects expired coupons based on UTC validity date", async () => {
      memoryCoupons.push({
        id: "cpn-expired",
        code: "AOCC-EXPIRED-CODE",
        description: "Expired Voucher",
        discountType: "FIXED_AMOUNT",
        discountValue: 200,
        category: "GENERAL",
        redemptionsCount: 0,
        validFrom: "2025-01-01T00:00:00.000Z",
        validUntil: "2025-12-31T23:59:59.000Z", // Past date
        status: "ACTIVE",
        requiresVerification: false,
        isArchived: false,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      });

      const result = await calculateFareDiscount({
        baseFare: 4500,
        couponCode: "AOCC-EXPIRED-CODE",
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("expired");
    });
  });

  describe("Atomic Concurrency & Redemption Limits", () => {
    it("atomically records coupon redemption and increments redemption count", async () => {
      const coupon = await getCouponByCode("AOCC-FLYSAFE-2026");
      expect(coupon?.redemptionsCount).toBe(0);

      const redResult = await redeemCouponAtomic({
        couponCode: "AOCC-FLYSAFE-2026",
        bookingId: "bkg-test-1",
        pnr: "SC99XX",
        passengerId: "psg-101",
        passengerName: "Test Flyer",
        originalFare: 4500,
        discountAmount: 500,
        finalFare: 4000,
      });

      expect(redResult.ok).toBe(true);
      expect(redResult.redemption?.pnr).toBe("SC99XX");

      const updated = await getCouponByCode("AOCC-FLYSAFE-2026");
      expect(updated?.redemptionsCount).toBe(1);
    });

    it("marks coupon as EXHAUSTED when total redemption quota is reached", async () => {
      // Set max redemptions to 1
      const coupon = memoryCoupons.find((c) => c.code === "AOCC-FLYSAFE-2026")!;
      coupon.maxTotalRedemptions = 1;

      // First redemption should succeed
      const first = await redeemCouponAtomic({
        couponCode: "AOCC-FLYSAFE-2026",
        bookingId: "bkg-1",
        pnr: "SC1111",
        passengerId: "psg-1",
        passengerName: "Flyer One",
        originalFare: 4000,
        discountAmount: 500,
        finalFare: 3500,
      });
      expect(first.ok).toBe(true);

      const checkCoupon = await getCouponByCode("AOCC-FLYSAFE-2026");
      expect(checkCoupon?.status).toBe("EXHAUSTED");

      // Second redemption must fail
      const second = await redeemCouponAtomic({
        couponCode: "AOCC-FLYSAFE-2026",
        bookingId: "bkg-2",
        pnr: "SC2222",
        passengerId: "psg-2",
        passengerName: "Flyer Two",
        originalFare: 4000,
        discountAmount: 500,
        finalFare: 3500,
      });
      expect(second.ok).toBe(false);
      expect(second.error?.toLowerCase()).toContain("exhausted");
    });

    it("enforces maximum uses per individual passenger", async () => {
      const coupon = memoryCoupons.find((c) => c.code === "AOCC-FLYSAFE-2026")!;
      coupon.maxPerPassenger = 1;

      // Simulate passenger 101 redeemed it once
      memoryCouponRedemptions.push({
        id: "red-prior",
        couponId: coupon.id,
        couponCode: coupon.code,
        bookingId: "bkg-prior",
        pnr: "SCPREV",
        passengerId: "psg-101",
        passengerName: "Test Flyer",
        originalFare: 5000,
        discountAmount: 500,
        finalFare: 4500,
        redeemedAt: new Date().toISOString(),
      });

      // Validating same passenger should be blocked
      const result = await calculateFareDiscount({
        baseFare: 5000,
        couponCode: "AOCC-FLYSAFE-2026",
        passengerId: "psg-101",
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("reached the maximum allowed uses (1)");
    });
  });

  describe("Coupon Management & Soft Archival", () => {
    it("creates a new coupon with custom caps and categories", async () => {
      const newCoupon = await createCoupon({
        description: "Senior Citizen Special 10% Discount",
        category: "SENIOR_CITIZEN",
        discountType: "PERCENTAGE",
        discountValue: 10,
        maxDiscountCap: 1000,
        minBookingFare: 1000,
        validUntil: "2026-12-31T23:59:59.000Z",
        requiresVerification: false,
      });

      expect(newCoupon.id).toBeDefined();
      expect(newCoupon.code).toMatch(/^AOCC-SNR-[A-Z0-9]{6}$/);
      expect(newCoupon.category).toBe("SENIOR_CITIZEN");
      expect(newCoupon.status).toBe("ACTIVE");
    });

    it("soft archives coupon without destroying historical booking records", async () => {
      const coupon = await getCouponByCode("AOCC-STUDENT-2026");
      expect(coupon).not.toBeNull();

      const archived = await archiveCoupon(coupon!.id);
      expect(archived).toBe(true);

      // Subsequent lookup by active code returns null
      const checkActive = await getCouponByCode("AOCC-STUDENT-2026");
      expect(checkActive).toBeNull();

      // But listing with includeArchived returns it with isArchived = true
      const { coupons } = await listCoupons({ includeArchived: true });
      const foundArchived = coupons.find((c) => c.id === coupon!.id);
      expect(foundArchived?.isArchived).toBe(true);
      expect(foundArchived?.status).toBe("DISABLED");
    });

    it("lists and filters coupons by category and query", async () => {
      const { coupons: studentCoupons } = await listCoupons({ category: "STUDENT" });
      expect(studentCoupons.length).toBeGreaterThanOrEqual(1);
      expect(studentCoupons.every((c) => c.category === "STUDENT")).toBe(true);

      const { coupons: searchResults } = await listCoupons({ query: "DEFENCE" });
      expect(searchResults.some((c) => c.code === "AOCC-DEFENCE-2026")).toBe(true);
    });
  });

  describe("End-to-End Booking Service Integration", () => {
    it("creates a booking with valid coupon and snapshots discount ledger", async () => {
      // Find bookable flight
      const booking = await createBooking({
        flightId: "flt-sc101",
        seatNumber: "14B",
        travelClass: "ECONOMY",
        passenger: {
          fullName: "Aarav Sharma",
          email: "aarav.sharma@test.com",
          phone: "+91 9988776655",
        },
        couponCode: "AOCC-STUDENT-2026",
        passengerCategory: "STUDENT",
      });

      expect(booking.pnr).toBeDefined();
      expect(booking.couponCode).toBe("AOCC-STUDENT-2026");
      expect(booking.passengerCategory).toBe("STUDENT");
      expect(booking.originalFare).toBe(4500);
      expect(booking.couponDiscount).toBe(675); // 15% discount
      expect(booking.fare).toBe(3825); // 4500 - 675
      expect(booking.bookingStatus).toBe("CONFIRMED");

      // Verify redemption was counted in memory
      const coupon = await getCouponByCode("AOCC-STUDENT-2026");
      expect(coupon?.redemptionsCount).toBe(1);
    });

    it("rejects booking creation when an invalid or inapplicable coupon is submitted", async () => {
      await expect(
        createBooking({
          flightId: "flt-sc101",
          seatNumber: "14C",
          travelClass: "ECONOMY",
          passenger: {
            fullName: "Sneha Reddy",
            email: "sneha.reddy@test.com",
            phone: "+91 9988776644",
          },
          couponCode: "AOCC-INVALID-CODE",
        })
      ).rejects.toThrow(/Invalid coupon code/i);
    });
  });
});
