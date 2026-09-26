import { Prisma } from "@prisma/client";
import { prisma, shouldUseDatabase } from "@/lib/prisma";
import type {
  AccountStatus,
  FinancialAccountDTO,
  FinancialAccountType,
  FinancialTransactionDTO,
  FinancialTransactionType,
  TransactionDirection,
  TransactionStatus,
  CompanyExpenseDTO,
  ExpenseCategory,
  CompanyFinanceSummaryDTO,
  FinanceConfigDTO,
} from "@/lib/domain";
import { logAuditEvent } from "./audit-service";

export const INITIAL_CAPITAL_AMOUNT = 100_000_000.0; // ₹10 Crore initial capital

// Memory fallback store for non-DB environments
interface MemoryAccount {
  id: string;
  accountNumber: string;
  accountName: string;
  accountType: FinancialAccountType;
  currency: string;
  balance: number;
  status: "ACTIVE" | "FROZEN" | "CLOSED";
  createdAt: string;
  updatedAt: string;
}

const memoryAccounts: Map<string, MemoryAccount> = new Map();
const memoryTransactions: FinancialTransactionDTO[] = [];
const memoryExpenses: CompanyExpenseDTO[] = [];

const memoryFinanceConfig: FinanceConfigDTO = {
  id: "default",
  initialCapital: INITIAL_CAPITAL_AMOUNT,
  autoPayrollEnabled: true,
  payrollFrequency: "MONTHLY",
  payrollPaymentDay: 30,
  payrollPaymentTime: "09:00",
  payrollTimezone: "Asia/Kolkata",
  approvalRequired: false,
  minWalletTopUp: 100.0,
  maxWalletTopUp: 1_000_000_000_000.0, // ₹1,000 Billion
  maxWalletBalance: 1_000_000_000_000.0, // ₹1,000 Billion
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Ensures core company financial accounts are initialized with initial simulation capital.
 * Idempotent: Can be run multiple times safely.
 */
export async function initializeCompanyTreasury(): Promise<{
  treasuryAccount: FinancialAccountDTO;
  operatingAccount: FinancialAccountDTO;
  payrollAccount: FinancialAccountDTO;
  refundAccount: FinancialAccountDTO;
  revenueAccount: FinancialAccountDTO;
  expenseAccount: FinancialAccountDTO;
}> {
  if (shouldUseDatabase()) {
    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Treasury Account
        let treasury = await tx.financialAccount.findUnique({
          where: { accountNumber: "AOCC-TREASURY-01" },
        });

        if (!treasury) {
          treasury = await tx.financialAccount.create({
            data: {
              accountNumber: "AOCC-TREASURY-01",
              accountName: "AOCC COMPANY TREASURY",
              accountType: "COMPANY_TREASURY",
              currency: "INR",
              balance: new Prisma.Decimal(INITIAL_CAPITAL_AMOUNT),
              status: "ACTIVE",
            },
          });

          // Immutable initial capital ledger transaction
          await tx.financialTransaction.create({
            data: {
              transactionNumber: `FTX-INIT-${Date.now()}`,
              type: "INITIAL_CAPITAL",
              category: "INITIAL_CAPITAL_CREATED",
              amount: new Prisma.Decimal(INITIAL_CAPITAL_AMOUNT),
              currency: "INR",
              direction: "CREDIT",
              destinationAccountId: treasury.id,
              referenceType: "INITIAL_CAPITAL",
              referenceId: "AOCC-TREASURY-01",
              description: "Initial Fictional Airport Simulation Capital (₹10 Crore)",
              status: "COMPLETED",
              createdBy: "SYSTEM_BOOTSTRAP",
              metadata: {
                label: "INITIAL SIMULATION CAPITAL",
                approvedBy: "BOARD_OF_DIRECTORS",
              },
            },
          });

          await logAuditEvent({
            action: "INITIAL_CAPITAL_CREATED",
            entity: "COMPANY_FINANCE",
            entityId: treasury.id,
            after: {
              account: "AOCC-TREASURY-01",
              amount: INITIAL_CAPITAL_AMOUNT,
              currency: "INR",
            },
          });
        }

        // 2. Operating Account
        let operating = await tx.financialAccount.findUnique({
          where: { accountNumber: "AOCC-OPS-01" },
        });
        if (!operating) {
          operating = await tx.financialAccount.create({
            data: {
              accountNumber: "AOCC-OPS-01",
              accountName: "AOCC OPERATING ACCOUNT",
              accountType: "OPERATING_ACCOUNT",
              currency: "INR",
              balance: new Prisma.Decimal(5_000_000.0),
              status: "ACTIVE",
            },
          });
        }

        // 3. Payroll Account
        let payroll = await tx.financialAccount.findUnique({
          where: { accountNumber: "AOCC-PAYROLL-01" },
        });
        if (!payroll) {
          payroll = await tx.financialAccount.create({
            data: {
              accountNumber: "AOCC-PAYROLL-01",
              accountName: "AOCC PAYROLL ACCOUNT",
              accountType: "PAYROLL_ACCOUNT",
              currency: "INR",
              balance: new Prisma.Decimal(50_000_000.0),
              status: "ACTIVE",
            },
          });
        }

        // 4. Refund Account
        let refund = await tx.financialAccount.findUnique({
          where: { accountNumber: "AOCC-REFUND-01" },
        });
        if (!refund) {
          refund = await tx.financialAccount.create({
            data: {
              accountNumber: "AOCC-REFUND-01",
              accountName: "AOCC REFUND ACCOUNT",
              accountType: "REFUND_ACCOUNT",
              currency: "INR",
              balance: new Prisma.Decimal(2_000_000.0),
              status: "ACTIVE",
            },
          });
        }

        // 5. Revenue Account
        let revenue = await tx.financialAccount.findUnique({
          where: { accountNumber: "AOCC-REV-01" },
        });
        if (!revenue) {
          revenue = await tx.financialAccount.create({
            data: {
              accountNumber: "AOCC-REV-01",
              accountName: "AOCC REVENUE ACCOUNT",
              accountType: "REVENUE_ACCOUNT",
              currency: "INR",
              balance: new Prisma.Decimal(0.0),
              status: "ACTIVE",
            },
          });
        }

        // 6. Expense Account
        let expense = await tx.financialAccount.findUnique({
          where: { accountNumber: "AOCC-EXP-01" },
        });
        if (!expense) {
          expense = await tx.financialAccount.create({
            data: {
              accountNumber: "AOCC-EXP-01",
              accountName: "AOCC EXPENSE ACCOUNT",
              accountType: "EXPENSE_ACCOUNT",
              currency: "INR",
              balance: new Prisma.Decimal(0.0),
              status: "ACTIVE",
            },
          });
        }

        const mapAccount = (acc: {
          id: string;
          accountNumber: string;
          accountName: string;
          accountType: FinancialAccountType;
          currency: string;
          balance: Prisma.Decimal;
          status: string;
          createdAt: Date;
          updatedAt: Date;
        }): FinancialAccountDTO => ({
          id: acc.id,
          accountNumber: acc.accountNumber,
          accountName: acc.accountName,
          accountType: acc.accountType,
          currency: acc.currency,
          balance: Number(acc.balance),
          status: acc.status as AccountStatus,
          createdAt: acc.createdAt.toISOString(),
          updatedAt: acc.updatedAt.toISOString(),
        });

        return {
          treasuryAccount: mapAccount(treasury),
          operatingAccount: mapAccount(operating),
          payrollAccount: mapAccount(payroll),
          refundAccount: mapAccount(refund),
          revenueAccount: mapAccount(revenue),
          expenseAccount: mapAccount(expense),
        };
      });
    } catch (err) {
      console.warn("Database initializeCompanyTreasury failed; falling back to memory store.", err);
    }
  }

  // Memory fallback initialization
  if (!memoryAccounts.has("AOCC-TREASURY-01")) {
    const now = new Date().toISOString();
    const createMem = (accNum: string, name: string, type: FinancialAccountType, bal: number): FinancialAccountDTO => {
      const acc: MemoryAccount = {
        id: `acc-${accNum.toLowerCase()}`,
        accountNumber: accNum,
        accountName: name,
        accountType: type,
        currency: "INR",
        balance: bal,
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      };
      memoryAccounts.set(accNum, acc);
      return { ...acc };
    };

    const treasury = createMem("AOCC-TREASURY-01", "AOCC COMPANY TREASURY", "COMPANY_TREASURY", INITIAL_CAPITAL_AMOUNT);
    const operating = createMem("AOCC-OPS-01", "AOCC OPERATING ACCOUNT", "OPERATING_ACCOUNT", 5_000_000.0);
    const payroll = createMem("AOCC-PAYROLL-01", "AOCC PAYROLL ACCOUNT", "PAYROLL_ACCOUNT", 50_000_000.0);
    const refund = createMem("AOCC-REFUND-01", "AOCC REFUND ACCOUNT", "REFUND_ACCOUNT", 2_000_000.0);
    const revenue = createMem("AOCC-REV-01", "AOCC REVENUE ACCOUNT", "REVENUE_ACCOUNT", 0.0);
    const expense = createMem("AOCC-EXP-01", "AOCC EXPENSE ACCOUNT", "EXPENSE_ACCOUNT", 0.0);

    memoryTransactions.push({
      id: "ftx-init-01",
      transactionNumber: `FTX-INIT-${Date.now()}`,
      type: "INITIAL_CAPITAL",
      category: "INITIAL_CAPITAL_CREATED",
      amount: INITIAL_CAPITAL_AMOUNT,
      currency: "INR",
      direction: "CREDIT",
      destinationAccountId: treasury.id,
      destinationAccountName: treasury.accountName,
      referenceType: "INITIAL_CAPITAL",
      referenceId: "AOCC-TREASURY-01",
      description: "Initial Fictional Airport Simulation Capital (₹10 Crore)",
      status: "COMPLETED",
      createdBy: "SYSTEM_BOOTSTRAP",
      createdAt: now,
    });

    return {
      treasuryAccount: treasury,
      operatingAccount: operating,
      payrollAccount: payroll,
      refundAccount: refund,
      revenueAccount: revenue,
      expenseAccount: expense,
    };
  }

  const getMem = (num: string) => memoryAccounts.get(num)!;
  return {
    treasuryAccount: { ...getMem("AOCC-TREASURY-01") },
    operatingAccount: { ...getMem("AOCC-OPS-01") },
    payrollAccount: { ...getMem("AOCC-PAYROLL-01") },
    refundAccount: { ...getMem("AOCC-REFUND-01") },
    revenueAccount: { ...getMem("AOCC-REV-01") },
    expenseAccount: { ...getMem("AOCC-EXP-01") },
  };
}

/**
 * List all company financial accounts.
 */
export async function listFinancialAccounts(): Promise<FinancialAccountDTO[]> {
  await initializeCompanyTreasury();

  if (shouldUseDatabase()) {
    try {
      const records = await prisma.financialAccount.findMany({
        orderBy: { accountType: "asc" },
      });

      return records.map((acc) => ({
        id: acc.id,
        accountNumber: acc.accountNumber,
        accountName: acc.accountName,
        accountType: acc.accountType as FinancialAccountType,
        currency: acc.currency,
        balance: Number(acc.balance),
        status: acc.status as FinancialAccountDTO["status"],
        employeeId: acc.employeeId ?? undefined,
        userId: acc.userId ?? undefined,
        createdAt: acc.createdAt.toISOString(),
        updatedAt: acc.updatedAt.toISOString(),
      }));
    } catch (err) {
      console.warn("Database listFinancialAccounts failed; using memory", err);
    }
  }

  return Array.from(memoryAccounts.values()).map((a) => ({ ...a }));
}

/**
 * Atomically transfer funds between internal company accounts.
 */
export async function executeInternalTransfer(input: {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  reason: string;
  adminId?: string;
  adminName?: string;
  actorId?: string;
}): Promise<{
  success: boolean;
  transaction: FinancialTransactionDTO;
  sourceBalanceAfter: number;
  destBalanceAfter: number;
}> {
  const { sourceAccountId, destinationAccountId, amount, reason, adminName } = input;
  const adminId = input.adminId || input.actorId;

  if (amount <= 0) {
    throw new Error("Transfer amount must be strictly greater than zero.");
  }

  if (sourceAccountId === destinationAccountId) {
    throw new Error("Source and destination accounts cannot be identical.");
  }

  await initializeCompanyTreasury();

  const decimalAmount = new Prisma.Decimal(amount);
  const txNumber = `FTX-TRF-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  if (shouldUseDatabase()) {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch & lock source account
      const source = await tx.financialAccount.findUnique({
        where: { id: sourceAccountId },
      });

      if (!source) throw new Error("Source account not found.");
      if (source.status !== "ACTIVE") throw new Error(`Source account is ${source.status}.`);

      if (source.balance.lessThan(decimalAmount)) {
        throw new Error(
          `Insufficient funds in ${source.accountName}. Available: ₹${Number(source.balance).toLocaleString()}, Required: ₹${amount.toLocaleString()}`
        );
      }

      // 2. Fetch destination account
      const destination = await tx.financialAccount.findUnique({
        where: { id: destinationAccountId },
      });

      if (!destination) throw new Error("Destination account not found.");
      if (destination.status !== "ACTIVE") throw new Error(`Destination account is ${destination.status}.`);

      // 3. Atomically update balances
      const updatedSource = await tx.financialAccount.update({
        where: { id: source.id },
        data: { balance: { decrement: decimalAmount } },
      });

      const updatedDest = await tx.financialAccount.update({
        where: { id: destination.id },
        data: { balance: { increment: decimalAmount } },
      });

      // 4. Create immutable financial transaction
      const record = await tx.financialTransaction.create({
        data: {
          transactionNumber: txNumber,
          type: "INTERNAL_TRANSFER",
          category: "INTERNAL_TRANSFER",
          amount: decimalAmount,
          currency: "INR",
          direction: "TRANSFER",
          sourceAccountId: source.id,
          destinationAccountId: destination.id,
          referenceType: "ADMIN_TRANSFER",
          description: reason || `Transfer from ${source.accountName} to ${destination.accountName}`,
          status: "COMPLETED",
          createdBy: adminName || adminId || "ADMIN",
          metadata: {
            adminId,
            adminName,
            sourceBefore: Number(source.balance),
            sourceAfter: Number(updatedSource.balance),
            destBefore: Number(destination.balance),
            destAfter: Number(updatedDest.balance),
          },
        },
      });

      await logAuditEvent({
        actorId: adminId,
        actorName: adminName || "Admin",
        action: "TRANSFER_CREATED",
        entity: "FINANCIAL_TRANSACTION",
        entityId: txNumber,
        before: { sourceBalance: Number(source.balance), destBalance: Number(destination.balance) },
        after: {
          sourceBalance: Number(updatedSource.balance),
          destBalance: Number(updatedDest.balance),
          amount,
          reason,
        },
      });

      const dto: FinancialTransactionDTO = {
        id: record.id,
        transactionNumber: record.transactionNumber,
        type: record.type as FinancialTransactionType,
        category: record.category,
        amount: Number(record.amount),
        currency: record.currency,
        direction: record.direction as TransactionDirection,
        sourceAccountId: record.sourceAccountId ?? undefined,
        sourceAccountName: source.accountName,
        destinationAccountId: record.destinationAccountId ?? undefined,
        destinationAccountName: destination.accountName,
        referenceType: record.referenceType ?? undefined,
        description: record.description,
        status: record.status as TransactionStatus,
        createdBy: record.createdBy ?? undefined,
        createdAt: record.createdAt.toISOString(),
      };

      return {
        success: true,
        transaction: dto,
        sourceBalanceAfter: Number(updatedSource.balance),
        destBalanceAfter: Number(updatedDest.balance),
      };
    });
  }

  // Memory fallback transfer
  let sourceMem: MemoryAccount | undefined;
  let destMem: MemoryAccount | undefined;

  for (const acc of memoryAccounts.values()) {
    if (acc.id === sourceAccountId) sourceMem = acc;
    if (acc.id === destinationAccountId) destMem = acc;
  }

  if (!sourceMem) throw new Error("Source account not found in memory.");
  if (!destMem) throw new Error("Destination account not found in memory.");

  if (sourceMem.balance < amount) {
    throw new Error(
      `Insufficient funds in ${sourceMem.accountName}. Available: ₹${sourceMem.balance.toLocaleString()}, Required: ₹${amount.toLocaleString()}`
    );
  }

  sourceMem.balance -= amount;
  destMem.balance += amount;
  sourceMem.updatedAt = new Date().toISOString();
  destMem.updatedAt = new Date().toISOString();

  const memTx: FinancialTransactionDTO = {
    id: `ftx-mem-${Date.now()}`,
    transactionNumber: txNumber,
    type: "INTERNAL_TRANSFER",
    category: "INTERNAL_TRANSFER",
    amount,
    currency: "INR",
    direction: "TRANSFER",
    sourceAccountId: sourceMem.id,
    sourceAccountName: sourceMem.accountName,
    destinationAccountId: destMem.id,
    destinationAccountName: destMem.accountName,
    referenceType: "ADMIN_TRANSFER",
    description: reason,
    status: "COMPLETED",
    createdBy: adminName || "Admin",
    createdAt: new Date().toISOString(),
  };

  memoryTransactions.unshift(memTx);

  return {
    success: true,
    transaction: memTx,
    sourceBalanceAfter: sourceMem.balance,
    destBalanceAfter: destMem.balance,
  };
}

/**
 * Record Company Revenue (e.g. ticket sales, booking fees, baggage fees).
 */
export async function recordCompanyRevenue(input: {
  category?: "TICKET_SALE" | "BOOKING_FEE" | "BAGGAGE_FEE" | "SIMULATED_SERVICE_FEE" | "OTHER_SIMULATION_REVENUE";
  type?: "TICKET_SALE" | "BOOKING_FEE" | "BAGGAGE_FEE" | "SIMULATED_SERVICE_FEE" | "OTHER_SIMULATION_REVENUE";
  amount: number;
  referenceType?: string;
  referenceId?: string;
  description: string;
}): Promise<FinancialTransactionDTO> {
  const category = input.category || input.type || "TICKET_SALE";
  const { amount, referenceType, referenceId, description } = input;
  if (amount <= 0) {
    throw new Error("Revenue amount must be strictly greater than zero.");
  }

  await initializeCompanyTreasury();
  const txNumber = `FTX-REV-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  if (shouldUseDatabase()) {
    try {
      return await prisma.$transaction(async (tx) => {
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
              balance: new Prisma.Decimal(0.0),
            },
          });
        }

        const decimalAmount = new Prisma.Decimal(amount);
        const updated = await tx.financialAccount.update({
          where: { id: revAcc.id },
          data: { balance: { increment: decimalAmount } },
        });

        const record = await tx.financialTransaction.create({
          data: {
            transactionNumber: txNumber,
            type: "REVENUE",
            category,
            amount: decimalAmount,
            currency: "INR",
            direction: "CREDIT",
            destinationAccountId: revAcc.id,
            referenceType: referenceType || "BOOKING",
            referenceId,
            description,
            status: "COMPLETED",
            createdBy: "SYSTEM",
          },
        });

        return {
          id: record.id,
          transactionNumber: record.transactionNumber,
          type: record.type as FinancialTransactionType,
          category: record.category,
          amount: Number(record.amount),
          currency: record.currency,
          direction: record.direction as TransactionDirection,
          destinationAccountId: revAcc.id,
          destinationAccountName: revAcc.accountName,
          referenceType: record.referenceType ?? undefined,
          referenceId: record.referenceId ?? undefined,
          description: record.description,
          status: record.status as TransactionStatus,
          createdAt: record.createdAt.toISOString(),
        };
      });
    } catch (err) {
      console.warn("Database recordCompanyRevenue failed; using memory", err);
    }
  }

  // Memory fallback
  const revAcc = memoryAccounts.get("AOCC-REV-01");
  if (revAcc) {
    revAcc.balance += amount;
  }

  const memTx: FinancialTransactionDTO = {
    id: `ftx-rev-${Date.now()}`,
    transactionNumber: txNumber,
    type: "REVENUE",
    category,
    amount,
    currency: "INR",
    direction: "CREDIT",
    destinationAccountId: revAcc?.id,
    destinationAccountName: revAcc?.accountName || "AOCC REVENUE ACCOUNT",
    referenceType,
    referenceId,
    description,
    status: "COMPLETED",
    createdAt: new Date().toISOString(),
  };

  memoryTransactions.unshift(memTx);
  return memTx;
}

/**
 * Record Company Expense (e.g. maintenance, fuel, utilities, ground equipment).
 */
export async function recordCompanyExpense(input: {
  category: ExpenseCategory;
  amount: number;
  description: string;
  reference?: string;
  approvedBy?: string;
  actorId?: string;
  sourceAccountId?: string;
}): Promise<CompanyExpenseDTO> {
  const { category, amount, description, reference, sourceAccountId } = input;
  const approvedBy = input.approvedBy || input.actorId || "SYSTEM";
  if (amount <= 0) throw new Error("Expense amount must be strictly greater than zero.");

  await initializeCompanyTreasury();
  const expNumber = `EXP-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  if (shouldUseDatabase()) {
    return await prisma.$transaction(async (tx) => {
      // Find source account (defaults to Operating Account)
      const targetSourceId = sourceAccountId || (
        await tx.financialAccount.findUnique({ where: { accountNumber: "AOCC-OPS-01" }, select: { id: true } })
      )?.id;

      if (!targetSourceId) throw new Error("Company operating account not found.");

      const source = await tx.financialAccount.findUnique({ where: { id: targetSourceId } });
      if (!source) throw new Error("Source account not found.");

      const decimalAmount = new Prisma.Decimal(amount);
      if (source.balance.lessThan(decimalAmount)) {
        throw new Error(
          `Insufficient funds in ${source.accountName}. Available: ₹${Number(source.balance).toLocaleString()}, Required: ₹${amount.toLocaleString()}`
        );
      }

      // Deduct from source operating account
      await tx.financialAccount.update({
        where: { id: source.id },
        data: { balance: { decrement: decimalAmount } },
      });

      // Increment expense account tracking
      const expAcc = await tx.financialAccount.findUnique({ where: { accountNumber: "AOCC-EXP-01" } });
      if (expAcc) {
        await tx.financialAccount.update({
          where: { id: expAcc.id },
          data: { balance: { increment: decimalAmount } },
        });
      }

      // Create company expense record
      const expense = await tx.companyExpense.create({
        data: {
          expenseNumber: expNumber,
          category,
          amount: decimalAmount,
          description,
          reference,
          approvedBy: approvedBy || "FINANCE_ADMIN",
          status: "APPROVED",
        },
      });

      // Create ledger transaction
      await tx.financialTransaction.create({
        data: {
          transactionNumber: `FTX-EXP-${Date.now()}`,
          type: "EXPENSE",
          category,
          amount: decimalAmount,
          currency: "INR",
          direction: "DEBIT",
          sourceAccountId: source.id,
          referenceType: "EXPENSE",
          referenceId: expNumber,
          description,
          status: "COMPLETED",
          createdBy: approvedBy || "FINANCE_ADMIN",
        },
      });

      await logAuditEvent({
        action: "EXPENSE_CREATED",
        entity: "COMPANY_EXPENSE",
        entityId: expNumber,
        after: { category, amount, description, sourceAccount: source.accountName },
      });

      return {
        id: expense.id,
        expenseNumber: expense.expenseNumber,
        category: expense.category as ExpenseCategory,
        amount: Number(expense.amount),
        description: expense.description,
        reference: expense.reference ?? undefined,
        expenseDate: expense.expenseDate.toISOString(),
        approvedBy: expense.approvedBy ?? undefined,
        status: expense.status,
        createdAt: expense.createdAt.toISOString(),
      };
    });
  }

  // Memory fallback
  const opsAcc = memoryAccounts.get("AOCC-OPS-01");
  if (!opsAcc || opsAcc.balance < amount) {
    throw new Error(`Insufficient operating balance in memory.`);
  }

  opsAcc.balance -= amount;
  const expAcc = memoryAccounts.get("AOCC-EXP-01");
  if (expAcc) expAcc.balance += amount;

  const memExpense: CompanyExpenseDTO = {
    id: `exp-${Date.now()}`,
    expenseNumber: expNumber,
    category,
    amount,
    description,
    reference,
    expenseDate: new Date().toISOString(),
    approvedBy: approvedBy || "Admin",
    status: "APPROVED",
    createdAt: new Date().toISOString(),
  };

  memoryExpenses.unshift(memExpense);
  return memExpense;
}

/**
 * Server-side paged query for Financial Transactions Ledger.
 */
export async function listFinancialTransactionsPaged(params?: {
  page?: number;
  pageSize?: number;
  type?: string;
  category?: string;
  search?: string;
  accountId?: string;
  status?: string;
}): Promise<{
  transactions: FinancialTransactionDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const page = Math.max(1, params?.page || 1);
  const pageSize = Math.min(100, Math.max(1, params?.pageSize || 20));
  const skip = (page - 1) * pageSize;

  await initializeCompanyTreasury();

  if (shouldUseDatabase()) {
    try {
      const where: Prisma.FinancialTransactionWhereInput = {};
      if (params?.type && params.type !== "ALL") {
        where.type = params.type as FinancialTransactionType;
      }
      if (params?.category && params.category !== "ALL") {
        where.category = params.category;
      }
      if (params?.status && params.status !== "ALL") {
        where.status = params.status as TransactionStatus;
      }
      if (params?.accountId) {
        where.OR = [
          { sourceAccountId: params.accountId },
          { destinationAccountId: params.accountId },
        ];
      }
      if (params?.search) {
        where.OR = [
          { transactionNumber: { contains: params.search, mode: "insensitive" } },
          { description: { contains: params.search, mode: "insensitive" } },
          { referenceId: { contains: params.search, mode: "insensitive" } },
        ];
      }

      const [total, records] = await Promise.all([
        prisma.financialTransaction.count({ where }),
        prisma.financialTransaction.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: pageSize,
          include: {
            sourceAccount: { select: { accountName: true } },
            destinationAccount: { select: { accountName: true } },
          },
        }),
      ]);

      const transactions: FinancialTransactionDTO[] = records.map((r) => ({
        id: r.id,
        transactionNumber: r.transactionNumber,
        type: r.type as FinancialTransactionType,
        category: r.category,
        amount: Number(r.amount),
        currency: r.currency,
        direction: r.direction as TransactionDirection,
        sourceAccountId: r.sourceAccountId ?? undefined,
        sourceAccountName: r.sourceAccount?.accountName ?? undefined,
        destinationAccountId: r.destinationAccountId ?? undefined,
        destinationAccountName: r.destinationAccount?.accountName ?? undefined,
        referenceType: r.referenceType ?? undefined,
        referenceId: r.referenceId ?? undefined,
        description: r.description,
        status: r.status as TransactionStatus,
        createdBy: r.createdBy ?? undefined,
        createdAt: r.createdAt.toISOString(),
      }));

      return {
        transactions,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      };
    } catch (err) {
      console.warn("Database listFinancialTransactionsPaged failed; using memory", err);
    }
  }

  let items = [...memoryTransactions];
  if (params?.type && params.type !== "ALL") {
    items = items.filter((t) => t.type === params.type);
  }
  if (params?.search) {
    const q = params.search.toLowerCase();
    items = items.filter(
      (t) => t.transactionNumber.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    );
  }

  const total = items.length;
  const paged = items.slice(skip, skip + pageSize);
  return {
    transactions: paged,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

/**
 * List company expenses with server pagination.
 */
export async function listCompanyExpensesPaged(params?: {
  page?: number;
  pageSize?: number;
  category?: string;
  status?: string;
}): Promise<{
  expenses: CompanyExpenseDTO[];
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
      const where: Prisma.CompanyExpenseWhereInput = {};
      if (params?.category && params.category !== "ALL") {
        where.category = params.category as ExpenseCategory;
      }
      if (params?.status && params.status !== "ALL") {
        where.status = params.status;
      }

      const [total, records] = await Promise.all([
        prisma.companyExpense.count({ where }),
        prisma.companyExpense.findMany({
          where,
          orderBy: { expenseDate: "desc" },
          skip,
          take: pageSize,
        }),
      ]);

      const expenses: CompanyExpenseDTO[] = records.map((e) => ({
        id: e.id,
        expenseNumber: e.expenseNumber,
        category: e.category as ExpenseCategory,
        amount: Number(e.amount),
        description: e.description,
        reference: e.reference ?? undefined,
        expenseDate: e.expenseDate.toISOString(),
        approvedBy: e.approvedBy ?? undefined,
        status: e.status,
        createdAt: e.createdAt.toISOString(),
      }));

      return {
        expenses,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      };
    } catch (err) {
      console.warn("Database listCompanyExpensesPaged failed; using memory", err);
    }
  }

  let items = [...memoryExpenses];
  if (params?.category && params.category !== "ALL") {
    items = items.filter((e) => e.category === params.category);
  }
  const total = items.length;
  const paged = items.slice(skip, skip + pageSize);
  return {
    expenses: paged,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

/**
 * Comprehensive company finance summary & reconciliation.
 */
export async function getCompanyFinanceSummary(): Promise<CompanyFinanceSummaryDTO> {
  const accounts = await listFinancialAccounts();

  const getBal = (type: FinancialAccountType) =>
    accounts.find((a) => a.accountType === type)?.balance || 0;

  const treasuryBalance = getBal("COMPANY_TREASURY");
  const operatingBalance = getBal("OPERATING_ACCOUNT");
  const payrollBalance = getBal("PAYROLL_ACCOUNT");
  const refundBalance = getBal("REFUND_ACCOUNT");
  const revenueBalance = getBal("REVENUE_ACCOUNT");
  const expenseBalance = getBal("EXPENSE_ACCOUNT");

  const totalCompanyBalance =
    treasuryBalance + operatingBalance + payrollBalance + refundBalance + revenueBalance - expenseBalance;

  let totalRevenue = 0;
  let todayRevenue = 0;
  let totalExpenses = 0;
  let todayExpenses = 0;
  let totalPayrollPaid = 0;
  let totalRefunds = 0;

  if (shouldUseDatabase()) {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [revAgg, todayRevAgg, expAgg, todayExpAgg, payrollAgg, refundAgg] = await Promise.all([
        prisma.financialTransaction.aggregate({
          where: { type: "REVENUE" },
          _sum: { amount: true },
        }),
        prisma.financialTransaction.aggregate({
          where: { type: "REVENUE", createdAt: { gte: todayStart } },
          _sum: { amount: true },
        }),
        prisma.companyExpense.aggregate({
          _sum: { amount: true },
        }),
        prisma.companyExpense.aggregate({
          where: { expenseDate: { gte: todayStart } },
          _sum: { amount: true },
        }),
        prisma.payroll.aggregate({
          where: { status: "PAID" },
          _sum: { netAmount: true },
        }),
        prisma.financialTransaction.aggregate({
          where: { type: "REFUND" },
          _sum: { amount: true },
        }),
      ]);

      totalRevenue = Number(revAgg._sum.amount || 0);
      todayRevenue = Number(todayRevAgg._sum.amount || 0);
      totalExpenses = Number(expAgg._sum.amount || 0);
      todayExpenses = Number(todayExpAgg._sum.amount || 0);
      totalPayrollPaid = Number(payrollAgg._sum.netAmount || 0);
      totalRefunds = Number(refundAgg._sum.amount || 0);
    } catch (err) {
      console.warn("Database getCompanyFinanceSummary failed; using calculated balances", err);
    }
  } else {
    totalRevenue = revenueBalance;
    totalExpenses = expenseBalance;
  }

  const netCashFlow = totalRevenue - totalExpenses - totalRefunds;

  return {
    treasuryBalance,
    operatingBalance,
    payrollBalance,
    refundBalance,
    revenueBalance,
    expenseBalance,
    totalCompanyBalance,
    todayRevenue,
    todayExpenses,
    totalRevenue,
    totalExpenses,
    totalPayrollPaid,
    totalSalaries: totalPayrollPaid,
    ticketRevenue: Math.round(totalRevenue * 0.85 * 100) / 100,
    otherRevenue: Math.round(totalRevenue * 0.15 * 100) / 100,
    closingBalance: totalCompanyBalance,
    totalRefunds,
    netCashFlow,
    openingBalance: INITIAL_CAPITAL_AMOUNT,
    totalSimulationMoneyCreated: INITIAL_CAPITAL_AMOUNT,
  };
}

export const listFinancialTransactions = listFinancialTransactionsPaged;
export const listCompanyExpenses = listCompanyExpensesPaged;
