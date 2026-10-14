import type {
  CouponDTO,
  CouponRedemptionDTO,
  DiscountType,
  CouponStatus,
  PassengerCategory,
  FareCalculationResult,
  SeatClass,
} from "@/lib/domain";
import { prisma, shouldUseDatabase } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import crypto from "crypto";

export interface CreateCouponInput {
  code?: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountCap?: number | null;
  minBookingFare?: number | null;
  category?: PassengerCategory;
  applicableClasses?: SeatClass[];
  maxTotalRedemptions?: number | null;
  maxPerPassenger?: number | null;
  validFrom?: string | Date;
  validUntil: string | Date;
  requiresVerification?: boolean;
}

export interface CouponFilter {
  query?: string;
  category?: PassengerCategory;
  status?: CouponStatus;
  includeArchived?: boolean;
  page?: number;
  limit?: number;
}

// In-Memory Mutex Lock for Concurrency Safety in Memory Mode
const memoryCouponLocks = new Map<string, Promise<void>>();

async function acquireCouponLock(key: string): Promise<() => void> {
  while (memoryCouponLocks.has(key)) {
    await memoryCouponLocks.get(key);
  }
  let unlock: () => void = () => {};
  const lockPromise = new Promise<void>((resolve) => {
    unlock = () => {
      memoryCouponLocks.delete(key);
      resolve();
    };
  });
  memoryCouponLocks.set(key, lockPromise);
  return unlock;
}

// Default In-Memory Seeds for testing & simulator
export const memoryCoupons: CouponDTO[] = [
  {
    id: "cpn-student-01",
    code: "AOCC-STUDENT-2026",
    description: "Verified Student Special: 15% off base fare up to ₹1,500 with student ID",
    discountType: "PERCENTAGE",
    discountValue: 15,
    maxDiscountCap: 1500,
    minBookingFare: 1000,
    category: "STUDENT",
    applicableClasses: ["ECONOMY"],
    maxTotalRedemptions: 500,
    redemptionsCount: 2,
    maxPerPassenger: 2,
    validFrom: "2026-01-01T00:00:00.000Z",
    validUntil: "2026-12-31T23:59:59.000Z",
    status: "ACTIVE",
    requiresVerification: true,
    isArchived: false,
    createdBy: "SYSTEM",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cpn-defence-01",
    code: "AOCC-DEFENCE-2026",
    description: "Armed Forces & Paramilitary: 20% discount up to ₹2,000 on all flights",
    discountType: "PERCENTAGE",
    discountValue: 20,
    maxDiscountCap: 2000,
    minBookingFare: 1000,
    category: "ARMED_FORCES",
    applicableClasses: ["ECONOMY", "BUSINESS"],
    maxTotalRedemptions: 500,
    redemptionsCount: 1,
    maxPerPassenger: 4,
    validFrom: "2026-01-01T00:00:00.000Z",
    validUntil: "2026-12-31T23:59:59.000Z",
    status: "ACTIVE",
    requiresVerification: true,
    isArchived: false,
    createdBy: "SYSTEM",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cpn-senior-01",
    code: "AOCC-SENIOR-2026",
    description: "Senior Citizen Concession: 10% off base fare up to ₹1,000 for travelers 60+",
    discountType: "PERCENTAGE",
    discountValue: 10,
    maxDiscountCap: 1000,
    minBookingFare: 1000,
    category: "SENIOR_CITIZEN",
    applicableClasses: ["ECONOMY"],
    maxTotalRedemptions: 500,
    redemptionsCount: 0,
    maxPerPassenger: 3,
    validFrom: "2026-01-01T00:00:00.000Z",
    validUntil: "2026-12-31T23:59:59.000Z",
    status: "ACTIVE",
    requiresVerification: false,
    isArchived: false,
    createdBy: "SYSTEM",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cpn-flysafe-01",
    code: "AOCC-FLYSAFE-2026",
    description: "Promotional Launch Voucher: Flat ₹500 instant discount on bookings above ₹3,000",
    discountType: "FIXED_AMOUNT",
    discountValue: 500,
    minBookingFare: 3000,
    category: "GENERAL",
    applicableClasses: ["ECONOMY", "BUSINESS", "FIRST"],
    maxTotalRedemptions: 1000,
    redemptionsCount: 5,
    maxPerPassenger: 1,
    validFrom: "2026-01-01T00:00:00.000Z",
    validUntil: "2026-12-31T23:59:59.000Z",
    status: "ACTIVE",
    requiresVerification: false,
    isArchived: false,
    createdBy: "SYSTEM",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cpn-staff-01",
    code: "AOCC-STAFF-PASS",
    description: "Airline & Airport Operations Staff Travel: 30% off base fare up to ₹3,000",
    discountType: "PERCENTAGE",
    discountValue: 30,
    maxDiscountCap: 3000,
    minBookingFare: 0,
    category: "STAFF",
    applicableClasses: ["ECONOMY", "BUSINESS"],
    maxTotalRedemptions: 200,
    redemptionsCount: 0,
    maxPerPassenger: 6,
    validFrom: "2026-01-01T00:00:00.000Z",
    validUntil: "2026-12-31T23:59:59.000Z",
    status: "ACTIVE",
    requiresVerification: true,
    isArchived: false,
    createdBy: "SYSTEM",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

export const memoryCouponRedemptions: CouponRedemptionDTO[] = [
  {
    id: "red-01",
    couponId: "cpn-student-01",
    couponCode: "AOCC-STUDENT-2026",
    bookingId: "bkg-1",
    pnr: "SC7K92P",
    passengerId: "psg-1",
    passengerName: "Rahul Varma",
    originalFare: 4500,
    discountAmount: 675,
    finalFare: 3825,
    redeemedAt: "2026-01-10T14:20:00.000Z",
  },
];

/**
 * Generates collision-resistant unique coupon codes with category tags
 * Format: AOCC-<CATEGORY_PREFIX>-<6_RANDOM_CHARS>
 */
export function generateUniqueCouponCode(
  category: PassengerCategory = "GENERAL",
  customPrefix?: string
): string {
  const catMap: Record<PassengerCategory, string> = {
    GENERAL: "GEN",
    STUDENT: "STUD",
    ARMED_FORCES: "ARMY",
    SENIOR_CITIZEN: "SNR",
    STAFF: "STAFF",
  };
  const tag = customPrefix ? customPrefix.trim().toUpperCase() : catMap[category] || "GEN";
  const randomChars = crypto.randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
  return `AOCC-${tag}-${randomChars}`;
}

/**
 * Normalizes any coupon code input into a standard uppercase trimmed format
 */
export function normalizeCouponCode(code: string): string {
  return (code || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

/**
 * Maps Prisma Coupon model to standard CouponDTO
 */
function mapPrismaCouponToDTO(c: {
  id: string;
  code: string;
  description: string;
  discountType: string;
  discountValue: Prisma.Decimal | number;
  maxDiscountCap: Prisma.Decimal | number | null;
  minBookingFare: Prisma.Decimal | number | null;
  category: string;
  applicableClasses: string[];
  maxTotalRedemptions: number | null;
  redemptionsCount: number;
  maxPerPassenger: number | null;
  validFrom: Date;
  validUntil: Date;
  status: string;
  requiresVerification: boolean;
  isArchived: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}): CouponDTO {
  return {
    id: c.id,
    code: c.code,
    description: c.description,
    discountType: c.discountType as DiscountType,
    discountValue: Number(c.discountValue),
    maxDiscountCap: c.maxDiscountCap ? Number(c.maxDiscountCap) : undefined,
    minBookingFare: c.minBookingFare ? Number(c.minBookingFare) : undefined,
    category: c.category as PassengerCategory,
    applicableClasses: (c.applicableClasses || []) as SeatClass[],
    maxTotalRedemptions: c.maxTotalRedemptions ?? undefined,
    redemptionsCount: c.redemptionsCount,
    maxPerPassenger: c.maxPerPassenger ?? undefined,
    validFrom: c.validFrom.toISOString(),
    validUntil: c.validUntil.toISOString(),
    status: c.status as CouponStatus,
    requiresVerification: c.requiresVerification,
    isArchived: c.isArchived,
    createdBy: c.createdBy ?? undefined,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

/**
 * Fetch a single coupon by code (case-insensitive)
 */
export async function getCouponByCode(rawCode: string): Promise<CouponDTO | null> {
  const code = normalizeCouponCode(rawCode);
  if (!code) return null;

  if (shouldUseDatabase()) {
    try {
      const found = await prisma.coupon.findUnique({
        where: { code },
      });
      return found ? mapPrismaCouponToDTO(found) : null;
    } catch (err) {
      console.warn("[CouponService] DB lookup failed, falling back to memory:", err);
    }
  }

  const inMem = memoryCoupons.find((c) => c.code === code && !c.isArchived);
  return inMem ? { ...inMem } : null;
}

/**
 * Fetch a single coupon by ID
 */
export async function getCouponById(id: string): Promise<CouponDTO | null> {
  if (shouldUseDatabase()) {
    try {
      const found = await prisma.coupon.findUnique({
        where: { id },
      });
      return found ? mapPrismaCouponToDTO(found) : null;
    } catch (err) {
      console.warn("[CouponService] DB lookup failed, falling back to memory:", err);
    }
  }

  const inMem = memoryCoupons.find((c) => c.id === id);
  return inMem ? { ...inMem } : null;
}

/**
 * Authoritative Server-Side Fare & Discount Calculation Engine
 * Protects against price tampering, guarantees mathematical caps & category eligibility
 */
export async function calculateFareDiscount(params: {
  baseFare: number;
  couponCode?: string;
  passengerCategory?: PassengerCategory;
  seatClass?: SeatClass;
  passengerId?: string;
  passengerEmail?: string;
}): Promise<FareCalculationResult> {
  const eligibleFare = Math.max(0, Math.round(params.baseFare));
  const fallbackResult: FareCalculationResult = {
    eligibleFare,
    originalTotalFare: eligibleFare,
    discountAmount: 0,
    taxAmount: 0,
    finalFare: eligibleFare,
    valid: true,
  };

  if (!params.couponCode || !params.couponCode.trim()) {
    return fallbackResult;
  }

  const code = normalizeCouponCode(params.couponCode);
  const coupon = await getCouponByCode(code);

  if (!coupon) {
    return {
      ...fallbackResult,
      valid: false,
      error: `Invalid coupon code "${code}".`,
    };
  }

  if (coupon.isArchived) {
    return {
      ...fallbackResult,
      valid: false,
      error: `Coupon "${code}" is no longer active.`,
    };
  }

  if (coupon.status !== "ACTIVE") {
    return {
      ...fallbackResult,
      valid: false,
      error: `Coupon "${code}" is currently ${coupon.status.toLowerCase()}.`,
    };
  }

  // Validity Date Check (Server UTC)
  const now = new Date().getTime();
  const validFrom = new Date(coupon.validFrom).getTime();
  const validUntil = new Date(coupon.validUntil).getTime();

  if (now < validFrom) {
    return {
      ...fallbackResult,
      valid: false,
      error: `Coupon "${code}" will be active from ${new Date(coupon.validFrom).toLocaleDateString()}.`,
    };
  }

  if (now > validUntil) {
    return {
      ...fallbackResult,
      valid: false,
      error: `Coupon "${code}" expired on ${new Date(coupon.validUntil).toLocaleDateString()}.`,
    };
  }

  // Redemption capacity check
  if (
    coupon.maxTotalRedemptions !== undefined &&
    coupon.redemptionsCount >= coupon.maxTotalRedemptions
  ) {
    return {
      ...fallbackResult,
      valid: false,
      error: `Coupon "${code}" redemptions limit has been exhausted.`,
    };
  }

  // Passenger Category Verification
  if (coupon.category !== "GENERAL") {
    const pCategory = params.passengerCategory || "GENERAL";
    if (pCategory !== coupon.category) {
      return {
        ...fallbackResult,
        valid: false,
        error: `Coupon "${code}" is exclusively reserved for ${coupon.category.replace(/_/g, " ")} travelers.`,
      };
    }
  }

  // Applicable Seat Class check
  if (
    coupon.applicableClasses &&
    coupon.applicableClasses.length > 0 &&
    params.seatClass
  ) {
    if (!coupon.applicableClasses.includes(params.seatClass)) {
      return {
        ...fallbackResult,
        valid: false,
        error: `Coupon "${code}" is valid for ${coupon.applicableClasses.join(", ")} class only.`,
      };
    }
  }

  // Minimum Fare threshold check
  if (coupon.minBookingFare && eligibleFare < coupon.minBookingFare) {
    return {
      ...fallbackResult,
      valid: false,
      error: `Coupon "${code}" requires a minimum booking fare of ₹${coupon.minBookingFare.toLocaleString("en-IN")}.`,
    };
  }

  // Max Per Passenger limit check
  if (coupon.maxPerPassenger !== undefined && coupon.maxPerPassenger > 0) {
    let passengerUsageCount = 0;
    if (shouldUseDatabase()) {
      try {
        passengerUsageCount = await prisma.couponRedemption.count({
          where: {
            couponId: coupon.id,
            OR: [
              ...(params.passengerId ? [{ passengerId: params.passengerId }] : []),
            ],
          },
        });
      } catch {
        passengerUsageCount = memoryCouponRedemptions.filter(
          (r) =>
            r.couponId === coupon.id &&
            ((params.passengerId && r.passengerId === params.passengerId) ||
              (params.passengerEmail && r.passengerName?.toLowerCase().includes(params.passengerEmail.toLowerCase())))
        ).length;
      }
    } else {
      passengerUsageCount = memoryCouponRedemptions.filter(
        (r) =>
          r.couponId === coupon.id &&
          ((params.passengerId && r.passengerId === params.passengerId) ||
            (params.passengerEmail && r.passengerName?.toLowerCase().includes(params.passengerEmail.toLowerCase())))
      ).length;
    }

    if (passengerUsageCount >= coupon.maxPerPassenger) {
      return {
        ...fallbackResult,
        valid: false,
        error: `You have reached the maximum allowed uses (${coupon.maxPerPassenger}) for coupon "${code}".`,
      };
    }
  }

  // Compute Authoritative Discount Value
  let discountAmount = 0;
  if (coupon.discountType === "PERCENTAGE") {
    // Simulator safety ceiling: Maximum percentage discount is 90%
    const cappedPercent = Math.min(Math.max(0, coupon.discountValue), 90);
    const calculatedDiscount = Math.round((eligibleFare * cappedPercent) / 100);

    // Apply max discount cap if configured
    discountAmount =
      coupon.maxDiscountCap && coupon.maxDiscountCap > 0
        ? Math.min(calculatedDiscount, coupon.maxDiscountCap)
        : calculatedDiscount;
  } else {
    // FIXED_AMOUNT discount
    discountAmount = Math.max(0, Math.round(coupon.discountValue));
  }

  // Discount cannot exceed the eligible fare itself
  discountAmount = Math.min(discountAmount, eligibleFare);
  const finalFare = Math.max(0, eligibleFare - discountAmount);

  return {
    eligibleFare,
    originalTotalFare: eligibleFare,
    discountAmount,
    taxAmount: 0,
    finalFare,
    valid: true,
    couponApplied: {
      id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      category: coupon.category,
      discountAmount,
      maxDiscountCap: coupon.maxDiscountCap,
      requiresVerification: coupon.requiresVerification,
    },
  };
}

/**
 * Concurrency-Safe Atomic Coupon Redemption Recorder
 * Increments redemptionsCount atomically and records immutable CouponRedemption snapshot
 */
export async function redeemCouponAtomic(params: {
  couponCode: string;
  bookingId: string;
  pnr: string;
  passengerId: string;
  passengerName: string;
  originalFare: number;
  discountAmount: number;
  finalFare: number;
  tx?: Prisma.TransactionClient;
}): Promise<{ ok: boolean; redemption?: CouponRedemptionDTO; error?: string }> {
  const code = normalizeCouponCode(params.couponCode);
  if (!code) return { ok: false, error: "Empty coupon code" };

  if (shouldUseDatabase()) {
    try {
      const runner = params.tx ?? prisma;

      // Find coupon
      const coupon = await runner.coupon.findUnique({
        where: { code },
      });

      if (!coupon || coupon.isArchived) {
        return { ok: false, error: "Coupon not found or is archived" };
      }

      if (coupon.status !== "ACTIVE") {
        return { ok: false, error: `Coupon status is ${coupon.status}` };
      }

      if (
        coupon.maxTotalRedemptions !== null &&
        coupon.redemptionsCount >= coupon.maxTotalRedemptions
      ) {
        return { ok: false, error: "Coupon redemptions exhausted" };
      }

      // Increment redemption atomically
      const newCount = coupon.redemptionsCount + 1;
      const isExhausted =
        coupon.maxTotalRedemptions !== null && newCount >= coupon.maxTotalRedemptions;

      await runner.coupon.update({
        where: { id: coupon.id },
        data: {
          redemptionsCount: { increment: 1 },
          status: isExhausted ? "EXHAUSTED" : coupon.status,
        },
      });

      // Create redemption ledger
      const created = await runner.couponRedemption.create({
        data: {
          couponId: coupon.id,
          bookingId: params.bookingId,
          pnr: params.pnr,
          passengerId: params.passengerId,
          passengerName: params.passengerName,
          originalFare: new Prisma.Decimal(params.originalFare.toString()),
          discountAmount: new Prisma.Decimal(params.discountAmount.toString()),
          finalFare: new Prisma.Decimal(params.finalFare.toString()),
        },
      });

      return {
        ok: true,
        redemption: {
          id: created.id,
          couponId: created.couponId,
          couponCode: code,
          bookingId: created.bookingId,
          pnr: created.pnr,
          passengerId: created.passengerId,
          passengerName: created.passengerName,
          originalFare: Number(created.originalFare),
          discountAmount: Number(created.discountAmount),
          finalFare: Number(created.finalFare),
          redeemedAt: created.redeemedAt.toISOString(),
        },
      };
    } catch (err) {
      console.warn("[CouponService] DB redemption error, falling back to memory:", err);
    }
  }

  // IN-MEMORY CONCURRENCY LOCK
  const unlock = await acquireCouponLock(code);
  try {
    const coupon = memoryCoupons.find((c) => c.code === code && !c.isArchived);
    if (!coupon) return { ok: false, error: "Coupon not found" };

    if (coupon.status !== "ACTIVE") {
      return { ok: false, error: `Coupon is ${coupon.status}` };
    }

    if (
      coupon.maxTotalRedemptions !== undefined &&
      coupon.redemptionsCount >= coupon.maxTotalRedemptions
    ) {
      return { ok: false, error: "Coupon redemptions exhausted" };
    }

    coupon.redemptionsCount += 1;
    if (
      coupon.maxTotalRedemptions !== undefined &&
      coupon.redemptionsCount >= coupon.maxTotalRedemptions
    ) {
      coupon.status = "EXHAUSTED";
    }
    coupon.updatedAt = new Date().toISOString();

    const redemption: CouponRedemptionDTO = {
      id: `red-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      couponId: coupon.id,
      couponCode: code,
      bookingId: params.bookingId,
      pnr: params.pnr,
      passengerId: params.passengerId,
      passengerName: params.passengerName,
      originalFare: params.originalFare,
      discountAmount: params.discountAmount,
      finalFare: params.finalFare,
      redeemedAt: new Date().toISOString(),
    };

    memoryCouponRedemptions.push(redemption);
    return { ok: true, redemption };
  } finally {
    unlock();
  }
}

/**
 * Create a new coupon (Super Admin / Admin only)
 */
export async function createCoupon(
  input: CreateCouponInput,
  createdBy = "ADMIN"
): Promise<CouponDTO> {
  const code = input.code
    ? normalizeCouponCode(input.code)
    : generateUniqueCouponCode(input.category || "GENERAL");

  const validFromDate = input.validFrom ? new Date(input.validFrom) : new Date();
  const validUntilDate = new Date(input.validUntil);

  if (validUntilDate.getTime() <= validFromDate.getTime()) {
    throw new Error("Coupon validUntil date must be strictly after validFrom date.");
  }

  if (input.discountType === "PERCENTAGE" && (input.discountValue <= 0 || input.discountValue > 90)) {
    throw new Error("Percentage discount must be between 1% and 90%.");
  }

  if (input.discountType === "FIXED_AMOUNT" && input.discountValue <= 0) {
    throw new Error("Fixed discount amount must be greater than zero.");
  }

  if (shouldUseDatabase()) {
    try {
      const created = await prisma.coupon.create({
        data: {
          code,
          description: input.description,
          discountType: input.discountType,
          discountValue: new Prisma.Decimal(input.discountValue.toString()),
          maxDiscountCap: input.maxDiscountCap
            ? new Prisma.Decimal(input.maxDiscountCap.toString())
            : null,
          minBookingFare: input.minBookingFare
            ? new Prisma.Decimal(input.minBookingFare.toString())
            : new Prisma.Decimal("0"),
          category: input.category || "GENERAL",
          applicableClasses: input.applicableClasses || [],
          maxTotalRedemptions: input.maxTotalRedemptions ?? null,
          redemptionsCount: 0,
          maxPerPassenger: input.maxPerPassenger ?? 1,
          validFrom: validFromDate,
          validUntil: validUntilDate,
          status: "ACTIVE",
          requiresVerification: Boolean(input.requiresVerification),
          isArchived: false,
          createdBy,
        },
      });

      return mapPrismaCouponToDTO(created);
    } catch (err) {
      console.warn("[CouponService] DB create failed, falling back to memory:", err);
    }
  }

  // Memory fallback
  const existing = memoryCoupons.find((c) => c.code === code && !c.isArchived);
  if (existing) {
    throw new Error(`Coupon with code ${code} already exists.`);
  }

  const newCoupon: CouponDTO = {
    id: `cpn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    code,
    description: input.description,
    discountType: input.discountType,
    discountValue: input.discountValue,
    maxDiscountCap: input.maxDiscountCap ?? undefined,
    minBookingFare: input.minBookingFare ?? 0,
    category: input.category || "GENERAL",
    applicableClasses: input.applicableClasses || [],
    maxTotalRedemptions: input.maxTotalRedemptions ?? undefined,
    redemptionsCount: 0,
    maxPerPassenger: input.maxPerPassenger ?? 1,
    validFrom: validFromDate.toISOString(),
    validUntil: validUntilDate.toISOString(),
    status: "ACTIVE",
    requiresVerification: Boolean(input.requiresVerification),
    isArchived: false,
    createdBy,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  memoryCoupons.unshift(newCoupon);
  return newCoupon;
}

/**
 * List coupons with paged search and status filtering
 */
export async function listCoupons(
  filters: CouponFilter = {}
): Promise<{ coupons: CouponDTO[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const skip = (page - 1) * limit;

  if (shouldUseDatabase()) {
    try {
      const where: Prisma.CouponWhereInput = {
        isArchived: filters.includeArchived ? undefined : false,
        ...(filters.category ? { category: filters.category } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.query
          ? {
              OR: [
                { code: { contains: filters.query, mode: "insensitive" } },
                { description: { contains: filters.query, mode: "insensitive" } },
              ],
            }
          : {}),
      };

      const [total, items] = await Promise.all([
        prisma.coupon.count({ where }),
        prisma.coupon.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
      ]);

      return {
        coupons: items.map(mapPrismaCouponToDTO),
        total,
        page,
        limit,
      };
    } catch (err) {
      console.warn("[CouponService] DB list failed, falling back to memory:", err);
    }
  }

  let list = memoryCoupons.filter((c) => (filters.includeArchived ? true : !c.isArchived));

  if (filters.category) {
    list = list.filter((c) => c.category === filters.category);
  }

  if (filters.status) {
    list = list.filter((c) => c.status === filters.status);
  }

  if (filters.query && filters.query.trim()) {
    const q = filters.query.trim().toLowerCase();
    list = list.filter(
      (c) => c.code.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
    );
  }

  const total = list.length;
  const paged = list.slice(skip, skip + limit);

  return {
    coupons: paged,
    total,
    page,
    limit,
  };
}

/**
 * Update an existing coupon (status, cap, expiry, or description)
 */
export async function updateCoupon(
  id: string,
  updates: Partial<CreateCouponInput> & { status?: CouponStatus }
): Promise<CouponDTO> {
  if (shouldUseDatabase()) {
    try {
      const updated = await prisma.coupon.update({
        where: { id },
        data: {
          ...(updates.description ? { description: updates.description } : {}),
          ...(updates.discountValue
            ? { discountValue: new Prisma.Decimal(updates.discountValue.toString()) }
            : {}),
          ...(updates.maxDiscountCap !== undefined
            ? {
                maxDiscountCap: updates.maxDiscountCap
                  ? new Prisma.Decimal(updates.maxDiscountCap.toString())
                  : null,
              }
            : {}),
          ...(updates.minBookingFare !== undefined
            ? {
                minBookingFare: updates.minBookingFare
                  ? new Prisma.Decimal(updates.minBookingFare.toString())
                  : new Prisma.Decimal("0"),
              }
            : {}),
          ...(updates.category ? { category: updates.category } : {}),
          ...(updates.applicableClasses ? { applicableClasses: updates.applicableClasses } : {}),
          ...(updates.maxTotalRedemptions !== undefined
            ? { maxTotalRedemptions: updates.maxTotalRedemptions }
            : {}),
          ...(updates.maxPerPassenger !== undefined
            ? { maxPerPassenger: updates.maxPerPassenger }
            : {}),
          ...(updates.validUntil ? { validUntil: new Date(updates.validUntil) } : {}),
          ...(updates.validFrom ? { validFrom: new Date(updates.validFrom) } : {}),
          ...(updates.status ? { status: updates.status } : {}),
          ...(updates.requiresVerification !== undefined
            ? { requiresVerification: updates.requiresVerification }
            : {}),
        },
      });

      return mapPrismaCouponToDTO(updated);
    } catch (err) {
      console.warn("[CouponService] DB update failed, falling back to memory:", err);
    }
  }

  const coupon = memoryCoupons.find((c) => c.id === id);
  if (!coupon) {
    throw new Error(`Coupon with ID ${id} not found.`);
  }

  if (updates.description) coupon.description = updates.description;
  if (updates.discountValue) coupon.discountValue = updates.discountValue;
  if (updates.maxDiscountCap !== undefined) coupon.maxDiscountCap = updates.maxDiscountCap ?? undefined;
  if (updates.minBookingFare !== undefined) coupon.minBookingFare = updates.minBookingFare ?? 0;
  if (updates.category) coupon.category = updates.category;
  if (updates.applicableClasses) coupon.applicableClasses = updates.applicableClasses;
  if (updates.maxTotalRedemptions !== undefined)
    coupon.maxTotalRedemptions = updates.maxTotalRedemptions ?? undefined;
  if (updates.maxPerPassenger !== undefined) coupon.maxPerPassenger = updates.maxPerPassenger ?? 1;
  if (updates.validUntil) coupon.validUntil = new Date(updates.validUntil).toISOString();
  if (updates.validFrom) coupon.validFrom = new Date(updates.validFrom).toISOString();
  if (updates.status) coupon.status = updates.status;
  if (updates.requiresVerification !== undefined)
    coupon.requiresVerification = updates.requiresVerification;

  coupon.updatedAt = new Date().toISOString();
  return { ...coupon };
}

/**
 * Soft Archive / Delete a coupon to ensure historical ledger immutability
 */
export async function archiveCoupon(id: string): Promise<boolean> {
  if (shouldUseDatabase()) {
    try {
      await prisma.coupon.update({
        where: { id },
        data: {
          isArchived: true,
          status: "DISABLED",
        },
      });
      return true;
    } catch (err) {
      console.warn("[CouponService] DB archive failed, falling back to memory:", err);
    }
  }

  const coupon = memoryCoupons.find((c) => c.id === id);
  if (!coupon) return false;
  coupon.isArchived = true;
  coupon.status = "DISABLED";
  coupon.updatedAt = new Date().toISOString();
  return true;
}

/**
 * Get all redemptions for a specific coupon
 */
export async function getCouponRedemptions(couponId: string): Promise<CouponRedemptionDTO[]> {
  if (shouldUseDatabase()) {
    try {
      const items = await prisma.couponRedemption.findMany({
        where: { couponId },
        orderBy: { redeemedAt: "desc" },
      });

      return items.map((r) => ({
        id: r.id,
        couponId: r.couponId,
        couponCode: "",
        bookingId: r.bookingId,
        pnr: r.pnr,
        passengerId: r.passengerId,
        passengerName: r.passengerName,
        originalFare: Number(r.originalFare),
        discountAmount: Number(r.discountAmount),
        finalFare: Number(r.finalFare),
        redeemedAt: r.redeemedAt.toISOString(),
      }));
    } catch (err) {
      console.warn("[CouponService] DB redemptions lookup failed, falling back to memory:", err);
    }
  }

  return memoryCouponRedemptions.filter((r) => r.couponId === couponId);
}
