"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Clock,
  DollarSign,
  TrendingUp,
  CreditCard,
  RefreshCw,
  PlusCircle,
  FileText,
  User,
  CheckCircle2,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CreditTransactionDTO } from "@/lib/domain";

const THROUGHPUT_DATA = [
  { hour: "06:00", departures: 14, arrivals: 12, passengers: 3420 },
  { hour: "08:00", departures: 28, arrivals: 22, passengers: 6840 },
  { hour: "10:00", departures: 34, arrivals: 30, passengers: 8910 },
  { hour: "12:00", departures: 24, arrivals: 28, passengers: 7120 },
  { hour: "14:00", departures: 32, arrivals: 34, passengers: 9450 },
  { hour: "16:00", departures: 38, arrivals: 36, passengers: 10240 },
  { hour: "18:00", departures: 30, arrivals: 32, passengers: 8640 },
  { hour: "20:00", departures: 20, arrivals: 24, passengers: 5980 },
];

const DELAY_BREAKDOWN = [
  { category: "Weather / Convective", pct: 42 },
  { category: "ATC En Route Spacing", pct: 28 },
  { category: "Late Inbound Aircraft", pct: 18 },
  { category: "Ground Service / Turnaround", pct: 8 },
  { category: "Technical / Maintenance", pct: 4 },
];

export function AnalyticsSection() {
  const [financial, setFinancial] = useState<{
    totalSimulatedRevenue: number;
    totalCreditsUsed: number;
    totalCreditsAdded: number;
    totalRefunds: number;
    activeBookingsCount: number;
    averageBookingValue: number;
  } | null>(null);

  const [ledger, setLedger] = useState<CreditTransactionDTO[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);

  // Manual adjust form state
  const [targetUserId, setTargetUserId] = useState("");
  const [adjustAmount, setAdjustAmount] = useState(1000);
  const [adjustType, setAdjustType] = useState<"CREDIT" | "ADJUSTMENT" | "BONUS">("CREDIT");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustStatus, setAdjustStatus] = useState<string | null>(null);

  const fetchFinancialData = useCallback(async () => {
    try {
      const [resFin, resLedger] = await Promise.all([
        fetch("/api/credits/analytics"),
        fetch("/api/credits?all=true&pageSize=15"),
      ]);

      if (resFin.ok) {
        const data = await resFin.json();
        setFinancial(data);
      }

      if (resLedger.ok) {
        const data = await resLedger.json();
        setLedger(data.transactions || []);
      }
    } catch (err) {
      console.warn("Failed to load financial telemetry", err);
    } finally {
      setLedgerLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFinancialData();
  }, [fetchFinancialData]);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustStatus(null);
    try {
      const res = await fetch("/api/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: targetUserId.trim(),
          amount: Number(adjustAmount),
          type: adjustType,
          reason: adjustReason.trim() || "Administrative bonus/adjustment",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setAdjustStatus("Credit adjustment successful!");
        setTimeout(() => {
          setAdjustModalOpen(false);
          setAdjustStatus(null);
          fetchFinancialData();
        }, 1200);
      } else {
        setAdjustStatus(data.error || "Adjustment failed.");
      }
    } catch {
      setAdjustStatus("Network error occurred.");
    }
  };

  const getTransactionTypeBadge = (type: string) => {
    switch (type) {
      case "CREDIT":
      case "BONUS":
        return <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">+{type}</Badge>;
      case "BOOKING_DEBIT":
        return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">DEBIT</Badge>;
      case "REFUND":
        return <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/30">REFUND</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Airport Operational Intelligence & Financial Telemetry
          </h2>
          <p className="text-sm text-muted-foreground">
            Real-time analytics on runway throughput, passenger load factor, slot compliance, and user credit ledger.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchFinancialData()}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1.5 transition"
            title="Refresh analytics"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
          <Badge variant="outline" className="text-xs bg-primary/10 border-primary/40 text-primary">
            Live Telemetry Active
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground uppercase flex items-center justify-between">
              Simulated Revenue
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              ₹{(financial?.totalSimulatedRevenue ?? 1420800).toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {financial?.activeBookingsCount ?? 384} confirmed bookings
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground uppercase flex items-center justify-between">
              Credits Debited
              <CreditCard className="h-4 w-4 text-amber-400" />
            </span>
            <div className="text-2xl font-bold font-mono text-amber-300">
              ₹{(financial?.totalCreditsUsed ?? 45000).toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground">
              User credit bookings
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground uppercase flex items-center justify-between">
              Avg Booking Value
              <ArrowUpRight className="h-4 w-4 text-primary" />
            </span>
            <div className="text-2xl font-bold font-mono text-foreground">
              ₹{Math.round(financial?.averageBookingValue ?? 4650).toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Economy & Business blend
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground uppercase flex items-center justify-between">
              Total Refunds Issued
              <ArrowUpRight className="h-4 w-4 text-sky-400" />
            </span>
            <div className="text-2xl font-bold font-mono text-sky-400">
              ₹{(financial?.totalRefunds ?? 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Reversed on cancellations
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Flight Throughput Chart & Delay Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-border/60 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Hourly Runway Movements (Departures vs Arrivals)
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time aircraft movement count categorized by phase of operation.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={THROUGHPUT_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="departures" fill="#38bdf8" name="Departures" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="arrivals" fill="#22c55e" name="Arrivals" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Delay Reason Breakdown */}
        <div>
          <Card className="border-border/60 bg-card/80 h-full flex flex-col justify-between">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-400" />
                Root Cause Delay Breakdown
              </CardTitle>
              <CardDescription className="text-xs">
                Analysis of cumulative operational delay minutes today.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {DELAY_BREAKDOWN.map((item, idx) => (
                <div key={idx} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{item.category}</span>
                    <span className="font-mono font-bold text-foreground">{item.pct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        idx === 0
                          ? "bg-amber-400"
                          : idx === 1
                          ? "bg-sky-400"
                          : idx === 2
                          ? "bg-purple-400"
                          : "bg-zinc-400"
                      }`}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Credit Transactions Ledger Table */}
      <Card className="border-border/60 bg-card/80">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-400" />
              Live User Money & Credit Ledger (Double-Spend Protected)
            </CardTitle>
            <CardDescription className="text-xs">
              Complete transactional audit ledger recording user credits, booking debits, refunds, and adjustments.
            </CardDescription>
          </div>
          <button
            onClick={() => setAdjustModalOpen(true)}
            className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Admin Credit Adjustment</span>
          </button>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-y border-slate-800 text-slate-400 font-mono uppercase">
                <tr>
                  <th className="py-2.5 px-4">TX ID</th>
                  <th className="py-2.5 px-4">User</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                  <th className="py-2.5 px-4 text-right">Balance Before</th>
                  <th className="py-2.5 px-4 text-right">Balance After</th>
                  <th className="py-2.5 px-4">Description / Reference</th>
                  <th className="py-2.5 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 font-sans">
                {ledgerLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Loading credit ledger...
                    </td>
                  </tr>
                ) : ledger.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No credit transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  ledger.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400">
                        {tx.id.slice(0, 10)}...
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-200">
                          {tx.userName || "User"}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {tx.userEmail || tx.userId}
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        {getTransactionTypeBadge(tx.type)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-200">
                        ₹{tx.amount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-400">
                        ₹{tx.balanceBefore.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-400">
                        ₹{tx.balanceAfter.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-slate-300 max-w-xs truncate">
                        {tx.description || tx.referenceId || "—"}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Admin Manual Adjustment Modal */}
      {adjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setAdjustModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-emerald-400" />
              Admin Credit Adjustment
            </h3>

            {adjustStatus && (
              <div
                className={`p-3 rounded-lg text-xs ${
                  adjustStatus.includes("successful")
                    ? "bg-emerald-950/60 border border-emerald-800 text-emerald-300"
                    : "bg-rose-950/60 border border-rose-800 text-rose-300"
                }`}
              >
                {adjustStatus}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Target User ID:</label>
                <input
                  type="text"
                  required
                  placeholder="Enter User ID (e.g. usr-super or CUID)"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Amount (₹):</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Type:</label>
                  <select
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value as "CREDIT" | "ADJUSTMENT" | "BONUS")}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="CREDIT">Deposit (Credit)</option>
                    <option value="BONUS">Promotional Bonus</option>
                    <option value="ADJUSTMENT">Adjustment</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Reason / Audit Note:</label>
                <input
                  type="text"
                  placeholder="Reason for manual credit adjustment"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg"
                >
                  Execute Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
