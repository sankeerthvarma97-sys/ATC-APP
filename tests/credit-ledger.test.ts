import { describe, expect, it } from "vitest";
import {
  adjustUserCredit,
  getUserCreditBalance,
  listCreditTransactions,
  getFinancialSummary,
} from "../src/lib/services/credit-service";
import { createBooking, cancelBooking } from "../src/lib/services/booking-service";

describe("User Money & Credit Ledger System", () => {
  const testUserId = `test-usr-${Date.now()}`;

  it("should initialize with default credit balance or track balance accurately", async () => {
    const balance = await getUserCreditBalance(testUserId);
    expect(balance).toBeGreaterThanOrEqual(0);
  });

  it("should add credits to a user account and record ledger entry", async () => {
    const initialBal = await getUserCreditBalance(testUserId);
    const depositAmount = 5000;

    const result = await adjustUserCredit({
      userId: testUserId,
      amount: depositAmount,
      type: "CREDIT",
      description: "Welcome credit bonus",
    });

    expect(result.balanceBefore).toBe(initialBal);
    expect(result.balanceAfter).toBe(initialBal + depositAmount);
    expect(result.transaction.amount).toBe(depositAmount);
    expect(result.transaction.type).toBe("CREDIT");
    expect(result.transaction.balanceBefore).toBe(initialBal);
    expect(result.transaction.balanceAfter).toBe(initialBal + depositAmount);

    const newBal = await getUserCreditBalance(testUserId);
    expect(newBal).toBe(initialBal + depositAmount);
  });

  it("should debit credits for flight bookings with sufficient balance", async () => {
    const currentBal = await getUserCreditBalance(testUserId);
    const debitAmount = 4500;

    const result = await adjustUserCredit({
      userId: testUserId,
      amount: debitAmount,
      type: "BOOKING_DEBIT",
      referenceType: "BOOKING",
      referenceId: "PNR-TEST-123",
      description: "Debit for booking PNR-TEST-123",
    });

    expect(result.balanceBefore).toBe(currentBal);
    expect(result.balanceAfter).toBe(currentBal - debitAmount);
  });

  it("should reject debit and prevent negative balance when funds are insufficient (Double-Spend Protection)", async () => {
    const currentBal = await getUserCreditBalance(testUserId);
    const excessiveAmount = currentBal + 100000;

    await expect(
      adjustUserCredit({
        userId: testUserId,
        amount: excessiveAmount,
        type: "BOOKING_DEBIT",
        description: "Attempted overdraft",
      })
    ).rejects.toThrow(/Insufficient credit balance/);

    // Ensure balance was NOT mutated
    const postBalance = await getUserCreditBalance(testUserId);
    expect(postBalance).toBe(currentBal);
  });

  it("should reject zero or negative transaction amounts", async () => {
    await expect(
      adjustUserCredit({
        userId: testUserId,
        amount: 0,
        type: "CREDIT",
      })
    ).rejects.toThrow(/must be strictly greater than zero/);

    await expect(
      adjustUserCredit({
        userId: testUserId,
        amount: -100,
        type: "CREDIT",
      })
    ).rejects.toThrow(/must be strictly greater than zero/);
  });

  it("should accurately list transactions in the audit ledger", async () => {
    const { transactions, total } = await listCreditTransactions({
      userId: testUserId,
      pageSize: 10,
    });

    expect(total).toBeGreaterThanOrEqual(2);
    expect(transactions.length).toBeGreaterThanOrEqual(2);
    expect(transactions[0].userId).toBe(testUserId);
  });

  it("should refund credits when a booking with credit is cancelled", async () => {
    // 1. Create a booking with credit
    const booking = await createBooking({
      flightId: "flt-sc101",
      seatNumber: "15C",
      travelClass: "ECONOMY",
      passenger: {
        fullName: "Credit Test Passenger",
        email: "credittest@sim.test",
        phone: "+91 99999 88888",
      },
      useCredit: true,
      createdById: testUserId,
    });

    expect(booking.creditUsed).toBeGreaterThan(0);
    const balAfterBooking = await getUserCreditBalance(testUserId);

    // 2. Cancel the booking
    const cancelled = await cancelBooking(booking.pnr, {
      id: testUserId,
      name: "Credit Test Passenger",
    });

    expect(cancelled?.bookingStatus).toBe("CANCELLED");

    // 3. Verify balance refunded
    const balAfterCancel = await getUserCreditBalance(testUserId);
    expect(balAfterCancel).toBe(balAfterBooking + (booking.creditUsed || 0));
  });

  it("should compute financial summary with KPIs", async () => {
    const summary = await getFinancialSummary();
    expect(summary).toBeDefined();
    expect(typeof summary.totalSimulatedRevenue).toBe("number");
    expect(typeof summary.totalCreditsUsed).toBe("number");
  });
});
