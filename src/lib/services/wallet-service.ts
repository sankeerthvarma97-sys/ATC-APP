import { Prisma } from "@prisma/client";
import { prisma, shouldUseDatabase } from "@/lib/prisma";
import type { CreditTransactionDTO, CreditTransactionType } from "@/lib/domain";
import { logAuditEvent } from "./audit-service";
import { recordCompanyRevenue } from "./company-finance-service";

export const WALLET_CONFIG = {
  MIN_TOP_UP: 100.0,
  MAX_TOP_UP: 1_000_000_000_000.0, // ₹1,000 Billion (₹1 Trillion)
  MAX_WALLET_BALANCE: 1_000_000_000_000.0, // ₹1,000 Billion (₹1 Trillion)
};

export const QUICK_AMOUNTS = [1_000, 5_000, 10_000, 25_000, 50_000, 100_000];

function decimalAmount(amount: number | string): Prisma.Decimal {
  const value = typeof amount === "number" ? amount.toString() : amount.trim();
  if (!value || !/^\d+(\.\d{1,2})?$/.test(value) || new Prisma.Decimal(value).lessThanOrEqualTo(0)) {
    throw new Error("Invalid amount. Amount must be a finite positive number.");
  }
  return new Prisma.Decimal(value);
}

function numberAmount(amount: Prisma.Decimal | number): number {
  return amount instanceof Prisma.Decimal ? amount.toNumber() : amount;
}

// In-memory fallback stores
const memoryBalances: Map<string, number> = new Map();
const memoryTransactions: CreditTransactionDTO[] = [];

function isAdminUserId(userId: string): boolean {
  const lower = (userId || "").toLowerCase();
  return (
    lower.includes("admin") ||
    lower.includes("super") ||
    lower.includes("opsmgr")
  );
}

function getDefaultBalance(userId: string): number {
  return isAdminUserId(userId) ? 600_000_000_000.0 : 0.0;
}

/**
 * Get current user wallet balance and summary.
 */
export async function getUserWallet(userId: string): Promise<{
  balance: number;
  walletMode: "NORMAL" | "UNLIMITED_SIMULATION";
  totalAdded: number;
  totalSpent: number;
  totalRefunded: number;
  recentTransactions: CreditTransactionDTO[];
}> {
  if (shouldUseDatabase()) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { creditBalance: true, walletMode: true },
      });

      const balance = user ? numberAmount(user.creditBalance) : 0.0;

      const [topUpsAgg, spentAgg, refundAgg, txRecords] = await Promise.all([
        prisma.creditTransaction.aggregate({
          where: { userId, type: { in: ["SIMULATION_TOP_UP", "CREDIT", "BONUS"] } },
          _sum: { amount: true },
        }),
        prisma.creditTransaction.aggregate({
          where: { userId, type: { in: ["BOOKING_DEBIT", "TICKET_PAYMENT"] } },
          _sum: { amount: true },
        }),
        prisma.creditTransaction.aggregate({
          where: { userId, type: { in: ["REFUND", "REFUND_CREDIT"] } },
          _sum: { amount: true },
        }),
        prisma.creditTransaction.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

      const recentTransactions: CreditTransactionDTO[] = txRecords.map((t) => ({
        id: t.id,
        userId: t.userId,
        type: t.type as CreditTransactionType,
        amount: numberAmount(t.amount),
        balanceBefore: numberAmount(t.balanceBefore),
        balanceAfter: numberAmount(t.balanceAfter),
        referenceType: t.referenceType ?? undefined,
        referenceId: t.referenceId ?? undefined,
        description: t.description ?? undefined,
        status: t.status,
        unlimitedMode: t.unlimitedMode,
        createdAt: t.createdAt.toISOString(),
      }));

      return {
        balance,
        totalAdded: numberAmount(topUpsAgg._sum.amount || 0),
        totalSpent: numberAmount(spentAgg._sum.amount || 0),
        totalRefunded: numberAmount(refundAgg._sum.amount || 0),
        walletMode: user?.walletMode ?? "NORMAL",
        recentTransactions,
      };
    } catch (err) {
      console.warn("Database getUserWallet failed; using memory", err);
    }
  }

  // Memory fallback
  const balance = memoryBalances.get(userId) ?? getDefaultBalance(userId);
  const userTxs = memoryTransactions.filter((t) => t.userId === userId);

  let totalAdded = 0;
  let totalSpent = 0;
  let totalRefunded = 0;

  for (const t of userTxs) {
    if (t.type === "SIMULATION_TOP_UP" || t.type === "CREDIT" || t.type === "BONUS") {
      totalAdded += t.amount;
    } else if (t.type === "BOOKING_DEBIT" || t.type === "TICKET_PAYMENT") {
      totalSpent += t.amount;
    } else if (t.type === "REFUND" || t.type === "REFUND_CREDIT") {
      totalRefunded += t.amount;
    }
  }

  return {
    balance,
    walletMode: "NORMAL",
    totalAdded,
    totalSpent,
    totalRefunded,
    recentTransactions: userTxs.slice(0, 10),
  };
}

/**
 * Top up simulation wallet funds with strict limit enforcement.
 * Server obtains the authenticated user and calculates all balances.
 * Client NEVER controls balances.
 */
export async function topUpUserWallet(input: {
  userId: string;
  amount: number | string;
  idempotencyKey?: string;
}): Promise<{
  balanceBefore: number;
  balanceAfter: number;
  transaction: CreditTransactionDTO;
}> {
  const { userId, amount } = input;

  const decimalTopUp = decimalAmount(amount);
  const numericAmount = decimalTopUp.toNumber();

  if (decimalTopUp.lessThan(WALLET_CONFIG.MIN_TOP_UP.toString())) {
    throw new Error(`Minimum top-up amount is ₹${WALLET_CONFIG.MIN_TOP_UP.toLocaleString()}.`);
  }

  if (decimalTopUp.greaterThan(WALLET_CONFIG.MAX_TOP_UP.toString())) {
    throw new Error(`Maximum top-up per transaction is ₹${WALLET_CONFIG.MAX_TOP_UP.toLocaleString()}.`);
  }

  if (shouldUseDatabase()) {
    return await prisma.$transaction(async (tx) => {
      if (input.idempotencyKey) {
        const existing = await tx.creditTransaction.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
        if (existing) {
          return {
            balanceBefore: numberAmount(existing.balanceBefore),
            balanceAfter: numberAmount(existing.balanceAfter),
            transaction: {
              id: existing.id,
              userId: existing.userId,
              type: existing.type as CreditTransactionType,
              amount: numberAmount(existing.amount),
              balanceBefore: numberAmount(existing.balanceBefore),
              balanceAfter: numberAmount(existing.balanceAfter),
              referenceType: existing.referenceType ?? undefined,
              referenceId: existing.referenceId ?? undefined,
              description: existing.description ?? undefined,
              status: existing.status,
              unlimitedMode: existing.unlimitedMode,
              createdAt: existing.createdAt.toISOString(),
            },
          };
        }
      }
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, creditBalance: true, walletMode: true },
      });

      if (!user) throw new Error("User account not found.");

      const balanceBefore = user.creditBalance;
      const balanceAfter = balanceBefore.add(decimalTopUp);
      if (balanceAfter.greaterThan(new Prisma.Decimal(WALLET_CONFIG.MAX_WALLET_BALANCE.toString()))) {
        throw new Error(
          `Wallet balance cannot exceed ₹${WALLET_CONFIG.MAX_WALLET_BALANCE.toLocaleString()}. Current balance: ₹${balanceBefore.toLocaleString()}`
        );
      }

      await tx.user.update({
        where: { id: userId },
        data: { creditBalance: balanceAfter },
      });

      const txRecord = await tx.creditTransaction.create({
        data: {
          userId,
          type: "SIMULATION_TOP_UP",
          amount: decimalTopUp,
          balanceBefore,
          balanceAfter,
          referenceType: "SIMULATION_WALLET",
          description: `Simulation money top-up (₹${numericAmount.toLocaleString("en-IN")})`,
          idempotencyKey: input.idempotencyKey,
          unlimitedMode: user.walletMode === "UNLIMITED_SIMULATION",
        },
      });

      await logAuditEvent({
        actorId: userId,
        actorName: user.name,
        action: "SIMULATION_WALLET_TOP_UP",
        entity: "USER_WALLET",
        entityId: userId,
        before: { balance: balanceBefore },
        after: { balance: balanceAfter, amount },
      });

      const dto: CreditTransactionDTO = {
        id: txRecord.id,
        userId: txRecord.userId,
        type: txRecord.type as CreditTransactionType,
        amount: numberAmount(txRecord.amount),
        balanceBefore: numberAmount(txRecord.balanceBefore),
        balanceAfter: numberAmount(txRecord.balanceAfter),
        referenceType: txRecord.referenceType ?? undefined,
        description: txRecord.description ?? undefined,
        status: txRecord.status,
        unlimitedMode: txRecord.unlimitedMode,
        createdAt: txRecord.createdAt.toISOString(),
      };

      return { balanceBefore: numberAmount(balanceBefore), balanceAfter: numberAmount(balanceAfter), transaction: dto };
    });
  }

  // Memory fallback
  const curBal = memoryBalances.get(userId) ?? getDefaultBalance(userId);
  if (curBal + numericAmount > WALLET_CONFIG.MAX_WALLET_BALANCE) {
    throw new Error(`Wallet balance cannot exceed ₹${WALLET_CONFIG.MAX_WALLET_BALANCE.toLocaleString()}`);
  }

  const balanceAfter = curBal + numericAmount;
  memoryBalances.set(userId, balanceAfter);

  const memTx: CreditTransactionDTO = {
    id: `ctx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId,
    type: "SIMULATION_TOP_UP",
    amount: numericAmount,
    balanceBefore: curBal,
    balanceAfter,
    referenceType: "SIMULATION_WALLET",
    description: `Simulation money top-up (₹${amount.toLocaleString()})`,
    createdAt: new Date().toISOString(),
  };

  memoryTransactions.unshift(memTx);
  return { balanceBefore: curBal, balanceAfter, transaction: memTx };
}

/**
 * Debit user wallet for booking and atomically credit company ticket revenue.
 */
export async function payBookingWithWallet(input: {
  userId: string;
  bookingId: string;
  pnr: string;
  fare?: number;
  amount?: number;
  flightCallsign?: string;
  flightNumber?: string;
  seatNumber?: string;
}): Promise<{
  success: boolean;
  balanceBefore: number;
  balanceAfter: number;
  transaction: CreditTransactionDTO;
}> {
  const fare = input.fare ?? input.amount ?? 0;
  const flightCallsign = input.flightCallsign || input.flightNumber || "FLT";
  const seatNumber = input.seatNumber || "1A";
  const { userId, pnr } = input;

  if (fare <= 0) throw new Error("Invalid fare amount.");

  if (shouldUseDatabase()) {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, creditBalance: true, walletMode: true },
      });

      if (!user) throw new Error("User account not found.");
      const decimalFare = decimalAmount(fare);
      const isUnlimited = user.walletMode === "UNLIMITED_SIMULATION";

      if (!isUnlimited && user.creditBalance.lessThan(decimalFare)) {
        throw new Error(
          `Insufficient wallet balance. Available: ₹${user.creditBalance.toLocaleString()}, Required: ₹${fare.toLocaleString()}`
        );
      }

      const balanceBefore = user.creditBalance;
      const balanceAfter = isUnlimited && balanceBefore.lessThan(decimalFare)
        ? new Prisma.Decimal("100000000000.00")
        : balanceBefore.sub(decimalFare);

      // Update user wallet
      await tx.user.update({
        where: { id: userId },
        data: { creditBalance: balanceAfter },
      });

      // Record wallet debit transaction
      const debitTx = await tx.creditTransaction.create({
        data: {
          userId,
          type: "BOOKING_DEBIT",
          amount: decimalFare,
          balanceBefore,
          balanceAfter,
          referenceType: "BOOKING",
          referenceId: pnr,
          description: `Ticket payment for flight ${flightCallsign} (Seat ${seatNumber}, PNR ${pnr})`,
          unlimitedMode: isUnlimited,
        },
      });

      // Credit Company Revenue Account
      let revAcc = await tx.financialAccount.findUnique({
        where: { accountNumber: "AOCC-REV-01" },
      });
      if (!revAcc) {
        revAcc = await tx.financialAccount.create({
          data: {
            accountNumber: "AOCC-REV-01",
            accountName: "AOCC REVENUE ACCOUNT",
            accountType: "REVENUE_ACCOUNT",
            currency: "INR",
            balance: fare,
          },
        });
      } else {
        await tx.financialAccount.update({
          where: { id: revAcc.id },
          data: { balance: { increment: fare } },
        });
      }

      // Record Company Financial Ledger Transaction
      await tx.financialTransaction.create({
        data: {
          transactionNumber: `FTX-TKT-${Date.now()}-${pnr}`,
          type: "REVENUE",
          category: "TICKET_SALE",
          amount: fare,
          currency: "INR",
          direction: "CREDIT",
          destinationAccountId: revAcc.id,
          referenceType: "BOOKING",
          referenceId: pnr,
          description: `Ticket revenue from passenger ${user.name} for ${flightCallsign}`,
          status: "COMPLETED",
          createdBy: "BOOKING_SYSTEM",
        },
      });

      await logAuditEvent({
        actorId: userId,
        actorName: user.name,
        action: "TICKET_PAYMENT",
        entity: "BOOKING",
        entityId: pnr,
        before: { balance: balanceBefore },
        after: { balance: balanceAfter, fare, pnr },
      });

      return {
        success: true,
        balanceBefore: numberAmount(balanceBefore),
        balanceAfter: numberAmount(balanceAfter),
        transaction: {
          id: debitTx.id,
          userId: debitTx.userId,
          type: debitTx.type,
          amount: Number(debitTx.amount),
          balanceBefore: Number(debitTx.balanceBefore),
          balanceAfter: Number(debitTx.balanceAfter),
          createdAt: debitTx.createdAt.toISOString(),
        },
      };
    });
  }

  // Memory fallback
  const curBal = memoryBalances.get(userId) ?? getDefaultBalance(userId);
  if (curBal < fare) {
    throw new Error(`Insufficient wallet balance. Available: ₹${curBal.toLocaleString()}, Required: ₹${fare.toLocaleString()}`);
  }

  const balanceAfter = curBal - fare;
  memoryBalances.set(userId, balanceAfter);

  const memTx: CreditTransactionDTO = {
    id: `ctx-${Date.now()}`,
    userId,
    type: "BOOKING_DEBIT",
    amount: fare,
    balanceBefore: curBal,
    balanceAfter,
    referenceType: "BOOKING",
    referenceId: pnr,
    description: `Ticket payment for flight ${flightCallsign} (PNR ${pnr})`,
    createdAt: new Date().toISOString(),
  };
  memoryTransactions.unshift(memTx);

  await recordCompanyRevenue({
    category: "TICKET_SALE",
    amount: fare,
    referenceType: "BOOKING",
    referenceId: pnr,
    description: `Ticket revenue for PNR ${pnr}`,
  });

  return { success: true, balanceBefore: curBal, balanceAfter, transaction: memTx };
}

/**
 * Idempotent refund from Company Refund Account to User Wallet.
 */
export async function refundBookingToWallet(input: {
  userId: string;
  bookingId?: string;
  pnr: string;
  fare?: number;
  amount?: number;
  reason?: string;
  adminId?: string;
  adminName?: string;
}): Promise<{
  success: boolean;
  balanceBefore: number;
  balanceAfter: number;
  transaction: CreditTransactionDTO;
}> {
  const fare = input.fare ?? input.amount ?? 0;
  const { userId, pnr, reason, adminId, adminName } = input;
  if (fare <= 0) throw new Error("Invalid refund amount.");

  if (shouldUseDatabase()) {
    return await prisma.$transaction(async (tx) => {
      // 1. Idempotency check: check if already refunded
      const existingRefund = await tx.creditTransaction.findFirst({
        where: {
          userId,
          referenceType: "BOOKING_REFUND",
          referenceId: pnr,
        },
      });

      if (existingRefund) {
        throw new Error(`Booking ${pnr} has already been refunded.`);
      }

      // 2. Fetch user
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, creditBalance: true },
      });
      if (!user) throw new Error("User account not found.");

      const decimalFare = decimalAmount(fare);
      const balanceBefore = user.creditBalance;
      const balanceAfter = balanceBefore.add(decimalFare);

      // 3. Debit Company Refund Account
      const refundAcc = await tx.financialAccount.findUnique({
        where: { accountNumber: "AOCC-REFUND-01" },
      });

      if (refundAcc && refundAcc.balance.greaterThanOrEqualTo(fare)) {
        await tx.financialAccount.update({
          where: { id: refundAcc.id },
          data: { balance: { decrement: fare } },
        });

        await tx.financialTransaction.create({
          data: {
            transactionNumber: `FTX-REF-${Date.now()}-${pnr}`,
            type: "REFUND",
            category: "BOOKING_REFUND",
            amount: decimalFare,
            currency: "INR",
            direction: "DEBIT",
            sourceAccountId: refundAcc.id,
            referenceType: "BOOKING_REFUND",
            referenceId: pnr,
            description: `Refund to ${user.name} for cancelled booking ${pnr}`,
            status: "COMPLETED",
            createdBy: adminName || "SYSTEM",
          },
        });
      }

      // 4. Credit User Wallet
      await tx.user.update({
        where: { id: userId },
        data: { creditBalance: balanceAfter },
      });

      const txRecord = await tx.creditTransaction.create({
        data: {
          userId,
          type: "REFUND_CREDIT",
          amount: decimalFare,
          balanceBefore,
          balanceAfter,
          referenceType: "BOOKING_REFUND",
          referenceId: pnr,
          description: reason || `Refund for cancelled booking ${pnr}`,
        },
      });

      await logAuditEvent({
        actorId: adminId || userId,
        actorName: adminName || user.name,
        action: "REFUND_CREATED",
        entity: "USER_WALLET",
        entityId: pnr,
        before: { balance: balanceBefore },
        after: { balance: balanceAfter, amount: fare, pnr },
      });

      const dto: CreditTransactionDTO = {
        id: txRecord.id,
        userId: txRecord.userId,
        type: txRecord.type as CreditTransactionType,
        amount: numberAmount(txRecord.amount),
        balanceBefore: numberAmount(txRecord.balanceBefore),
        balanceAfter: numberAmount(txRecord.balanceAfter),
        referenceType: txRecord.referenceType ?? undefined,
        referenceId: txRecord.referenceId ?? undefined,
        description: txRecord.description ?? undefined,
        createdAt: txRecord.createdAt.toISOString(),
      };

      return { success: true, balanceBefore: numberAmount(balanceBefore), balanceAfter: numberAmount(balanceAfter), transaction: dto };
    });
  }

  // Memory fallback
  if (memoryTransactions.some((t) => t.referenceId === pnr && t.referenceType === "BOOKING_REFUND")) {
    throw new Error(`Booking ${pnr} has already been refunded.`);
  }

  const curBal = memoryBalances.get(userId) ?? getDefaultBalance(userId);
  const balanceAfter = curBal + fare;
  memoryBalances.set(userId, balanceAfter);

  const memTx: CreditTransactionDTO = {
    id: `ctx-${Date.now()}`,
    userId,
    type: "REFUND_CREDIT",
    amount: fare,
    balanceBefore: curBal,
    balanceAfter,
    referenceType: "BOOKING_REFUND",
    referenceId: pnr,
    description: reason || `Refund for cancelled booking ${pnr}`,
    createdAt: new Date().toISOString(),
  };

  memoryTransactions.unshift(memTx);
  return { success: true, balanceBefore: curBal, balanceAfter, transaction: memTx };
}

/**
 * Admin Wallet Activity Telemetry.
 */
export async function getAdminWalletActivity(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<{
  totalTopUps: number;
  todayTopUps: number;
  totalSimulationMoneyCreated: number;
  totalUsers: number;
  averageTopUp: number;
  largestTopUp: number;
  transactions: CreditTransactionDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const page = Math.max(1, params?.page || 1);
  const pageSize = Math.min(100, Math.max(1, params?.pageSize || 20));
  const skip = (page - 1) * pageSize;

  if (shouldUseDatabase()) {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [topUpsAgg, todayTopUpsAgg, maxAgg, usersCount, totalCount, records] = await Promise.all([
        prisma.creditTransaction.aggregate({
          where: { type: "SIMULATION_TOP_UP" },
          _sum: { amount: true },
          _count: { id: true },
        }),
        prisma.creditTransaction.aggregate({
          where: { type: "SIMULATION_TOP_UP", createdAt: { gte: todayStart } },
          _sum: { amount: true },
        }),
        prisma.creditTransaction.aggregate({
          where: { type: "SIMULATION_TOP_UP" },
          _max: { amount: true },
        }),
        prisma.user.count(),
        prisma.creditTransaction.count({ where: { type: "SIMULATION_TOP_UP" } }),
        prisma.creditTransaction.findMany({
          where: { type: "SIMULATION_TOP_UP" },
          orderBy: { createdAt: "desc" },
          skip,
          take: pageSize,
          include: { user: { select: { name: true, email: true } } },
        }),
      ]);

      const totalSimMoney = numberAmount(topUpsAgg._sum.amount || 0);
      const count = topUpsAgg._count.id || 0;
      const averageTopUp = count > 0 ? totalSimMoney / count : 0;

      const transactions: CreditTransactionDTO[] = records.map((r) => ({
        id: r.id,
        userId: r.userId,
        userName: r.user.name,
        userEmail: r.user.email,
        type: r.type as CreditTransactionType,
        amount: numberAmount(r.amount),
        balanceBefore: numberAmount(r.balanceBefore),
        balanceAfter: numberAmount(r.balanceAfter),
        referenceType: r.referenceType ?? undefined,
        description: r.description ?? undefined,
        createdAt: r.createdAt.toISOString(),
      }));

      return {
        totalTopUps: count,
        todayTopUps: numberAmount(todayTopUpsAgg._sum.amount || 0),
        totalSimulationMoneyCreated: totalSimMoney,
        totalUsers: usersCount,
        averageTopUp,
        largestTopUp: numberAmount(maxAgg._max.amount || 0),
        transactions,
        total: totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize) || 1,
      };
    } catch (err) {
      console.warn("Database getAdminWalletActivity failed; using memory", err);
    }
  }

  const topUps = memoryTransactions.filter((t) => t.type === "SIMULATION_TOP_UP");
  const total = topUps.length;
  const paged = topUps.slice(skip, skip + pageSize);
  const totalSim = topUps.reduce((sum, t) => sum + t.amount, 0);

  return {
    totalTopUps: total,
    todayTopUps: totalSim,
    totalSimulationMoneyCreated: totalSim,
    totalUsers: memoryBalances.size,
    averageTopUp: total > 0 ? totalSim / total : 0,
    largestTopUp: topUps.reduce((max, t) => Math.max(max, t.amount), 0),
    transactions: paged,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

/**
 * Admin Wallet Adjustment.
 */
export async function adjustUserWallet(input: {
  userId: string;
  direction: "CREDIT" | "DEBIT";
  amount: number | string;
  reason: string;
  adminId: string;
  reference?: string;
  idempotencyKey?: string;
}): Promise<{
  success: boolean;
  balanceBefore: number;
  balanceAfter: number;
  transaction: CreditTransactionDTO;
}> {
  const { userId, direction, amount, reason, adminId } = input;
  const decimalAdjustment = decimalAmount(amount);

  if (shouldUseDatabase()) {
    return await prisma.$transaction(async (tx) => {
      if (input.idempotencyKey) {
        const existing = await tx.creditTransaction.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
        if (existing) {
          return {
            success: true,
            balanceBefore: numberAmount(existing.balanceBefore),
            balanceAfter: numberAmount(existing.balanceAfter),
            transaction: {
              id: existing.id,
              userId: existing.userId,
              type: existing.type as CreditTransactionType,
              amount: numberAmount(existing.amount),
              balanceBefore: numberAmount(existing.balanceBefore),
              balanceAfter: numberAmount(existing.balanceAfter),
              referenceType: existing.referenceType ?? undefined,
              referenceId: existing.referenceId ?? undefined,
              description: existing.description ?? undefined,
              status: existing.status,
              unlimitedMode: existing.unlimitedMode,
              createdAt: existing.createdAt.toISOString(),
            },
          };
        }
      }
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, creditBalance: true },
      });

      if (!user) throw new Error("Target user not found.");

      const curBal = user.creditBalance;
      let balanceAfter = curBal;

      if (direction === "CREDIT") {
        balanceAfter = curBal.add(decimalAdjustment);
      } else {
        if (curBal.lessThan(decimalAdjustment)) {
          throw new Error(`Insufficient user wallet balance for debit. Current: ₹${curBal}`);
        }
        balanceAfter = curBal.sub(decimalAdjustment);
      }

      await tx.user.update({
        where: { id: userId },
        data: { creditBalance: balanceAfter },
      });

      const txRecord = await tx.creditTransaction.create({
        data: {
          userId,
          type: "ADMIN_ADJUSTMENT",
          amount: decimalAdjustment,
          balanceBefore: curBal,
          balanceAfter,
          referenceType: "ADMIN_ADJUSTMENT",
          referenceId: input.reference || adminId,
          description: `Admin ${direction}: ${reason}`,
          idempotencyKey: input.idempotencyKey,
        },
      });

      await logAuditEvent({
        actorId: adminId,
        actorName: "Administrator",
        action: "FINANCIAL_ADJUSTMENT",
        entity: "USER_WALLET",
        entityId: userId,
        before: { balance: curBal.toString() },
        after: { balance: balanceAfter.toString(), direction, amount: decimalAdjustment.toString(), reason },
      });

      return {
        success: true,
        balanceBefore: curBal.toNumber(),
        balanceAfter: balanceAfter.toNumber(),
        transaction: {
          id: txRecord.id,
          userId: txRecord.userId,
          userName: user.name,
          userEmail: user.email,
          type: txRecord.type,
          amount: Number(txRecord.amount),
          balanceBefore: Number(txRecord.balanceBefore),
          balanceAfter: Number(txRecord.balanceAfter),
          referenceType: txRecord.referenceType || undefined,
          referenceId: txRecord.referenceId || undefined,
          description: txRecord.description || undefined,
          createdAt: txRecord.createdAt.toISOString(),
        },
      };
    });
  }

  // Memory fallback
  const curBal = memoryBalances.get(userId) ?? getDefaultBalance(userId);
  const numericAdjustment = decimalAdjustment.toNumber();
  let balanceAfter = curBal;
  if (direction === "CREDIT") {
    balanceAfter = curBal + numericAdjustment;
  } else {
    if (curBal < numericAdjustment) {
      throw new Error(`Insufficient wallet balance. Current: ₹${curBal}`);
    }
    balanceAfter = curBal - numericAdjustment;
  }
  memoryBalances.set(userId, balanceAfter);

  const memTx: CreditTransactionDTO = {
    id: `ctx-${Date.now()}`,
    userId,
    type: "ADMIN_ADJUSTMENT",
    amount: numericAdjustment,
    balanceBefore: curBal,
    balanceAfter,
    referenceType: "ADMIN_ADJUSTMENT",
    referenceId: adminId,
    description: `Admin ${direction}: ${reason}`,
    createdAt: new Date().toISOString(),
  };

  memoryTransactions.unshift(memTx);
  return { success: true, balanceBefore: curBal, balanceAfter, transaction: memTx };
}

/**
 * Configure user wallet mode (NORMAL vs UNLIMITED_SIMULATION).
 */
export async function setUserWalletMode(
  userId: string,
  mode: "NORMAL" | "UNLIMITED_SIMULATION"
): Promise<{
  success: boolean;
  walletMode: "NORMAL" | "UNLIMITED_SIMULATION";
  balance: number;
}> {
  if (shouldUseDatabase()) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, creditBalance: true, walletMode: true, name: true },
    });
    if (!user) throw new Error("User not found.");

    let newBalance = user.creditBalance;
    if (mode === "UNLIMITED_SIMULATION" && newBalance.lessThan(new Prisma.Decimal("10000000000.00"))) {
      newBalance = new Prisma.Decimal("100000000000.00"); // ₹100 Billion simulation reserve
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        walletMode: mode,
        creditBalance: newBalance,
      },
      select: { creditBalance: true, walletMode: true },
    });

    await logAuditEvent({
      actorId: userId,
      actorName: user.name,
      action: "WALLET_MODE_UPDATED",
      entity: "USER_WALLET",
      entityId: userId,
      before: { walletMode: user.walletMode },
      after: { walletMode: mode },
    });

    return {
      success: true,
      walletMode: updated.walletMode as "NORMAL" | "UNLIMITED_SIMULATION",
      balance: numberAmount(updated.creditBalance),
    };
  }

  // Memory mode
  const current = memoryBalances.get(userId) ?? getDefaultBalance(userId);
  const newBal = mode === "UNLIMITED_SIMULATION" && current < 100_000_000_000 ? 100_000_000_000 : current;
  memoryBalances.set(userId, newBal);
  return {
    success: true,
    walletMode: mode,
    balance: newBal,
  };
}
