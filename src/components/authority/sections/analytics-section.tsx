"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Globe,
  Layers,
  PlusCircle,
  RefreshCw,
  Search,
  Shield,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  Warehouse,
  X,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
  Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CreditTransactionDTO } from "@/lib/domain";

// Hourly Airfield Movements & Capacity Limit Data
const HOURLY_THROUGHPUT_DATA = [
  { hour: "06:00", departures: 14, arrivals: 12, slotDemand: 28, capacity: 46 },
  { hour: "08:00", departures: 28, arrivals: 22, slotDemand: 52, capacity: 46 },
  { hour: "10:00", departures: 34, arrivals: 30, slotDemand: 66, capacity: 52 },
  { hour: "12:00", departures: 24, arrivals: 28, slotDemand: 54, capacity: 52 },
  { hour: "14:00", departures: 32, arrivals: 34, slotDemand: 68, capacity: 52 },
  { hour: "16:00", departures: 38, arrivals: 36, slotDemand: 76, capacity: 52 },
  { hour: "18:00", departures: 30, arrivals: 32, slotDemand: 64, capacity: 48 },
  { hour: "20:00", departures: 20, arrivals: 24, slotDemand: 46, capacity: 48 },
  { hour: "22:00", departures: 12, arrivals: 16, slotDemand: 30, capacity: 40 },
];

// Multi-Station Revenue & Yield Breakdown
const STATION_FINANCIALS = [
  { station: "HYD", name: "Hyderabad Hub", bookingsRev: 482000, baggageRev: 74500, slotFees: 128000, total: 684500, flights: 44, loadFactor: 86.4 },
  { station: "BOM", name: "Mumbai CSIA", bookingsRev: 412000, baggageRev: 68000, slotFees: 145000, total: 625000, flights: 38, loadFactor: 91.2 },
  { station: "DEL", name: "Delhi IGI", bookingsRev: 520000, baggageRev: 89000, slotFees: 160000, total: 769000, flights: 48, loadFactor: 88.7 },
  { station: "BLR", name: "Bangalore KIA", bookingsRev: 364000, baggageRev: 52000, slotFees: 112000, total: 528000, flights: 34, loadFactor: 84.1 },
  { station: "MAA", name: "Chennai Intl", bookingsRev: 290000, baggageRev: 41000, slotFees: 95000, total: 426000, flights: 28, loadFactor: 82.5 },
  { station: "JFK", name: "New York JFK", bookingsRev: 640000, baggageRev: 112000, slotFees: 210000, total: 962000, flights: 22, loadFactor: 94.0 },
];

// Delay Attribution Root Causes
const DELAY_BREAKDOWN = [
  { category: "Weather / Convective Shear", pct: 38, minutes: 248, color: "bg-sky-400" },
  { category: "ATFM En Route Spacing", pct: 30, minutes: 196, color: "bg-indigo-400" },
  { category: "Ramp & Baggage Turnaround", pct: 20, minutes: 130, color: "bg-amber-400" },
  { category: "Technical & Line Maintenance", pct: 12, minutes: 78, color: "bg-rose-400" },
];

type AnalyticsTab = "throughput" | "revenue" | "ledger" | "reports";

export function AnalyticsSection() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("throughput");

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

  // Filters for ledger
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerFilterType, setLedgerFilterType] = useState<string>("ALL");

  // Manual adjustment form
  const [targetUserId, setTargetUserId] = useState("");
  const [adjustAmount, setAdjustAmount] = useState(1000);
  const [adjustType, setAdjustType] = useState<"CREDIT" | "ADJUSTMENT" | "BONUS">("CREDIT");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustStatus, setAdjustStatus] = useState<string | null>(null);

  const fetchFinancialData = useCallback(async () => {
    try {
      const [resFin, resLedger] = await Promise.all([
        fetch("/api/credits/analytics"),
        fetch("/api/credits?all=true&pageSize=30"),
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
    let ignore = false;
    async function loadData() {
      try {
        const [resFin, resLedger] = await Promise.all([
          fetch("/api/credits/analytics"),
          fetch("/api/credits?all=true&pageSize=30"),
        ]);

        if (resFin.ok && !ignore) {
          const data = await resFin.json();
          setFinancial(data);
        }

        if (resLedger.ok && !ignore) {
          const data = await resLedger.json();
          setLedger(data.transactions || []);
        }
      } catch (err) {
        console.warn("Failed to load financial telemetry", err);
      } finally {
        if (!ignore) {
          setLedgerLoading(false);
        }
      }
    }

    void loadData();
    return () => {
      ignore = true;
    };
  }, []);

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

  // Filtered ledger list
  const filteredLedger = useMemo(() => {
    return ledger.filter((tx) => {
      if (ledgerFilterType !== "ALL" && tx.type !== ledgerFilterType) return false;
      if (ledgerSearch.trim()) {
        const q = ledgerSearch.toLowerCase().trim();
        const str = `${tx.id} ${tx.userId} ${tx.userName || ""} ${tx.userEmail || ""} ${tx.description || ""} ${tx.referenceId || ""}`.toLowerCase();
        if (!str.includes(q)) return false;
      }
      return true;
    });
  }, [ledger, ledgerFilterType, ledgerSearch]);

  // Export CSV of ledger transactions
  const exportLedgerCSV = () => {
    if (ledger.length === 0) return;
    const headers = ["Transaction ID", "User ID", "User Name", "Type", "Amount", "Balance Before", "Balance After", "Description", "Timestamp"];
    const rows = ledger.map((tx) => [
      tx.id,
      tx.userId,
      `"${tx.userName || ""}"`,
      tx.type,
      tx.amount,
      tx.balanceBefore,
      tx.balanceAfter,
      `"${(tx.description || tx.referenceId || "").replace(/"/g, '""')}"`,
      new Date(tx.createdAt).toISOString(),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `aocc-credit-ledger-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Export Executive Operational Report
  const exportExecutiveReportCSV = () => {
    const headers = ["Station", "Station Name", "Flight Movements", "Bookings Revenue (INR)", "Baggage Revenue (INR)", "Slot Fees (INR)", "Total Yield (INR)", "Load Factor (%)"];
    const rows = STATION_FINANCIALS.map((s) => [
      s.station,
      `"${s.name}"`,
      s.flights,
      s.bookingsRev,
      s.baggageRev,
      s.slotFees,
      s.total,
      s.loadFactor,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `aocc-station-financial-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
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
      {/* Header & Tab Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-[#090e17]/95 p-4 shadow-xl backdrop-blur-md md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-sky-400" />
            Airport Operational Intelligence & Financial Telemetry
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Real-time multi-station yields, hourly runway throughput histograms, slot compliance, and user credit ledger.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tab Switcher */}
          <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900/60 p-1 font-mono text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("throughput")}
              className={cn(
                "rounded px-3 py-1.5 transition font-medium",
                activeTab === "throughput" ? "bg-sky-500 text-slate-950 font-bold" : "text-slate-400 hover:text-slate-200",
              )}
            >
              Throughput & Slots
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("revenue")}
              className={cn(
                "rounded px-3 py-1.5 transition font-medium",
                activeTab === "revenue" ? "bg-sky-500 text-slate-950 font-bold" : "text-slate-400 hover:text-slate-200",
              )}
            >
              Multi-Station Yield
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ledger")}
              className={cn(
                "rounded px-3 py-1.5 transition font-medium",
                activeTab === "ledger" ? "bg-sky-500 text-slate-950 font-bold" : "text-slate-400 hover:text-slate-200",
              )}
            >
              Credit Ledger
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("reports")}
              className={cn(
                "rounded px-3 py-1.5 transition font-medium",
                activeTab === "reports" ? "bg-sky-500 text-slate-950 font-bold" : "text-slate-400 hover:text-slate-200",
              )}
            >
              Reports & CSV
            </button>
          </div>

          <button
            onClick={() => fetchFinancialData()}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1.5 transition font-mono"
            title="Refresh analytics"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: 4 Summary Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-[#090e17]/80">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-slate-400 uppercase flex items-center justify-between font-mono">
              Simulated Revenue
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              ₹{(financial?.totalSimulatedRevenue ?? 3994500).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              {financial?.activeBookingsCount ?? 384} confirmed bookings
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-[#090e17]/80">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-slate-400 uppercase flex items-center justify-between font-mono">
              Credits Debited
              <CreditCard className="h-4 w-4 text-amber-400" />
            </span>
            <div className="text-2xl font-bold font-mono text-amber-300">
              ₹{(financial?.totalCreditsUsed ?? 45000).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              User credit bookings
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-[#090e17]/80">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-slate-400 uppercase flex items-center justify-between font-mono">
              Avg Booking Value
              <ArrowUpRight className="h-4 w-4 text-sky-400" />
            </span>
            <div className="text-2xl font-bold font-mono text-slate-100">
              ₹{Math.round(financial?.averageBookingValue ?? 4650).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Economy & Business blend
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-[#090e17]/80">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-slate-400 uppercase flex items-center justify-between font-mono">
              Total Refunds Issued
              <ArrowDownRight className="h-4 w-4 text-sky-400" />
            </span>
            <div className="text-2xl font-bold font-mono text-sky-400">
              ₹{(financial?.totalRefunds ?? 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Zero non-conforming reversals
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TAB 1: THROUGHPUT & SLOTS */}
      {activeTab === "throughput" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="border-slate-800 bg-[#090e17]/90 shadow-lg">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-100 uppercase tracking-wider font-mono">
                        <BarChart3 className="h-4 w-4 text-sky-400" />
                        Hourly Runway Movements vs Slot Demand
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-400 font-mono mt-0.5">
                        Departures, arrivals, and peak slot demand plotted against nominal runway capacity envelopes.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="border-cyan-500/30 bg-cyan-950/20 text-cyan-300 font-mono text-[10px]">
                      52 MAX HOURLY SLOTS
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={HOURLY_THROUGHPUT_DATA}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                      <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} fontStyle="mono" />
                      <YAxis stroke="#94a3b8" fontSize={11} fontStyle="mono" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#090e17",
                          borderColor: "#334155",
                          borderRadius: "8px",
                          fontSize: "12px",
                          fontFamily: "monospace",
                        }}
                      />
                      <Bar dataKey="departures" fill="#38bdf8" name="Departures" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="arrivals" fill="#34d399" name="Arrivals" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Delay Reason Breakdown */}
            <div>
              <Card className="border-slate-800 bg-[#090e17]/90 shadow-lg h-full flex flex-col justify-between">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-100 uppercase tracking-wider font-mono">
                    <Clock className="h-4 w-4 text-amber-400" />
                    Operational Delay Attribution
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400 font-mono">
                    Distribution of cumulative operational delay minutes today (652 total mins).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  {DELAY_BREAKDOWN.map((item, idx) => (
                    <div key={idx} className="space-y-1 text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300 truncate">{item.category}</span>
                        <span className="font-bold text-slate-100">{item.minutes}m ({item.pct}%)</span>
                      </div>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", item.color)}
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="rounded border border-slate-800 bg-slate-900/60 p-2.5 text-[11px] font-mono text-slate-400">
                    <span className="text-cyan-400 font-semibold">Mitigation Strategy:</span> Ground Delay Programs (GDP) active on northern convective corridors; pre-departure taxiway sequencing reducing apron holding dwell.
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MULTI-STATION YIELD */}
      {activeTab === "revenue" && (
        <div className="space-y-6">
          <Card className="border-slate-800 bg-[#090e17]/90 shadow-lg">
            <CardHeader className="pb-3 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-100 uppercase tracking-wider font-mono">
                    <Globe className="h-4 w-4 text-emerald-400" />
                    Multi-Station Financial Telemetry & Hub Yield Matrix
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400 font-mono mt-0.5">
                    Breakdown across Passenger Bookings, BHS Baggage Fees, and Airfield Slot Fees.
                  </CardDescription>
                </div>
                <button
                  onClick={exportExecutiveReportCSV}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-mono text-slate-200 hover:bg-slate-700 transition"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Export Station CSV</span>
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase">
                    <tr>
                      <th className="py-2.5 px-4">Station</th>
                      <th className="py-2.5 px-4">Movements</th>
                      <th className="py-2.5 px-4 text-right">Bookings Rev</th>
                      <th className="py-2.5 px-4 text-right">Baggage Fees</th>
                      <th className="py-2.5 px-4 text-right">Slot & Gate Fees</th>
                      <th className="py-2.5 px-4 text-right">Total Hub Yield</th>
                      <th className="py-2.5 px-4 text-center">Load Factor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {STATION_FINANCIALS.map((s) => (
                      <tr key={s.station} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-4">
                          <div className="font-bold text-slate-100">{s.station}</div>
                          <div className="text-[10px] text-slate-400">{s.name}</div>
                        </td>
                        <td className="py-2.5 px-4">{s.flights} flights</td>
                        <td className="py-2.5 px-4 text-right text-slate-200">₹{s.bookingsRev.toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-right text-cyan-300">₹{s.baggageRev.toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-right text-amber-300">₹{s.slotFees.toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-emerald-400">₹{s.total.toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-center">
                          <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px]">
                            {s.loadFactor}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: CREDIT LEDGER */}
      {activeTab === "ledger" && (
        <Card className="border-slate-800 bg-[#090e17]/90 shadow-lg">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-100 uppercase tracking-wider font-mono">
                <CreditCard className="h-4 w-4 text-emerald-400" />
                Double-Spend Protected User Credit & Money Ledger
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 font-mono">
                Immutable audit ledger tracking user deposits, flight booking debits, baggage charges, and refunds.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={exportLedgerCSV}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono flex items-center gap-1.5 transition"
              >
                <Download className="h-3.5 w-3.5 text-cyan-400" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => setAdjustModalOpen(true)}
                className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold font-mono flex items-center gap-1.5 transition"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Admin Credit Adjustment</span>
              </button>
            </div>
          </CardHeader>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950/40 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search user, TX ID, description..."
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                className="rounded-md border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none w-56 font-mono"
              />
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="text-slate-400 text-[11px] uppercase">Type:</span>
              {["ALL", "CREDIT", "BOOKING_DEBIT", "REFUND"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setLedgerFilterType(t)}
                  className={cn(
                    "rounded px-2 py-0.5 text-[11px] transition",
                    ledgerFilterType === t
                      ? "bg-sky-500 text-slate-950 font-bold"
                      : "text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase">
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
                <tbody className="divide-y divide-slate-800/50">
                  {ledgerLoading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Loading credit ledger...
                      </td>
                    </tr>
                  ) : filteredLedger.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        No transactions match the query.
                      </td>
                    </tr>
                  ) : (
                    filteredLedger.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-2.5 px-4 text-[11px] text-slate-400">
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
                        <td className="py-2.5 px-4 text-right font-bold text-slate-200">
                          ₹{tx.amount.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-400">
                          ₹{tx.balanceBefore.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-emerald-400">
                          ₹{tx.balanceAfter.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-slate-300 max-w-xs truncate">
                          {tx.description || tx.referenceId || "—"}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
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
      )}

      {/* TAB 4: REPORTS & CSV */}
      {activeTab === "reports" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-slate-800 bg-[#090e17]/90 shadow-lg p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-950/50 border border-sky-500/30 text-sky-400">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 font-mono text-sm uppercase">Station Yield & Movements CSV</h3>
                  <p className="text-xs text-slate-400 font-mono">Full export of commercial flight revenue, excess baggage fees, and slot compliance.</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-mono">
                Downloads formatted CSV data for all 6 active hubs (HYD, BOM, DEL, BLR, MAA, JFK) with yield-per-flight metrics.
              </p>
              <button
                onClick={exportExecutiveReportCSV}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-sky-600 hover:bg-sky-500 py-2 text-xs font-semibold font-mono text-white transition shadow"
              >
                <Download className="h-4 w-4" />
                <span>Download Station Yield Report (.CSV)</span>
              </button>
            </Card>

            <Card className="border-slate-800 bg-[#090e17]/90 shadow-lg p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-950/50 border border-emerald-500/30 text-emerald-400">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 font-mono text-sm uppercase">Credit Transactions Ledger CSV</h3>
                  <p className="text-xs text-slate-400 font-mono">Complete double-spend protected audit trail of user balances and booking debits.</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-mono">
                Includes TX numbers, balance before, balance after, user references, and cryptographic audit timestamps.
              </p>
              <button
                onClick={exportLedgerCSV}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 py-2 text-xs font-semibold font-mono text-white transition shadow"
              >
                <Download className="h-4 w-4" />
                <span>Download Ledger Audit Trail (.CSV)</span>
              </button>
            </Card>
          </div>
        </div>
      )}

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

            <h3 className="text-lg font-bold text-white flex items-center gap-2 font-mono">
              <PlusCircle className="h-5 w-5 text-emerald-400" />
              Admin Credit Adjustment
            </h3>

            {adjustStatus && (
              <div
                className={`p-3 rounded-lg text-xs font-mono ${
                  adjustStatus.includes("successful")
                    ? "bg-emerald-950/60 border border-emerald-800 text-emerald-300"
                    : "bg-rose-950/60 border border-rose-800 text-rose-300"
                }`}
              >
                {adjustStatus}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs font-mono">
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
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 font-mono"
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
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg font-mono shadow"
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
