import { describe, expect, it, beforeAll } from "vitest";
import {
  INITIAL_CAPITAL_AMOUNT,
  initializeCompanyTreasury,
  listFinancialAccounts,
  executeInternalTransfer,
  injectCompanyFunds,
  recordCompanyRevenue,
  recordCompanyExpense,
  getCompanyFinanceSummary,
  listFinancialTransactionsPaged,
} from "@/lib/services/company-finance-service";

describe("AOCC Company Finance, Treasury & Ledger System", () => {
  beforeAll(async () => {
    await initializeCompanyTreasury();
  });

  it("should initialize company treasury with ₹1,000 Billion initial capital", async () => {
    const { treasuryAccount } = await initializeCompanyTreasury();

    expect(treasuryAccount).toBeDefined();
    expect(treasuryAccount.accountNumber).toBe("AOCC-TREASURY-01");
    expect(treasuryAccount.balance).toBeGreaterThanOrEqual(INITIAL_CAPITAL_AMOUNT);
  });

  it("should list all company accounts with active status and non-negative balances", async () => {
    const accounts = await listFinancialAccounts();
    expect(accounts.length).toBeGreaterThanOrEqual(6);

    const accountTypes = accounts.map((a) => a.accountType);
    expect(accountTypes).toContain("COMPANY_TREASURY");
    expect(accountTypes).toContain("OPERATING_ACCOUNT");
    expect(accountTypes).toContain("PAYROLL_ACCOUNT");
    expect(accountTypes).toContain("REFUND_ACCOUNT");
    expect(accountTypes).toContain("REVENUE_ACCOUNT");
    expect(accountTypes).toContain("EXPENSE_ACCOUNT");

    for (const acc of accounts) {
      expect(acc.balance).toBeGreaterThanOrEqual(0);
      expect(acc.currency).toBe("INR");
      expect(acc.status).toBe("ACTIVE");
    }
  });

  it("should execute an atomic internal transfer between Treasury and Operating account", async () => {
    const accounts = await listFinancialAccounts();
    const treasury = accounts.find((a) => a.accountType === "COMPANY_TREASURY")!;
    const ops = accounts.find((a) => a.accountType === "OPERATING_ACCOUNT")!;

    const transferAmount = 250_000;
    const initialTreasuryBal = treasury.balance;
    const initialOpsBal = ops.balance;

    const result = await executeInternalTransfer({
      sourceAccountId: treasury.id,
      destinationAccountId: ops.id,
      amount: transferAmount,
      reason: "Test operational allocation",
      adminId: "usr-admin-test",
    });

    expect(result.success).toBe(true);
    expect(result.sourceBalanceAfter).toBe(initialTreasuryBal - transferAmount);
    expect(result.destBalanceAfter).toBe(initialOpsBal + transferAmount);
    expect(result.transaction.amount).toBe(transferAmount);
    expect(result.transaction.type).toBe("INTERNAL_TRANSFER");
    expect(result.transaction.status).toBe("COMPLETED");
  });

  it("should reject internal transfer when source account has insufficient balance", async () => {
    const accounts = await listFinancialAccounts();
    const refund = accounts.find((a) => a.accountType === "REFUND_ACCOUNT")!;
    const treasury = accounts.find((a) => a.accountType === "COMPANY_TREASURY")!;

    const excessiveAmount = refund.balance + 500_000_000;

    await expect(
      executeInternalTransfer({
        sourceAccountId: refund.id,
        destinationAccountId: treasury.id,
        amount: excessiveAmount,
        reason: "Excessive transfer attempt",
      })
    ).rejects.toThrow(/Insufficient funds/i);
  });

  it("should reject transfer between the exact same source and destination account", async () => {
    const accounts = await listFinancialAccounts();
    const treasury = accounts[0];

    await expect(
      executeInternalTransfer({
        sourceAccountId: treasury.id,
        destinationAccountId: treasury.id,
        amount: 10_000,
        reason: "Same account transfer",
      })
    ).rejects.toThrow(/identical/i);
  });

  it("should record company ticket revenue in Revenue Account", async () => {
    const amount = 9800;
    const revTx = await recordCompanyRevenue({
      type: "TICKET_SALE",
      amount,
      referenceType: "BOOKING",
      referenceId: "PNR-REV-TEST-01",
      description: "Flight reservation ticket sale",
    });

    expect(revTx).toBeDefined();
    expect(revTx.amount).toBe(amount);
    expect(revTx.type).toBe("REVENUE");
    expect(revTx.status).toBe("COMPLETED");
  });

  it("should record company expense and debit Operating Account", async () => {
    const amount = 45000;
    const expense = await recordCompanyExpense({
      category: "MAINTENANCE",
      amount,
      description: "Runway rubber removal test",
      reference: "PO-TEST-01",
    });

    expect(expense).toBeDefined();
    expect(expense.amount).toBe(amount);
    expect(expense.category).toBe("MAINTENANCE");
    expect(expense.status).toBe("APPROVED");
  });

  it("should reconcile net cash flow and balance summary accurately", async () => {
    const summary = await getCompanyFinanceSummary();

    expect(summary).toBeDefined();
    expect(summary.treasuryBalance).toBeGreaterThanOrEqual(0);
    expect(summary.totalCompanyBalance).toBeGreaterThanOrEqual(INITIAL_CAPITAL_AMOUNT);
    expect(summary.openingBalance).toBe(INITIAL_CAPITAL_AMOUNT);

    // Ledger transactions query
    const ledger = await listFinancialTransactionsPaged({ page: 1, pageSize: 10 });
    expect(ledger.transactions.length).toBeGreaterThan(0);
  });

  it("should support Admin capital injection (Billionaire Mode) to specific account and all accounts", async () => {
    // 1. Single account injection
    const singleRes = await injectCompanyFunds({
      accountId: "AOCC-TREASURY-01",
      amount: 500_000_000_000.0,
      reason: "Billionaire capital injection test",
      adminName: "Admin Tester",
    });

    expect(singleRes.success).toBe(true);
    expect(singleRes.injectedAmount).toBe(500_000_000_000.0);
    expect(singleRes.affectedAccounts.length).toBe(1);
    expect(singleRes.affectedAccounts[0].balance).toBeGreaterThanOrEqual(1_500_000_000_000.0);

    // 2. All accounts injection (Billionaire boost)
    const allRes = await injectCompanyFunds({
      targetAll: true,
      amount: 1_000_000_000_000.0,
      reason: "Billionaire mode unlimited money boost",
      adminName: "Admin Tester",
    });

    expect(allRes.success).toBe(true);
    expect(allRes.affectedAccounts.length).toBeGreaterThanOrEqual(5);
    expect(allRes.transactions.length).toBeGreaterThanOrEqual(5);
  });
});
