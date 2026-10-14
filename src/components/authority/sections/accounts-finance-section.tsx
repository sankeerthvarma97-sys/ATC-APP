"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowDownUp,
  Receipt,
  Calendar,
  Building,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Plus,
  Send,
  ShieldCheck,
  FileText,
  UserCheck,
  Layers,
  ChevronRight,
  X,
  CreditCard,
  Building2,
  Lock,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/ui/copy-button";
import type {
  FinancialAccountDTO,
  FinancialTransactionDTO,
  CompanyExpenseDTO,
  PayrollDTO,
  CompanyFinanceSummaryDTO,
  WalletTransactionDTO,
} from "@/lib/domain";
import type { PayrollSchedulerStatus } from "@/lib/services/payroll-scheduler";

type FinanceTab =
  | "overview"
  | "accounts"
  | "ledger"
  | "expenses"
  | "payroll"
  | "salaries"
  | "calendar"
  | "wallet-activity"
  | "reports";

export function AccountsFinanceSection({
  initialSubTab = "overview",
}: {
  initialSubTab?: string;
}) {
  const [activeTab, setActiveTab] = useState<FinanceTab>(
    (initialSubTab as FinanceTab) || "overview"
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  type WalletActivitySummary = {
    totalSimulationMoneyCreated?: number;
    totalTopUps?: number;
    averageTopUp?: number;
  };

  type CalendarEvent = {
    id: string;
    title: string;
    period: string;
    status: string;
    employeeCount: number;
    netAmount: number;
    scheduledDate: string;
  };

  type PayrollPreviewData = {
    period: string;
    employeeCount: number;
    companyBalance: number;
    grossSalary: number;
    bonuses: number;
    deductions: number;
    netSalary: number;
    projectedBalance: number;
  };

  // Data states
  const [summary, setSummary] = useState<CompanyFinanceSummaryDTO | null>(null);
  const [accounts, setAccounts] = useState<FinancialAccountDTO[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransactionDTO[]>([]);
  const [expenses, setExpenses] = useState<CompanyExpenseDTO[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollDTO[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [walletActivity, setWalletActivity] = useState<{
    summary: WalletActivitySummary;
    transactions: WalletTransactionDTO[];
    total: number;
  } | null>(null);

  // Filters & Search
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<string>("ALL");
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerTotal, setLedgerTotal] = useState(0);

  // Modals
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showPayrollPreviewModal, setShowPayrollPreviewModal] = useState(false);
  const [showPayrollRunModal, setShowPayrollRunModal] = useState(false);
  const [customPayrollPeriod, setCustomPayrollPeriod] = useState("");
  const [showWalletAdjustmentModal, setShowWalletAdjustmentModal] = useState(false);
  const [payrollPreviewData, setPayrollPreviewData] = useState<PayrollPreviewData | null>(null);

  // Form states
  const [transferForm, setTransferForm] = useState({
    sourceAccountId: "",
    destinationAccountId: "",
    amount: "",
    reason: "",
  });
  const [addMoneyForm, setAddMoneyForm] = useState({
    accountId: "",
    targetAll: true,
    amount: "1000000000000",
    reason: "Billionaire capital injection (Simulation)",
  });
  const [expenseForm, setExpenseForm] = useState({
    category: "AIRPORT_OPERATIONS",
    amount: "",
    description: "",
    reference: "",
  });
  const [walletAdjustForm, setWalletAdjustForm] = useState({
    userId: "",
    direction: "CREDIT",
    amount: "",
    reason: "",
  });
  const [actionProcessing, setActionProcessing] = useState(false);

  type SalaryRosterItem = {
    employeeId: string;
    fullName: string;
    email: string;
    department: string;
    role: string;
    jobTitle: string;
    gradeCode: string;
    gradeName: string;
    baseSalary: number;
    allowances: number;
    overtime: number;
    bonus: number;
    deductions: number;
    grossSalary: number;
    netSalary: number;
    salaryType: string;
    effectiveDate: string;
    revisionCount: number;
  };

  const [salaryRoster, setSalaryRoster] = useState<SalaryRosterItem[]>([]);
  const [salarySearch, setSalarySearch] = useState("");
  const [showSalaryHikeModal, setShowSalaryHikeModal] = useState(false);
  const [selectedHikeEmployee, setSelectedHikeEmployee] = useState<SalaryRosterItem | null>(null);
  const [hikeForm, setHikeForm] = useState({
    hikeType: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
    value: "10",
    reason: "Merit performance revision",
    effectiveDate: new Date().toISOString().slice(0, 10),
    newGrade: "",
  });
  const [hikeSubmitting, setHikeSubmitting] = useState(false);
  const [schedulerStatus, setSchedulerStatus] = useState<PayrollSchedulerStatus | null>(null);

  // Format INR currency
  const formatINR = (val: number | string | undefined | null) => {
    const num = typeof val === "string" ? Number.parseFloat(val) : Number(val || 0);
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Fetch all core finance data
  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);

      const [summaryRes, accountsRes, payrollRes, calendarRes] = await Promise.all([
        fetch(`/api/finance/summary?_t=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/finance/accounts?_t=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/finance/payroll?_t=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/finance/payroll/calendar?_t=${Date.now()}`, { cache: "no-store" }),
      ]);

      if (summaryRes.ok) {
        const sumData = await summaryRes.json();
        setSummary(sumData);
      }
      if (accountsRes.ok) {
        const accData = await accountsRes.json();
        setAccounts(accData.accounts || []);
        if (accData.accounts?.length > 1) {
          setTransferForm((prev) => {
            if (!prev.sourceAccountId) {
              return {
                ...prev,
                sourceAccountId: accData.accounts[0].id,
                destinationAccountId: accData.accounts[1].id,
              };
            }
            return prev;
          });
        }
      }
      if (payrollRes.ok) {
        const payData = await payrollRes.json();
        setPayrollRuns(payData.runs || []);
      }
      if (calendarRes.ok) {
        const calData = await calendarRes.json();
        setCalendarEvents(calData.calendar || []);
      }
    } catch (err) {
      console.error("Failed to load finance data:", err);
      setError("Failed to load company finance data. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch ledger transactions
  const fetchLedger = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("page", ledgerPage.toString());
      params.set("pageSize", "15");
      if (ledgerSearch) params.set("search", ledgerSearch);
      if (ledgerTypeFilter !== "ALL") params.set("type", ledgerTypeFilter);

      const res = await fetch(`/api/finance/transactions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
        setLedgerTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch ledger:", err);
    }
  }, [ledgerPage, ledgerSearch, ledgerTypeFilter]);

  // Fetch expenses
  const fetchExpenses = useCallback(async () => {
    try {
      const res = await fetch("/api/finance/expenses?pageSize=20");
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
      }
    } catch (err) {
      console.error("Failed to fetch expenses:", err);
    }
  }, []);

  // Fetch wallet activity
  const fetchWalletActivity = useCallback(async () => {
    try {
      const res = await fetch("/api/wallet/activity?pageSize=20");
      if (res.ok) {
        const data = await res.json();
        setWalletActivity(data);
      }
    } catch (err) {
      console.error("Failed to fetch wallet activity:", err);
    }
  }, []);

  // Fetch salary roster
  const fetchSalaryRoster = useCallback(async () => {
    try {
      const res = await fetch("/api/finance/salary");
      if (res.ok) {
        const data = await res.json();
        setSalaryRoster(data.roster || []);
      }
    } catch (err) {
      console.error("Failed to fetch salary roster:", err);
    }
  }, []);

  // Fetch scheduler status
  const fetchSchedulerStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/cron/payroll?status=true");
      if (res.ok) {
        const data = await res.json();
        setSchedulerStatus(data.status || null);
      }
    } catch (err) {
      console.error("Failed to fetch scheduler status:", err);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        await fetchData();
      } catch {
        // Handled in fetchData
      }
    };
    if (!ignore) void load();
    return () => {
      ignore = true;
    };
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === "ledger") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchLedger();
    } else if (activeTab === "expenses") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchExpenses();
    } else if (activeTab === "wallet-activity") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchWalletActivity();
    } else if (activeTab === "salaries") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchSalaryRoster();
    } else if (activeTab === "payroll") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchSchedulerStatus();
      void fetchData();
    }
  }, [activeTab, fetchLedger, fetchExpenses, fetchWalletActivity, fetchSalaryRoster, fetchSchedulerStatus, fetchData]);

  // Handle Add Money / Capital Injection Submission
  const handleExecuteAddMoney = async (
    e?: React.FormEvent,
    directTargetAll?: boolean,
    directAmount?: number,
    directAccountId?: string
  ) => {
    if (e) e.preventDefault();
    const isAll = directTargetAll !== undefined ? directTargetAll : addMoneyForm.targetAll;
    const targetAccId = directAccountId !== undefined ? directAccountId : addMoneyForm.accountId;
    const amt = directAmount !== undefined ? directAmount : Number.parseFloat(addMoneyForm.amount);

    if (isNaN(amt) || amt <= 0) {
      setError("Please specify a valid positive capital amount to inject.");
      return;
    }

    if (!isAll && !targetAccId) {
      setError("Please select a target company account or choose All Accounts.");
      return;
    }

    try {
      setActionProcessing(true);
      setError(null);
      const res = await fetch("/api/finance/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "INJECT_FUNDS",
          accountId: isAll ? undefined : targetAccId,
          targetAll: isAll,
          amount: amt,
          reason: addMoneyForm.reason || "Billionaire capital injection (Simulation)",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to inject capital");

      setSuccessMessage(data.message || `Successfully injected ${formatINR(amt)}! Billionaire status active! 💎`);
      setShowAddMoneyModal(false);
      await fetchData();
      if (activeTab === "ledger") fetchLedger();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Capital injection failed";
      setError(message);
    } finally {
      setActionProcessing(false);
    }
  };

  // Handle Internal Transfer Submission
  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferForm.sourceAccountId === transferForm.destinationAccountId) {
      setError("Source and destination accounts must be different.");
      return;
    }
    const amt = Number.parseFloat(transferForm.amount);
    if (isNaN(amt) || amt <= 0) {
      setError("Please specify a valid positive transfer amount.");
      return;
    }

    try {
      setActionProcessing(true);
      setError(null);
      const res = await fetch("/api/finance/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceAccountId: transferForm.sourceAccountId,
          destinationAccountId: transferForm.destinationAccountId,
          amount: amt,
          reason: transferForm.reason || "Internal company transfer",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transfer failed");

      setSuccessMessage(`Successfully transferred ₹${amt.toLocaleString("en-IN")}`);
      setShowTransferModal(false);
      setTransferForm((prev) => ({ ...prev, amount: "", reason: "" }));
      await fetchData();
      if (activeTab === "ledger") fetchLedger();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Transfer failed";
      setError(message);
    } finally {
      setActionProcessing(false);
    }
  };

  // Handle Record Expense Submission
  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number.parseFloat(expenseForm.amount);
    if (isNaN(amt) || amt <= 0) {
      setError("Please specify a valid positive expense amount.");
      return;
    }

    try {
      setActionProcessing(true);
      setError(null);
      const res = await fetch("/api/finance/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: expenseForm.category,
          amount: amt,
          description: expenseForm.description,
          reference: expenseForm.reference,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Expense recording failed");

      setSuccessMessage(`Recorded ${expenseForm.category} expense: ₹${amt.toLocaleString("en-IN")}`);
      setShowExpenseModal(false);
      setExpenseForm({ category: "AIRPORT_OPERATIONS", amount: "", description: "", reference: "" });
      await fetchData();
      if (activeTab === "expenses") fetchExpenses();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to record expense";
      setError(message);
    } finally {
      setActionProcessing(false);
    }
  };

  // Handle Payroll Preview
  const handleOpenPayrollPreview = async () => {
    try {
      setActionProcessing(true);
      setError(null);
      const now = new Date();
      const period = `PAYROLL-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const res = await fetch(`/api/finance/payroll?preview=true&period=${period}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to preview payroll");

      setPayrollPreviewData(data.preview);
      setShowPayrollPreviewModal(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load payroll preview";
      setError(message);
    } finally {
      setActionProcessing(false);
    }
  };

  // Compute next target payroll period based on existing runs
  const getNextPayablePeriod = useCallback(() => {
    const now = new Date();
    const currentMonthPeriod = `PAYROLL-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const isPaid = payrollRuns.some((r) => r.payrollPeriod === currentMonthPeriod && r.status === "PAID");
    if (isPaid) {
      const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return `PAYROLL-${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;
    }
    return currentMonthPeriod;
  }, [payrollRuns]);

  // Handle Run Payroll Execution
  const handleExecutePayroll = async () => {
    try {
      setActionProcessing(true);
      setError(null);
      const defaultPeriod = getNextPayablePeriod();
      const period = (customPayrollPeriod.trim() || defaultPeriod).toUpperCase();

      const res = await fetch("/api/finance/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period,
          frequency: "MONTHLY",
          approveImmediately: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payroll processing failed");

      setSuccessMessage(data.message || `Payroll ${period} successfully executed and credited!`);
      setShowPayrollRunModal(false);
      setShowPayrollPreviewModal(false);

      // Force immediate refresh of all finance data, ledger, and payroll history
      await Promise.all([
        fetchData(),
        fetchLedger(),
        fetchSalaryRoster(),
      ]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Payroll processing failed";
      setError(message);
    } finally {
      setActionProcessing(false);
    }
  };

  // Handle Salary Hike Submission
  const handleExecuteSalaryHike = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHikeEmployee) return;
    const val = Number.parseFloat(hikeForm.value);
    if (isNaN(val) || val <= 0) {
      setError("Please specify a valid positive salary hike value.");
      return;
    }
    try {
      setHikeSubmitting(true);
      setError(null);
      const res = await fetch("/api/finance/salary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "HIKE",
          employeeId: selectedHikeEmployee.employeeId,
          hikeType: hikeForm.hikeType,
          value: val,
          reason: hikeForm.reason || "Annual performance salary hike",
          newGrade: hikeForm.newGrade || undefined,
          effectiveDate: hikeForm.effectiveDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Salary hike failed");

      setSuccessMessage(
        `Salary hike successfully applied for ${selectedHikeEmployee.fullName}! New Base: ${formatINR(
          data.profile?.baseSalary
        )}`
      );
      setShowSalaryHikeModal(false);
      await fetchSalaryRoster();
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply salary hike");
    } finally {
      setHikeSubmitting(false);
    }
  };

  // Handle 24/7 Scheduler Test Run
  const handleTriggerSchedulerTest = async () => {
    try {
      setActionProcessing(true);
      setError(null);
      const res = await fetch("/api/cron/payroll", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || "Scheduled payroll run failed");
      }
      setSuccessMessage(`24/7 Scheduler batch executed successfully: ${data.message} (${data.period})`);
      await fetchSchedulerStatus();
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scheduled run failed");
    } finally {
      setActionProcessing(false);
    }
  };

  // Handle Admin Wallet Adjustment
  const handleExecuteWalletAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number.parseFloat(walletAdjustForm.amount);
    if (!walletAdjustForm.userId || isNaN(amt) || amt <= 0) {
      setError("Please provide a valid user ID and positive amount.");
      return;
    }

    try {
      setActionProcessing(true);
      setError(null);
      const res = await fetch("/api/wallet/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: walletAdjustForm.userId,
          direction: walletAdjustForm.direction,
          amount: amt,
          reason: walletAdjustForm.reason || "Admin ledger adjustment",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Wallet adjustment failed");

      setSuccessMessage(data.message || "Wallet adjusted successfully");
      setShowWalletAdjustmentModal(false);
      setWalletAdjustForm({ userId: "", direction: "CREDIT", amount: "", reason: "" });
      fetchWalletActivity();
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Wallet adjustment failed";
      setError(message);
    } finally {
      setActionProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
                  AOCC Financial Control & Treasury
                </h1>
                <Badge variant="outline" className="border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-emerald-500/20 text-amber-300 text-xs font-semibold flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-400 fill-current" />
                  ₹1,000 BILLION TREASURY · BILLIONAIRE MODE
                </Badge>
                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px]">
                  UNLIMITED CAPITAL ACTIVE
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Double-entry simulation ledger, company accounts, automated 24/7 staff payroll & passenger wallets
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            className="bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500 hover:from-amber-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-950/50 border border-amber-300/40"
            onClick={() => {
              setAddMoneyForm({
                accountId: "",
                targetAll: true,
                amount: "1000000000000",
                reason: "Billionaire mode simulation liquidity expansion",
              });
              setShowAddMoneyModal(true);
            }}
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5 fill-current" />
            + Add Money / Billionaire Mode
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 text-xs"
            onClick={() => {
              fetchData();
              if (activeTab === "ledger") fetchLedger();
              if (activeTab === "expenses") fetchExpenses();
              if (activeTab === "wallet-activity") fetchWalletActivity();
            }}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin text-emerald-400" : ""}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="border-cyan-500/30 bg-cyan-950/20 hover:bg-cyan-900/40 text-cyan-300 text-xs"
            onClick={() => setShowTransferModal(true)}
          >
            <ArrowDownUp className="mr-1.5 h-3.5 w-3.5" />
            Internal Transfer
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="border-rose-500/30 bg-rose-950/20 hover:bg-rose-900/40 text-rose-300 text-xs"
            onClick={() => setShowExpenseModal(true)}
          >
            <Receipt className="mr-1.5 h-3.5 w-3.5" />
            Record Expense
          </Button>

          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-lg shadow-emerald-950/50"
            onClick={handleOpenPayrollPreview}
            disabled={actionProcessing}
          >
            <Calendar className="mr-1.5 h-3.5 w-3.5" />
            Payroll Actions
          </Button>
        </div>
      </div>

      {/* Alert / Notification Feedback */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-rose-500/30 bg-rose-950/30 p-3 text-sm text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-3 text-sm text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-800 bg-slate-950/40 p-1 rounded-lg">
        {[
          { id: "overview", label: "Overview & Treasury", icon: DollarSign },
          { id: "accounts", label: "Company Accounts", icon: Building },
          { id: "ledger", label: "Financial Ledger", icon: FileText },
          { id: "expenses", label: "Company Expenses", icon: Receipt },
          { id: "payroll", label: "Payroll Processing", icon: UserCheck },
          { id: "salaries", label: "Employee Salaries", icon: ShieldCheck },
          { id: "calendar", label: "Payroll Calendar", icon: Calendar },
          { id: "wallet-activity", label: "Wallet Activity", icon: Wallet },
          { id: "reports", label: "Reconciliation Reports", icon: TrendingUp },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as FinanceTab)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md whitespace-nowrap transition-all ${
                isActive
                  ? "bg-slate-800 text-emerald-400 shadow-sm border border-slate-700/60"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? "text-emerald-400" : "text-slate-500"}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & TREASURY */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Quick Metrics KPI Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-slate-800 bg-slate-900/60 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Company Treasury
                </CardTitle>
                <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-400">
                  <Building2 className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-emerald-400">
                  {formatINR(summary?.treasuryBalance)}
                </div>
                <p className="mt-1 text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                  <Sparkles className="h-3 w-3 text-amber-400 fill-current" />
                  Primary Capital Reserve (Billionaire Reserve ₹1,000 Billion)
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/60 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Total Revenue
                </CardTitle>
                <div className="p-1.5 rounded bg-cyan-500/10 text-cyan-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-cyan-400">
                  {formatINR(summary?.totalRevenue)}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Tickets: {formatINR(summary?.ticketRevenue)} · Fees: {formatINR(summary?.otherRevenue)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/60 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Total Expenses & Payroll
                </CardTitle>
                <div className="p-1.5 rounded bg-rose-500/10 text-rose-400">
                  <TrendingDown className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-rose-400">
                  {formatINR((summary?.totalExpenses || 0) + (summary?.totalSalaries || 0))}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Salaries: {formatINR(summary?.totalSalaries)} · Ops: {formatINR(summary?.totalExpenses)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/60 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Net Simulation Cash Flow
                </CardTitle>
                <div className="p-1.5 rounded bg-amber-500/10 text-amber-400">
                  <ArrowDownUp className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold font-mono ${(summary?.netCashFlow || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {formatINR(summary?.netCashFlow)}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Operating Reserves: {formatINR(summary?.operatingBalance)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Account Reserves Grid */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="border-slate-800 bg-slate-900/40 lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base text-slate-200">Company Account Portfolios</CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Realtime balance reconciliation across dedicated operational accounts
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-700 text-xs h-7"
                    onClick={() => setActiveTab("accounts")}
                  >
                    Manage Accounts
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800/80"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-900 text-slate-300 font-mono text-xs border border-slate-800">
                          {acc.accountType.substring(0, 3)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-200">{acc.accountName}</div>
                          <div className="text-[10px] font-mono text-slate-500">{acc.accountNumber}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm font-semibold text-slate-100">
                          {formatINR(acc.balance)}
                        </div>
                        <Badge
                          variant="outline"
                          className="border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[10px] py-0"
                        >
                          ACTIVE
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions & Policy Card */}
            <Card className="border-slate-800 bg-slate-900/40">
              <CardHeader>
                <CardTitle className="text-base text-slate-200">Simulation Policy & Rules</CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Strict money flow isolation constraints
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs text-slate-400">
                <div className="rounded-md border border-slate-800 bg-slate-950/80 p-3 space-y-2">
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    Isolated Money Channels
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    User Simulation Top-Ups are passenger funds, never counted as company revenue until tickets are booked.
                  </p>
                </div>

                <div className="rounded-md border border-slate-800 bg-slate-950/80 p-3 space-y-2">
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Lock className="h-4 w-4 text-cyan-400" />
                    Double-Entry Immutable Ledger
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Every credit has a corresponding debit or source tracking. No direct balance editing is permitted.
                  </p>
                </div>

                <div className="rounded-md border border-slate-800 bg-slate-950/80 p-3 space-y-2">
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-amber-400" />
                    Automated Serverless Payroll
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Runs on scheduled server cron, automatically paying up to 10,000 virtual staff without browser open.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: COMPANY ACCOUNTS & TRANSFERS */}
      {activeTab === "accounts" && (
        <div className="space-y-6">
          {/* Billionaire Capital Injection Center Hero */}
          <Card className="border-amber-500/40 bg-gradient-to-br from-amber-950/40 via-slate-900/90 to-emerald-950/40 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <Sparkles className="h-32 w-32 text-amber-300" />
            </div>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      <Sparkles className="h-4 w-4 fill-current" />
                    </div>
                    <CardTitle className="text-base font-bold text-slate-100 flex items-center gap-2">
                      Billionaire Capital Injection Center
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">
                        ADMIN UNLIMITED FUNDS
                      </Badge>
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                    Admin treasury console with unlimited capital generation. Instant 1-click ₹1,000 Billion injection boosts all company balances simultaneously for billionaire-scale aviation simulations.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-600 hover:from-amber-400 hover:to-emerald-500 text-slate-950 font-bold text-xs shadow-md border border-amber-300/40"
                    onClick={() => handleExecuteAddMoney(undefined, true, 1_000_000_000_000.0)}
                    disabled={actionProcessing}
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5 fill-current" />
                    ⚡ Instant +₹1,000B to All Accounts
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-300 text-xs"
                    onClick={() => {
                      setAddMoneyForm({
                        accountId: accounts[0]?.id || "",
                        targetAll: false,
                        amount: "1000000000000",
                        reason: "Billionaire capital injection",
                      });
                      setShowAddMoneyModal(true);
                    }}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    + Custom Add Money
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-200">Company Institutional Accounts</h2>
              <p className="text-xs text-slate-400">Overview of isolated institutional accounts with billionaire reserves</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs"
                onClick={() => {
                  setAddMoneyForm({
                    accountId: "",
                    targetAll: true,
                    amount: "1000000000000",
                    reason: "Billionaire mode simulation liquidity expansion",
                  });
                  setShowAddMoneyModal(true);
                }}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Money
              </Button>
              <Button
                size="sm"
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs"
                onClick={() => setShowTransferModal(true)}
              >
                <ArrowDownUp className="mr-1.5 h-3.5 w-3.5" />
                Transfer Between Accounts
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((acc) => (
              <Card key={acc.id} className="border-slate-800 bg-slate-900/60 shadow hover:border-slate-700 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="border-slate-700 font-mono text-[10px] text-slate-300">
                      {acc.accountType}
                    </Badge>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px]">
                      {acc.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-100 mt-2">{acc.accountName}</CardTitle>
                  <CardDescription className="text-xs font-mono text-slate-400">
                    {acc.accountNumber}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="pt-2 border-t border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">Current Balance</div>
                    <div className="text-xl font-bold font-mono text-emerald-400">{formatINR(acc.balance)}</div>
                  </div>
                  <div className="flex items-center justify-between pt-1 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 h-7"
                      onClick={() => {
                        setAddMoneyForm({
                          accountId: acc.id,
                          targetAll: false,
                          amount: "1000000000000",
                          reason: `Capital injection to ${acc.accountName}`,
                        });
                        setShowAddMoneyModal(true);
                      }}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add Money
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-slate-400 hover:text-slate-200 h-7"
                      onClick={() => {
                        setTransferForm((prev) => ({ ...prev, sourceAccountId: acc.id }));
                        setShowTransferModal(true);
                      }}
                    >
                      Transfer Out <ChevronRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: TRANSACTION LEDGER */}
      {activeTab === "ledger" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <Input
                  placeholder="Search reference, tx #..."
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  className="pl-8 text-xs bg-slate-950 border-slate-800 text-slate-200 h-8"
                />
              </div>
              <select
                value={ledgerTypeFilter}
                onChange={(e) => setLedgerTypeFilter(e.target.value)}
                className="h-8 rounded-md border border-slate-800 bg-slate-950 px-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">All Types</option>
                <option value="INITIAL_CAPITAL_CREATED">Initial Capital</option>
                <option value="INTERNAL_TRANSFER">Internal Transfer</option>
                <option value="TICKET_SALE">Ticket Sale</option>
                <option value="PAYROLL">Payroll</option>
                <option value="COMPANY_EXPENSE">Company Expense</option>
                <option value="REFUND">Refund</option>
                <option value="SIMULATION_TOP_UP">Simulation Top-Up</option>
              </select>
            </div>
            <div className="text-xs text-slate-400">
              Total Recorded Ledger Entries: <span className="font-mono text-emerald-400 font-bold">{ledgerTotal}</span>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/60">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800 font-mono">
                <tr>
                  <th className="p-3">Tx Number</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 font-sans">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No financial transactions found matching criteria.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3 font-mono text-[11px] text-slate-200 font-semibold">{tx.transactionNumber}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="border-slate-700 bg-slate-900/60 font-mono text-[10px] text-slate-300">
                          {tx.type}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-400">{tx.category}</td>
                      <td className="p-3 font-mono font-bold text-slate-100">
                        {formatINR(tx.amount)}
                      </td>
                      <td className="p-3 text-slate-300 max-w-xs truncate">{tx.description}</td>
                      <td className="p-3 font-mono text-[10px] text-slate-400">
                        {new Date(tx.createdAt).toLocaleString("en-IN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="p-3 text-right">
                        <Badge
                          variant="outline"
                          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px]"
                        >
                          {tx.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div>Page {ledgerPage}</div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-slate-800"
                disabled={ledgerPage <= 1}
                onClick={() => setLedgerPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-slate-800"
                disabled={transactions.length < 15}
                onClick={() => setLedgerPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EXPENSES */}
      {activeTab === "expenses" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-200">Company Operational Expenses</h2>
              <p className="text-xs text-slate-400">
                Audited simulation expenses across ground operations, maintenance, fuel, and security
              </p>
            </div>
            <Button
              size="sm"
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs"
              onClick={() => setShowExpenseModal(true)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Record New Expense
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/60">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800 font-mono">
                <tr>
                  <th className="p-3">Expense ID</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Reference</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Approval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 font-sans">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No company expenses recorded yet.
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3 font-mono text-[11px] text-slate-300">{exp.id.substring(0, 10)}...</td>
                      <td className="p-3">
                        <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-400 font-mono text-[10px]">
                          {exp.category}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono font-bold text-rose-400">{formatINR(exp.amount)}</td>
                      <td className="p-3 text-slate-200">{exp.description}</td>
                      <td className="p-3 font-mono text-slate-400">{exp.reference || "N/A"}</td>
                      <td className="p-3 font-mono text-[10px] text-slate-400">
                        {exp.expenseDate ? new Date(exp.expenseDate).toLocaleDateString("en-IN") : "N/A"}
                      </td>
                      <td className="p-3 text-right">
                        <Badge
                          variant="outline"
                          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px]"
                        >
                          {exp.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: PAYROLL PROCESSING */}
      {activeTab === "payroll" && (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-200">24/7 Virtual Staff & Real Staff Payroll</h2>
              <p className="text-xs text-slate-400">
                Automated idempotent batch salary credits debiting Company Payroll Account
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-emerald-500/30 text-emerald-400 text-xs"
                onClick={handleOpenPayrollPreview}
                disabled={actionProcessing}
              >
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                Preview Next Payroll
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                onClick={() => {
                  setCustomPayrollPeriod(getNextPayablePeriod());
                  setShowPayrollRunModal(true);
                }}
                disabled={actionProcessing}
              >
                <Calendar className="mr-1.5 h-3.5 w-3.5" />
                Run Current Payroll
              </Button>
            </div>
          </div>

          {/* 24/7 Persistent Scheduler Status Card */}
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-cyan-950/40 shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white font-mono">24/7 Autonomous Payroll Scheduler</span>
                    <Badge className="bg-emerald-950 border-emerald-500/50 text-emerald-300 text-[10px] animate-pulse">
                      ● PERSISTENT RUNNER ACTIVE
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    Runs hourly server-side daemon · Asia/Kolkata timezone · Mutex locking · Missed-run auto-recovery
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTriggerSchedulerTest}
                  disabled={actionProcessing}
                  className="border-emerald-500/40 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/40 text-xs font-mono"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5 text-amber-400" />
                  Trigger Daemon Execution Test
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-800/80 text-xs font-mono">
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Execution Timezone</span>
                <span className="font-bold text-white">Asia/Kolkata (IST)</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Next Scheduled Run</span>
                <span className="font-bold text-cyan-300">
                  {schedulerStatus?.nextScheduledRun
                    ? new Date(schedulerStatus.nextScheduledRun).toLocaleDateString("en-IN")
                    : "28th of Month"}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Last Successful Period</span>
                <span className="font-bold text-emerald-400">{schedulerStatus?.lastRunPeriod || "PAYROLL-2026-09"}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Durable Recovery</span>
                <span className="font-bold text-emerald-400">ENABLED (No tab req.)</span>
              </div>
            </div>
          </div>

          {/* Payroll Runs History */}
          <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/60">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800 font-mono">
                <tr>
                  <th className="p-3">Period</th>
                  <th className="p-3">Frequency</th>
                  <th className="p-3">Employees Paid</th>
                  <th className="p-3">Gross Total</th>
                  <th className="p-3">Net Disbursed</th>
                  <th className="p-3">Execution Date</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 font-sans">
                {payrollRuns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No historical payroll runs found. Click “Preview Next Payroll” or “Run Current Payroll” to execute.
                    </td>
                  </tr>
                ) : (
                  payrollRuns.map((run) => (
                    <tr key={run.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-200">{run.payrollPeriod}</td>
                      <td className="p-3 text-slate-400">{run.frequency}</td>
                      <td className="p-3 font-mono text-emerald-400 font-semibold">{run.totalEmployees.toLocaleString()} staff</td>
                      <td className="p-3 font-mono text-slate-300">{formatINR(run.grossAmount)}</td>
                      <td className="p-3 font-mono font-bold text-emerald-400">{formatINR(run.netAmount)}</td>
                      <td className="p-3 font-mono text-[10px] text-slate-400">
                        {run.paymentDate ? new Date(run.paymentDate).toLocaleString("en-IN") : "Pending"}
                      </td>
                      <td className="p-3 text-right">
                        <Badge
                          variant="outline"
                          className={
                            run.status === "PAID"
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                              : run.status === "FAILED"
                              ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                              : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                          }
                        >
                          {run.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5.5: EMPLOYEE SALARIES & HIKES */}
      {activeTab === "salaries" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-200">
                Employee Compensation & Salary Grade Management
              </h2>
              <p className="text-xs text-slate-400">
                Standardized Indian Rupee (INR) pay grades by organizational hierarchy with audit-logged salary hike actions
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <Input
                  type="text"
                  placeholder="Search name, ID, role, grade..."
                  value={salarySearch}
                  onChange={(e) => setSalarySearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-slate-950 border-slate-800 text-slate-200"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-slate-800 text-slate-300 h-8 text-xs hover:bg-slate-800"
                onClick={fetchSalaryRoster}
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border-slate-800 bg-slate-900/60 p-3">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Staff on Roster</div>
              <div className="text-lg font-bold font-mono text-slate-200 mt-1">
                {salaryRoster.length} employees
              </div>
            </Card>
            <Card className="border-slate-800 bg-slate-900/60 p-3">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Monthly Base</div>
              <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
                {formatINR(salaryRoster.reduce((sum, r) => sum + (r.baseSalary || 0), 0))}
              </div>
            </Card>
            <Card className="border-slate-800 bg-slate-900/60 p-3">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Avg Base Pay</div>
              <div className="text-lg font-bold font-mono text-cyan-400 mt-1">
                {formatINR(
                  salaryRoster.length > 0
                    ? Math.round(salaryRoster.reduce((sum, r) => sum + (r.baseSalary || 0), 0) / salaryRoster.length)
                    : 0
                )}
              </div>
            </Card>
            <Card className="border-slate-800 bg-slate-900/60 p-3">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Net Monthly Disbursal</div>
              <div className="text-lg font-bold font-mono text-teal-300 mt-1">
                {formatINR(salaryRoster.reduce((sum, r) => sum + (r.netSalary || 0), 0))}
              </div>
            </Card>
          </div>

          {/* Employee Salaries Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/60">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800 font-mono">
                <tr>
                  <th className="p-3">Staff Member</th>
                  <th className="p-3">Department / Role</th>
                  <th className="p-3">Salary Grade</th>
                  <th className="p-3 font-mono">Base Salary</th>
                  <th className="p-3 font-mono">Gross Pay</th>
                  <th className="p-3 font-mono">Net Pay</th>
                  <th className="p-3">Revisions</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 font-sans">
                {(() => {
                  const query = salarySearch.toLowerCase().trim();
                  const filtered = salaryRoster.filter(
                    (item) =>
                      !query ||
                      item.fullName.toLowerCase().includes(query) ||
                      item.employeeId.toLowerCase().includes(query) ||
                      item.email.toLowerCase().includes(query) ||
                      item.department.toLowerCase().includes(query) ||
                      item.role.toLowerCase().includes(query) ||
                      item.gradeCode.toLowerCase().includes(query) ||
                      (item.jobTitle && item.jobTitle.toLowerCase().includes(query))
                  );

                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          {salaryRoster.length === 0
                            ? "Loading employee salary roster..."
                            : "No employees match your search query."}
                        </td>
                      </tr>
                    );
                  }

                  return filtered.map((emp) => (
                    <tr key={emp.employeeId} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3">
                        <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                          {emp.fullName}
                          <CopyButton value={emp.employeeId} title="Copy Employee ID" />
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{emp.employeeId}</div>
                        <div className="text-[10px] text-slate-500">{emp.email}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-slate-200 font-medium">{emp.department}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{emp.jobTitle || emp.role}</div>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className="border-cyan-500/30 bg-cyan-500/10 text-cyan-300 font-mono text-[10px]"
                        >
                          {emp.gradeCode}
                        </Badge>
                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{emp.gradeName}</div>
                      </td>
                      <td className="p-3 font-mono font-medium text-slate-200">{formatINR(emp.baseSalary)}</td>
                      <td className="p-3 font-mono text-slate-300">{formatINR(emp.grossSalary)}</td>
                      <td className="p-3 font-mono font-bold text-emerald-400">{formatINR(emp.netSalary)}</td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className="border-slate-700 bg-slate-900 text-slate-300 text-[10px]"
                        >
                          {emp.revisionCount || 0} revs
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          className="bg-emerald-600/90 hover:bg-emerald-500 text-white font-medium text-xs h-7 px-2.5 shadow-sm"
                          onClick={() => {
                            setSelectedHikeEmployee(emp);
                            setHikeForm({
                              hikeType: "PERCENTAGE",
                              value: "10",
                              reason: "Merit performance revision",
                              effectiveDate: new Date().toISOString().slice(0, 10),
                              newGrade: emp.gradeCode || "",
                            });
                            setShowSalaryHikeModal(true);
                          }}
                        >
                          <TrendingUp className="mr-1 h-3 w-3" />
                          Salary Hike
                        </Button>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: PAYROLL CALENDAR */}
      {activeTab === "calendar" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-200">Automated Payroll Schedule & Calendar</h2>
            <p className="text-xs text-slate-400">
              Configured for monthly automated disbursement on the last business day (Default: 30th/31st 00:00 UTC)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {calendarEvents.map((event) => (
              <Card key={event.id} className="border-slate-800 bg-slate-900/60 shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-emerald-400">{event.period}</span>
                    <Badge
                      variant="outline"
                      className={
                        event.status === "PAID"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                          : "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
                      }
                    >
                      {event.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-100 mt-2">{event.title}</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Payment Date: {new Date(event.scheduledDate).toLocaleDateString("en-IN", { dateStyle: "long" })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Eligible Employees:</span>
                    <span className="font-mono text-slate-200 font-semibold">{event.employeeCount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Projected Net Disbursal:</span>
                    <span className="font-mono text-emerald-400 font-bold">{formatINR(event.netAmount)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: WALLET ACTIVITY */}
      {activeTab === "wallet-activity" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-200">Passenger Simulation Wallet Activity</h2>
              <p className="text-xs text-slate-400">
                Audit trail of simulation top-ups, ticket payments, and refund credits
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-emerald-500/30 text-emerald-400 text-xs"
              onClick={() => setShowWalletAdjustmentModal(true)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Adjust User Wallet
            </Button>
          </div>

          {/* Quick Metrics for Wallet */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-slate-800 bg-slate-900/60 p-4">
              <div className="text-xs font-semibold text-slate-400">Total Simulation Money Created</div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                {formatINR(walletActivity?.summary?.totalSimulationMoneyCreated)}
              </div>
            </Card>
            <Card className="border-slate-800 bg-slate-900/60 p-4">
              <div className="text-xs font-semibold text-slate-400">Total Top-Ups Processed</div>
              <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
                {walletActivity?.summary?.totalTopUps || 0}
              </div>
            </Card>
            <Card className="border-slate-800 bg-slate-900/60 p-4">
              <div className="text-xs font-semibold text-slate-400">Average Top-Up Amount</div>
              <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                {formatINR(walletActivity?.summary?.averageTopUp)}
              </div>
            </Card>
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/60">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800 font-mono">
                <tr>
                  <th className="p-3">Tx Number</th>
                  <th className="p-3">User ID</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Before Balance</th>
                  <th className="p-3">After Balance</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 font-sans">
                {!walletActivity?.transactions || walletActivity.transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No passenger wallet transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  walletActivity.transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3 font-mono text-slate-300">{tx.referenceId || tx.id.substring(0, 12)}</td>
                      <td className="p-3 font-mono text-slate-400">{tx.userId.substring(0, 10)}...</td>
                      <td className="p-3">
                        <Badge variant="outline" className="border-slate-700 bg-slate-900 text-slate-300 text-[10px] font-mono">
                          {tx.type}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-400">{formatINR(tx.amount)}</td>
                      <td className="p-3 font-mono text-slate-400">{formatINR(tx.balanceBefore)}</td>
                      <td className="p-3 font-mono text-slate-100">{formatINR(tx.balanceAfter)}</td>
                      <td className="p-3 font-mono text-[10px] text-slate-400">
                        {new Date(tx.createdAt).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 8: RECONCILIATION REPORTS */}
      {activeTab === "reports" && (
        <div className="space-y-6">
          <Card className="border-slate-800 bg-slate-900/60 shadow">
            <CardHeader>
              <CardTitle className="text-base text-slate-200">Ledger Balance Reconciliation Statement</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Formula: Opening Balance + Income - Expenses - Refunds + Other Credits - Other Debits = Closing Balance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Initial Company Capital:</span>
                    <span className="font-mono text-emerald-400 font-bold">{formatINR(summary?.openingBalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">+ Total Ticket & Service Revenue:</span>
                    <span className="font-mono text-cyan-400">+{formatINR(summary?.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">- Total Staff Salaries & Payroll:</span>
                    <span className="font-mono text-rose-400">-{formatINR(summary?.totalSalaries)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">- Total Operational Expenses:</span>
                    <span className="font-mono text-rose-400">-{formatINR(summary?.totalExpenses)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">- Total Ticket Refunds Issued:</span>
                    <span className="font-mono text-amber-400">-{formatINR(summary?.totalRefunds)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-sm">
                    <span className="text-slate-200">Reconciled Closing Balance:</span>
                    <span className="font-mono text-emerald-400">{formatINR(summary?.closingBalance)}</span>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3 text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Ledger Audit Integrity Verification
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    All debits and credits across the AOCC Treasury, Operating, Payroll, and Refund accounts have matched
                    the immutable ledger records with 0 rounding errors.
                  </p>
                  <div className="p-2.5 rounded bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 font-mono text-[11px]">
                    INTEGRITY STATUS: 100% BALANCED · DOUBLE-ENTRY PASS
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL: ADD MONEY / BILLIONAIRE CAPITAL INJECTION */}
      {showAddMoneyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-xl border border-amber-500/40 bg-slate-900 p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Sparkles className="h-4 w-4 fill-current" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    Add Money · Billionaire Mode
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Inject simulated capital into company accounts for unlimited liquidity
                  </p>
                </div>
              </div>
              <button onClick={() => setShowAddMoneyModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={(e) => handleExecuteAddMoney(e)} className="space-y-4 mt-4 text-xs">
              {/* Target account selection */}
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Target Account</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setAddMoneyForm((prev) => ({ ...prev, targetAll: true }))}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      addMoneyForm.targetAll
                        ? "border-amber-500 bg-amber-500/10 text-amber-300 shadow-sm"
                        : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 fill-current" /> All Accounts
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Inject into all company reserves</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAddMoneyForm((prev) => ({ ...prev, targetAll: false }))}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      !addMoneyForm.targetAll
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-300 shadow-sm"
                        : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5" /> Specific Account
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Select a single institution account</div>
                  </button>
                </div>

                {!addMoneyForm.targetAll && (
                  <select
                    value={addMoneyForm.accountId}
                    onChange={(e) => setAddMoneyForm((prev) => ({ ...prev, accountId: e.target.value }))}
                    className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-slate-200 mt-2 font-mono"
                  >
                    <option value="">-- Select Destination Account --</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountName} ({acc.accountNumber}) · Bal: {formatINR(acc.balance)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Amount Quick Presets */}
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Quick Amount Presets</label>
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  {[
                    { label: "₹1,000 Billion 💎", val: 1_000_000_000_000 },
                    { label: "₹100 Billion", val: 100_000_000_000 },
                    { label: "₹10 Billion", val: 10_000_000_000 },
                    { label: "₹1 Billion", val: 1_000_000_000 },
                    { label: "₹100 Crore", val: 1_000_000_000 },
                    { label: "₹10 Crore", val: 100_000_000 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() =>
                        setAddMoneyForm((prev) => ({ ...prev, amount: preset.val.toString() }))
                      }
                      className={`px-2 py-1.5 rounded border text-[11px] font-semibold transition-all ${
                        addMoneyForm.amount === preset.val.toString()
                          ? "border-amber-400 bg-amber-400/20 text-amber-200"
                          : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="mt-2">
                  <label className="block text-slate-400 mb-1 text-[11px]">Custom Amount (INR / ₹)</label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="Enter amount (e.g. 1000000000000)"
                    value={addMoneyForm.amount}
                    onChange={(e) => setAddMoneyForm((prev) => ({ ...prev, amount: e.target.value }))}
                    className="bg-slate-950 border-slate-800 text-slate-100 font-mono text-sm"
                  />
                  <div className="mt-1 text-xs text-amber-400 font-mono font-bold flex items-center gap-1">
                    <span>Preview:</span>
                    <span>{formatINR(addMoneyForm.amount)}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Reason / Audit Memo</label>
                <Input
                  type="text"
                  placeholder="e.g. Billionaire capital expansion / Unlimited liquidity"
                  value={addMoneyForm.reason}
                  onChange={(e) => setAddMoneyForm((prev) => ({ ...prev, reason: e.target.value }))}
                  className="bg-slate-950 border-slate-800 text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddMoneyModal(false)}
                  className="border-slate-800 text-slate-400"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-600 hover:from-amber-400 hover:to-emerald-500 text-slate-950 font-bold shadow-lg"
                  disabled={actionProcessing}
                >
                  {actionProcessing ? "Injecting Capital..." : "⚡ Inject Money Now"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INTERNAL TRANSFER */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <ArrowDownUp className="h-4 w-4 text-cyan-400" />
                Internal Company Transfer
              </h3>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Source Account</label>
                <select
                  value={transferForm.sourceAccountId}
                  onChange={(e) => setTransferForm({ ...transferForm, sourceAccountId: e.target.value })}
                  className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-slate-200"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.accountName} ({formatINR(a.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Destination Account</label>
                <select
                  value={transferForm.destinationAccountId}
                  onChange={(e) => setTransferForm({ ...transferForm, destinationAccountId: e.target.value })}
                  className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-slate-200"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.accountName} ({formatINR(a.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Amount (INR / ₹)</label>
                <Input
                  type="number"
                  placeholder="e.g. 500000"
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Transfer Reason / Audit Memo</label>
                <Input
                  type="text"
                  placeholder="e.g. Allocate funds to Payroll Reserve"
                  value={transferForm.reason}
                  onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTransferModal(false)}
                  className="border-slate-800 text-slate-400"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
                  disabled={actionProcessing}
                >
                  {actionProcessing ? "Processing..." : "Confirm Transfer"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD EXPENSE */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-rose-400" />
                Record Company Expense
              </h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRecordExpense} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Category</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-slate-200"
                >
                  <option value="AIRPORT_OPERATIONS">Airport Operations</option>
                  <option value="GROUND_OPERATIONS">Ground Operations</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="FUEL_SIMULATION">Fuel Simulation</option>
                  <option value="SECURITY">Security</option>
                  <option value="EQUIPMENT">Equipment</option>
                  <option value="UTILITIES">Utilities</option>
                  <option value="MARKETING">Marketing</option>
                  <option value="EMERGENCY_OPERATIONS">Emergency Operations</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Amount (INR / ₹)</label>
                <Input
                  type="number"
                  placeholder="e.g. 150000"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Description</label>
                <Input
                  type="text"
                  placeholder="e.g. Runway 09R friction test and maintenance"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Reference / PO #</label>
                <Input
                  type="text"
                  placeholder="e.g. PO-2026-991"
                  value={expenseForm.reference}
                  onChange={(e) => setExpenseForm({ ...expenseForm, reference: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExpenseModal(false)}
                  className="border-slate-800 text-slate-400"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-rose-600 hover:bg-rose-500 text-white font-semibold"
                  disabled={actionProcessing}
                >
                  {actionProcessing ? "Recording..." : "Record Expense"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PAYROLL PREVIEW */}
      {showPayrollPreviewModal && payrollPreviewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Eye className="h-4 w-4 text-emerald-400" />
                Payroll Pre-Flight Preview ({payrollPreviewData.period})
              </h3>
              <button onClick={() => setShowPayrollPreviewModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Eligible Staff Count</div>
                  <div className="text-lg font-bold font-mono text-slate-100 mt-1">
                    {payrollPreviewData.employeeCount.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Company Payroll Reserve</div>
                  <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
                    {formatINR(payrollPreviewData.companyBalance)}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Base & Gross Salaries:</span>
                  <span className="font-mono text-slate-200">{formatINR(payrollPreviewData.grossSalary)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">+ Operational Bonuses:</span>
                  <span className="font-mono text-cyan-400">+{formatINR(payrollPreviewData.bonuses)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">- Total Deductions:</span>
                  <span className="font-mono text-rose-400">-{formatINR(payrollPreviewData.deductions)}</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-sm">
                  <span className="text-slate-100">Net Disbursal Required:</span>
                  <span className="font-mono text-emerald-400">{formatINR(payrollPreviewData.netSalary)}</span>
                </div>
                <div className="flex justify-between text-[11px] pt-1">
                  <span className="text-slate-400">Projected Balance After Disbursal:</span>
                  <span className="font-mono text-slate-300">{formatINR(payrollPreviewData.projectedBalance)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-[11px]">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>Validation Passed: Company reserves are fully sufficient. No actual balances are modified in preview.</span>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPayrollPreviewModal(false)}
                  className="border-slate-800 text-slate-400"
                >
                  Close Preview
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                  onClick={() => {
                    setShowPayrollPreviewModal(false);
                    setShowPayrollRunModal(true);
                  }}
                >
                  Proceed to Execution
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RUN PAYROLL CONFIRMATION */}
      {showPayrollRunModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-emerald-400" />
                Confirm Batch Payroll Execution
              </h3>
              <button onClick={() => setShowPayrollRunModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 mt-4 text-xs">
              <p className="text-slate-300 leading-relaxed">
                You are about to execute the scheduled batch payroll for all registered real and virtual staff members.
              </p>
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Target Payroll Period</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                      setCustomPayrollPeriod(`PAYROLL-${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`);
                    }}
                    className="px-2 py-1 rounded bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono hover:bg-emerald-900/60 transition"
                  >
                    Next Period (PAYROLL-2026-11)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      setCustomPayrollPeriod(`PAYROLL-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-CYCLE2`);
                    }}
                    className="px-2 py-1 rounded bg-cyan-950/50 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono hover:bg-cyan-900/60 transition"
                  >
                    Current Mid-Month (CYCLE2)
                  </button>
                </div>
                <Input
                  type="text"
                  placeholder={`PAYROLL-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`}
                  value={customPayrollPeriod}
                  onChange={(e) => setCustomPayrollPeriod(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-slate-200 font-mono text-xs"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Specify target period (e.g. PAYROLL-2026-11 or PAYROLL-2026-10-CYCLE2).
                </p>
              </div>
              <ul className="space-y-1.5 text-slate-400 list-disc list-inside">
                <li>Atomic transaction: debits Company Payroll Account.</li>
                <li>Credits individual Employee Salary Accounts.</li>
                <li>Creates immutable double-entry ledger transactions.</li>
                <li>Guaranteed idempotent: safe against concurrent duplicate executions.</li>
              </ul>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPayrollRunModal(false)}
                  className="border-slate-800 text-slate-400"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                  onClick={handleExecutePayroll}
                  disabled={actionProcessing}
                >
                  {actionProcessing ? "Disbursing Salaries..." : "Execute Payroll Now"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADMIN WALLET ADJUSTMENT */}
      {showWalletAdjustmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-400" />
                Admin Wallet Balance Adjustment
              </h3>
              <button onClick={() => setShowWalletAdjustmentModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteWalletAdjustment} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Target User ID</label>
                <Input
                  type="text"
                  placeholder="Enter User ID"
                  value={walletAdjustForm.userId}
                  onChange={(e) => setWalletAdjustForm({ ...walletAdjustForm, userId: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Adjustment Direction</label>
                <select
                  value={walletAdjustForm.direction}
                  onChange={(e) => setWalletAdjustForm({ ...walletAdjustForm, direction: e.target.value })}
                  className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-slate-200"
                >
                  <option value="CREDIT">CREDIT (+ Add Money)</option>
                  <option value="DEBIT">DEBIT (- Deduct Money)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Amount (INR / ₹)</label>
                <Input
                  type="number"
                  placeholder="e.g. 5000"
                  value={walletAdjustForm.amount}
                  onChange={(e) => setWalletAdjustForm({ ...walletAdjustForm, amount: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Reason / Audit Trail Memo</label>
                <Input
                  type="text"
                  placeholder="e.g. Operational goodwill simulation top-up"
                  value={walletAdjustForm.reason}
                  onChange={(e) => setWalletAdjustForm({ ...walletAdjustForm, reason: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowWalletAdjustmentModal(false)}
                  className="border-slate-800 text-slate-400"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                  disabled={actionProcessing}
                >
                  {actionProcessing ? "Applying..." : "Confirm Adjustment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SALARY HIKE DIALOG */}
      {showSalaryHikeModal && selectedHikeEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  Apply Salary Hike & Grade Adjustment
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Revising compensation for {selectedHikeEmployee.fullName} ({selectedHikeEmployee.employeeId})
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSalaryHikeModal(false);
                  setSelectedHikeEmployee(null);
                }}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Current Compensation Card */}
            <div className="rounded-lg bg-slate-950/70 border border-slate-800 p-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Current Grade</span>
                <span className="font-mono font-bold text-cyan-300">{selectedHikeEmployee.gradeCode}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Current Base</span>
                <span className="font-mono font-bold text-slate-200">{formatINR(selectedHikeEmployee.baseSalary)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Current Net</span>
                <span className="font-mono font-bold text-emerald-400">{formatINR(selectedHikeEmployee.netSalary)}</span>
              </div>
            </div>

            <form onSubmit={handleExecuteSalaryHike} className="space-y-3.5 text-xs">
              {/* Hike Type selection */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setHikeForm({ ...hikeForm, hikeType: "PERCENTAGE" })}
                    className={`p-2 rounded-lg border text-center font-medium transition-colors ${
                      hikeForm.hikeType === "PERCENTAGE"
                        ? "border-emerald-500 bg-emerald-950/30 text-emerald-300"
                        : "border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900"
                    }`}
                  >
                    Percentage Hike (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHikeForm({ ...hikeForm, hikeType: "FIXED" })}
                    className={`p-2 rounded-lg border text-center font-medium transition-colors ${
                      hikeForm.hikeType === "FIXED"
                        ? "border-emerald-500 bg-emerald-950/30 text-emerald-300"
                        : "border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900"
                    }`}
                  >
                    Fixed Amount (₹ INR)
                  </button>
                </div>
              </div>

              {/* Hike Value */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {hikeForm.hikeType === "PERCENTAGE" ? "Hike Percentage (%)" : "Fixed Increment (₹ INR)"}
                </label>
                <Input
                  type="number"
                  step="any"
                  placeholder={hikeForm.hikeType === "PERCENTAGE" ? "e.g. 10 for 10%" : "e.g. 25000"}
                  value={hikeForm.value}
                  onChange={(e) => setHikeForm({ ...hikeForm, value: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-slate-200"
                  required
                />
              </div>

              {/* New Grade (Optional Promotion) */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Salary Grade / Promotion (Optional)
                </label>
                <select
                  value={hikeForm.newGrade}
                  onChange={(e) => setHikeForm({ ...hikeForm, newGrade: e.target.value })}
                  className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-slate-200 font-mono text-xs"
                >
                  <option value="">Keep Current Grade ({selectedHikeEmployee.gradeCode})</option>
                  <option value="EXECUTIVE">EXECUTIVE — C-Suite / Airport Director (₹2,00,000 - ₹3,00,000)</option>
                  <option value="SENIOR_MANAGEMENT">SENIOR_MANAGEMENT — Operations Head / Senior ATC (₹1,40,000 - ₹2,00,000)</option>
                  <option value="MANAGEMENT">MANAGEMENT — Duty Manager / Terminal Supervisor (₹90,000 - ₹1,40,000)</option>
                  <option value="SENIOR_SPECIALIST">SENIOR_SPECIALIST — Senior Radar Controller / Flight Dispatch (₹70,000 - ₹1,00,000)</option>
                  <option value="SPECIALIST">SPECIALIST — Tower Controller / Ground Ops Lead (₹50,000 - ₹75,000)</option>
                  <option value="SUPERVISOR">SUPERVISOR — Ramp Supervisor / Shift Lead (₹40,000 - ₹60,000)</option>
                  <option value="EXPERIENCED_STAFF">EXPERIENCED_STAFF — Gate Agent / Ticketing Agent (₹30,000 - ₹45,000)</option>
                  <option value="ENTRY_LEVEL">ENTRY_LEVEL — Ground Staff / Baggage / Security (₹20,000 - ₹40,000)</option>
                  <option value="TRAINEE">TRAINEE — Intern / Trainee (₹10,000 - ₹20,000)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Effective Date</label>
                  <Input
                    type="date"
                    value={hikeForm.effectiveDate}
                    onChange={(e) => setHikeForm({ ...hikeForm, effectiveDate: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-slate-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Reason / Memo</label>
                  <Input
                    type="text"
                    placeholder="e.g. Annual merit review"
                    value={hikeForm.reason}
                    onChange={(e) => setHikeForm({ ...hikeForm, reason: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-slate-200"
                    required
                  />
                </div>
              </div>

              {/* Live Preview Card */}
              {(() => {
                const curBase = selectedHikeEmployee.baseSalary || 0;
                const v = Number.parseFloat(hikeForm.value) || 0;
                const increment = hikeForm.hikeType === "PERCENTAGE" ? (curBase * v) / 100 : v;
                const newBase = Math.round(curBase + increment);
                const projectedGross = Math.round(newBase + (selectedHikeEmployee.allowances || 0));
                const projectedNet = Math.round(projectedGross - (selectedHikeEmployee.deductions || 0));

                return (
                  <div className="rounded-lg bg-emerald-950/20 border border-emerald-500/30 p-3 space-y-1.5 font-mono text-xs">
                    <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                      Live Projected Revision
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Increment:</span>
                      <span className="font-bold text-emerald-300">+{formatINR(increment)}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>New Monthly Base:</span>
                      <span className="font-bold text-white">{formatINR(newBase)}</span>
                    </div>
                    <div className="flex justify-between text-slate-300 border-t border-emerald-500/20 pt-1">
                      <span>Projected Net Pay:</span>
                      <span className="font-bold text-emerald-400">{formatINR(projectedNet)}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowSalaryHikeModal(false);
                    setSelectedHikeEmployee(null);
                  }}
                  className="border-slate-800 text-slate-400"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                  disabled={hikeSubmitting}
                >
                  {hikeSubmitting ? "Applying Hike..." : "Confirm & Apply Salary Hike"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
