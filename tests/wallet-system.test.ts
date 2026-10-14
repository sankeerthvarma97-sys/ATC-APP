import { describe, expect, it } from "vitest";
import {
  getUserWallet,
  topUpUserWallet,
  payBookingWithWallet,
  refundBookingToWallet,
  adjustUserWallet,
  getAdminWalletActivity,
} from "@/lib/services/wallet-service";
import { getCompanyFinanceSummary } from "@/lib/services/company-finance-service";

describe("Passenger Simulation Wallet & Money Separation", () => {
  const testUserId = `usr-wallet-test-${Date.now()}`;

  it("should initialize user wallet with zero or accurate balance", async () => {
    const wallet = await getUserWallet(testUserId);
    expect(wallet).toBeDefined();
    expect(wallet.balance).toBeGreaterThanOrEqual(0);
    expect(wallet.totalAdded).toBeGreaterThanOrEqual(0);
  });

  it("should top up user wallet within configured limits", async () => {
    const topUpAmount = 25000;
    const initialWallet = await getUserWallet(testUserId);

    const result = await topUpUserWallet({
      userId: testUserId,
      amount: topUpAmount,
    });

    expect(result.balanceBefore).toBe(initialWallet.balance);
    expect(result.balanceAfter).toBe(initialWallet.balance + topUpAmount);
    expect(result.transaction.amount).toBe(topUpAmount);
    expect(result.transaction.type).toBe("SIMULATION_TOP_UP");

    const updated = await getUserWallet(testUserId);
    expect(updated.balance).toBe(initialWallet.balance + topUpAmount);
  });

  it("should enforce minimum (₹100) and maximum (₹1,000 Billion) top-up limits", async () => {
    // Under minimum
    await expect(
      topUpUserWallet({
        userId: testUserId,
        amount: 50,
      })
    ).rejects.toThrow(/Minimum top-up/i);

    // Over maximum per top-up (exceeds ₹1,000 Billion)
    await expect(
      topUpUserWallet({
        userId: testUserId,
        amount: 2_000_000_000_000,
      })
    ).rejects.toThrow(/Maximum top-up/i);
  });

  it("should ensure USER TOP-UP is NOT counted as company ticket revenue (Strict Money Separation)", async () => {
    const initialCompanySummary = await getCompanyFinanceSummary();
    const initialRevenue = initialCompanySummary.totalRevenue;

    // Top up passenger wallet with ₹50,000
    await topUpUserWallet({
      userId: testUserId,
      amount: 50000,
    });

    const postTopUpCompanySummary = await getCompanyFinanceSummary();
    // Company revenue must NOT have increased from user top-up
    expect(postTopUpCompanySummary.totalRevenue).toBe(initialRevenue);
  });

  it("should pay for a flight booking with wallet, debiting wallet and crediting company revenue", async () => {
    const fare = 8500;
    const bookingId = `book-${Date.now()}`;
    const pnr = "AVTEST1";

    const userWalletBefore = await getUserWallet(testUserId);
    expect(userWalletBefore.balance).toBeGreaterThanOrEqual(fare);

    const initialCompanySummary = await getCompanyFinanceSummary();

    const paymentResult = await payBookingWithWallet({
      userId: testUserId,
      amount: fare,
      bookingId,
      pnr,
      flightNumber: "AI-101",
      seatNumber: "12A",
    });

    expect(paymentResult.success).toBe(true);
    expect(paymentResult.balanceAfter).toBe(userWalletBefore.balance - fare);
    expect(paymentResult.transaction.type).toBe("BOOKING_DEBIT");

    // Company revenue must now have recorded the ticket sale
    const postPaymentCompanySummary = await getCompanyFinanceSummary();
    expect(postPaymentCompanySummary.totalRevenue).toBeGreaterThanOrEqual(
      initialCompanySummary.totalRevenue + fare
    );
  });

  it("should reject booking payment when wallet has insufficient funds", async () => {
    const poorUserId = `usr-poor-${Date.now()}`;
    await topUpUserWallet({ userId: poorUserId, amount: 500 });

    await expect(
      payBookingWithWallet({
        userId: poorUserId,
        amount: 9800,
        bookingId: "book-poor",
        pnr: "AVPOOR1",
        flightNumber: "AI-202",
        seatNumber: "14B",
      })
    ).rejects.toThrow(/Insufficient.*wallet balance/i);
  });

  it("should process an idempotent refund: debiting company refund account and crediting user wallet", async () => {
    const refundAmount = 8500;
    const bookingId = `book-refund-${Date.now()}`;
    const pnr = "AVREF1";

    const userWalletBefore = await getUserWallet(testUserId);

    const refundResult = await refundBookingToWallet({
      userId: testUserId,
      amount: refundAmount,
      bookingId,
      pnr,
      adminId: "usr-admin-test",
    });

    expect(refundResult.success).toBe(true);
    expect(refundResult.balanceAfter).toBe(userWalletBefore.balance + refundAmount);
    expect(refundResult.transaction.type).toBe("REFUND_CREDIT");

    // Idempotency: Attempting duplicate refund for same booking must be rejected
    await expect(
      refundBookingToWallet({
        userId: testUserId,
        amount: refundAmount,
        bookingId,
        pnr,
      })
    ).rejects.toThrow(/already.*refunded/i);
  });

  it("should support authorized admin wallet adjustments", async () => {
    const adjustAmount = 5000;
    const initialWallet = await getUserWallet(testUserId);

    const adjustResult = await adjustUserWallet({
      userId: testUserId,
      direction: "CREDIT",
      amount: adjustAmount,
      reason: "Simulation bonus compensation",
      adminId: "usr-admin-test",
    });

    expect(adjustResult.success).toBe(true);
    expect(adjustResult.balanceAfter).toBe(initialWallet.balance + adjustAmount);
    expect(adjustResult.transaction.type).toBe("ADMIN_ADJUSTMENT");
  });

  it("should track admin wallet telemetry and activity", async () => {
    const activity = await getAdminWalletActivity({ page: 1, pageSize: 10 });
    expect(activity).toBeDefined();
    expect(activity.totalTopUps).toBeGreaterThanOrEqual(1);
    expect(activity.transactions.length).toBeGreaterThanOrEqual(1);
  });

  it("should initialize admin user wallet with ₹600 Billion capital", async () => {
    const adminWallet = await getUserWallet("usr-super-admin");
    expect(adminWallet.balance).toBeGreaterThanOrEqual(600_000_000_000);
  });
});
