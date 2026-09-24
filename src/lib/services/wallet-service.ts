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
  totalAdded: number;
  totalSpent: number;
  totalRefunded: number;
  recentTransactions: CreditTransactionDTO[];
}> {
  if (shouldUseDatabase()) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { creditBalance: true },
      });

      const balance = user ? user.creditBalance : 0.0;

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
        amount: t.amount,
        balanceBefore: t.balanceBefore,
        balanceAfter: t.balanceAfter,
        referenceType: t.referenceType ?? undefined,
        referenceId: t.referenceId ?? undefined,
        description: t.description ?? undefined,
        createdAt: t.createdAt.toISOString(),
      }));

      return {
        balance,
        totalAdded: topUpsAgg._sum.amount || 0,
        totalSpent: spentAgg._sum.amount || 0,
        totalRefunded: refundAgg._sum.amount || 0,
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
  amount: number;
}): Promise<{
  balanceBefore: number;
  balanceAfter: number;
  transaction: CreditTransactionDTO;
}> {
  const { userId, amount } = input;

  if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
    throw new Error("Invalid top-up amount. Must be a positive number.");
  }

  if (amount < WALLET_CONFIG.MIN_TOP_UP) {
    throw new Error(`Minimum top-up amount is ₹${WALLET_CONFIG.MIN_TOP_UP.toLocaleString()}.`);
  }

  if (amount > WALLET_CONFIG.MAX_TOP_UP) {
    throw new Error(`Maximum top-up per transaction is ₹${WALLET_CONFIG.MAX_TOP_UP.toLocaleString()}.`);
  }

  if (shouldUseDatabase()) {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, creditBalance: true },
      });

      if (!user) throw new Error("User account not found.");

      const balanceBefore = user.creditBalance;
      if (balanceBefore + amount > WALLET_CONFIG.MAX_WALLET_BALANCE) {
        throw new Error(
          `Wallet balance cannot exceed ₹${WALLET_CONFIG.MAX_WALLET_BALANCE.toLocaleString()}. Current balance: ₹${balanceBefore.toLocaleString()}`
        );
      }

      const balanceAfter = balanceBefore + amount;

      await tx.user.update({
        where: { id: userId },
        data: { creditBalance: balanceAfter },
      });

      const txRecord = await tx.creditTransaction.create({
        data: {
          userId,
          type: "SIMULATION_TOP_UP",
          amount,
          balanceBefore,
          balanceAfter,
          referenceType: "SIMULATION_WALLET",
          description: `Simulation money top-up (₹${amount.toLocaleString()})`,
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
        amount: txRecord.amount,
        balanceBefore: txRecord.balanceBefore,
        balanceAfter: txRecord.balanceAfter,
        referenceType: txRecord.referenceType ?? undefined,
        description: txRecord.description ?? undefined,
        createdAt: txRecord.createdAt.toISOString(),
      };

      return { balanceBefore, balanceAfter, transaction: dto };
    });
  }

  // Memory fallback
  const curBal = memoryBalances.get(userId) ?? getDefaultBalance(userId);
  if (curBal + amount > WALLET_CONFIG.MAX_WALLET_BALANCE) {
    throw new Error(`Wallet balance cannot exceed ₹${WALLET_CONFIG.MAX_WALLET_BALANCE.toLocaleString()}`);
  }

  const balanceAfter = curBal + amount;
  memoryBalances.set(userId, balanceAfter);

  const memTx: CreditTransactionDTO = {
    id: `ctx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId,
    type: "SIMULATION_TOP_UP",
    amount,
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
        select: { id: true, name: true, creditBalance: true },
      });

      if (!user) throw new Error("User account not found.");
      if (user.creditBalance < fare) {
        throw new Error(
          `Insufficient wallet balance. Available: ₹${user.creditBalance.toLocaleString()}, Required: ₹${fare.toLocaleString()}`
        );
      }

      const balanceBefore = user.creditBalance;
      const balanceAfter = balanceBefore - fare;

      // Update user wallet
      await tx.user.update({
        where: { id: userId, creditBalance: { gte: fare } },
        data: { creditBalance: balanceAfter },
      });

      // Record wallet debit transaction
      const debitTx = await tx.creditTransaction.create({
        data: {
          userId,
          type: "BOOKING_DEBIT",
          amount: fare,
          balanceBefore,
          balanceAfter,
          referenceType: "BOOKING",
          referenceId: pnr,
          description: `Ticket payment for flight ${flightCallsign} (Seat ${seatNumber}, PNR ${pnr})`,
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
        balanceBefore,
        balanceAfter,
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

      const balanceBefore = user.creditBalance;
      const balanceAfter = balanceBefore + fare;

      // 3. Debit Company Refund Account
      let refundAcc = await tx.financialAccount.findUnique({
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
            amount: fare,
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
          amount: fare,
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
        amount: txRecord.amount,
        balanceBefore: txRecord.balanceBefore,
        balanceAfter: txRecord.balanceAfter,
        referenceType: txRecord.referenceType ?? undefined,
        referenceId: txRecord.referenceId ?? undefined,
        description: txRecord.description ?? undefined,
        createdAt: txRecord.createdAt.toISOString(),
      };

      return { success: true, balanceBefore, balanceAfter, transaction: dto };
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

      const totalSimMoney = topUpsAgg._sum.amount || 0;
      const count = topUpsAgg._count.id || 0;
      const averageTopUp = count > 0 ? totalSimMoney / count : 0;

      const transactions: CreditTransactionDTO[] = records.map((r) => ({
        id: r.id,
        userId: r.userId,
        userName: r.user.name,
        userEmail: r.user.email,
        type: r.type as CreditTransactionType,
        amount: r.amount,
        balanceBefore: r.balanceBefore,
        balanceAfter: r.balanceAfter,
        referenceType: r.referenceType ?? undefined,
        description: r.description ?? undefined,
        createdAt: r.createdAt.toISOString(),
      }));

      return {
        totalTopUps: count,
        todayTopUps: todayTopUpsAgg._sum.amount || 0,
        totalSimulationMoneyCreated: totalSimMoney,
        totalUsers: usersCount,
        averageTopUp,
        largestTopUp: maxAgg._max.amount || 0,
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
  amount: number;
  reason: string;
  adminId: string;
}): Promise<{
  success: boolean;
  balanceBefore: number;
  balanceAfter: number;
  transaction: CreditTransactionDTO;
}> {
  const { userId, direction, amount, reason, adminId } = input;
  if (amount <= 0) {
    throw new Error("Adjustment amount must be positive.");
  }

  if (shouldUseDatabase()) {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, creditBalance: true },
      });

      if (!user) throw new Error("Target user not found.");

      const curBal = Number(user.creditBalance);
      let balanceAfter = curBal;

      if (direction === "CREDIT") {
        balanceAfter = curBal + amount;
      } else {
        if (curBal < amount) {
          throw new Error(`Insufficient user wallet balance for debit. Current: ₹${curBal}`);
        }
        balanceAfter = curBal - amount;
      }

      await tx.user.update({
        where: { id: userId },
        data: { creditBalance: balanceAfter },
      });

      const txRecord = await tx.creditTransaction.create({
        data: {
          userId,
          type: "ADMIN_ADJUSTMENT",
          amount,
          balanceBefore: curBal,
          balanceAfter,
          referenceType: "ADMIN_ADJUSTMENT",
          referenceId: adminId,
          description: `Admin ${direction}: ${reason}`,
        },
      });

      await logAuditEvent({
        actorId: adminId,
        actorName: "Administrator",
        action: "FINANCIAL_ADJUSTMENT",
        entity: "USER_WALLET",
        entityId: userId,
        before: { balance: curBal },
        after: { balance: balanceAfter, direction, amount, reason },
      });

      return {
        success: true,
        balanceBefore: curBal,
        balanceAfter,
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
  let balanceAfter = curBal;
  if (direction === "CREDIT") {
    balanceAfter = curBal + amount;
  } else {
    if (curBal < amount) {
      throw new Error(`Insufficient wallet balance. Current: ₹${curBal}`);
    }
    balanceAfter = curBal - amount;
  }
  memoryBalances.set(userId, balanceAfter);

  const memTx: CreditTransactionDTO = {
    id: `ctx-${Date.now()}`,
    userId,
    type: "ADMIN_ADJUSTMENT",
    amount,
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
