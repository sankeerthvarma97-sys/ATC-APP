"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Coins,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { CreditTransactionDTO } from "@/lib/domain";

export function PassengerWalletCard() {
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [wallet, setWallet] = useState<{
    balance: number;
    walletMode: "NORMAL" | "UNLIMITED_SIMULATION";
    totalAdded: number;
    totalSpent: number;
    totalRefunded: number;
    recentTransactions: CreditTransactionDTO[];
  } | null>(null);

  const [customAmount, setCustomAmount] = useState("");
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const quickAmounts = [
    "1000",
    "100000",
    "10000000",
    "1000000000",
    "100000000000",
  ];

  const formatINR = (val: number | undefined | null) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const fetchWallet = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);
      const res = await fetch("/api/wallet");
      if (!res.ok) {
        throw new Error("Failed to load simulation wallet");
      }
      const data = await res.json();
      setWallet(data.wallet);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load wallet data.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchWallet();
  }, [fetchWallet]);

  const handleToggleUnlimitedMode = async () => {
    try {
      setSubmitting(true);
      setError(null);
      const targetMode = wallet?.walletMode === "UNLIMITED_SIMULATION" ? "NORMAL" : "UNLIMITED_SIMULATION";
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SET_MODE", mode: targetMode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to switch mode");
      setSuccess(`Switched to ${targetMode === "UNLIMITED_SIMULATION" ? "Unlimited Simulation" : "Standard"} Mode.`);
      await fetchWallet();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to switch wallet mode");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTopUp = async (amount: string) => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 100) {
      setError("Minimum top-up is ₹100");
      return;
    }
    if (numericAmount > 1_000_000_000_000) {
      setError("Maximum top-up is ₹1,000 Billion (₹1 Trillion)");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, idempotencyKey: crypto.randomUUID() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Top-up failed");
      }

      setSuccess(`Added ₹${numericAmount.toLocaleString("en-IN")} simulation credits!`);
      setCustomAmount("");
      setIsTopUpOpen(false);
      await fetchWallet();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Top-up failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-900/80 shadow-2xl text-slate-100">
      <CardHeader className="pb-4 border-b border-slate-800/80">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-slate-100">Passenger Simulation Wallet</CardTitle>
                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px]">
                  INR (₹)
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-400">
                Educational simulation credits for instant ticket bookings and refunds
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={wallet?.walletMode === "UNLIMITED_SIMULATION" ? "default" : "outline"}
              className={`text-xs h-8 ${
                wallet?.walletMode === "UNLIMITED_SIMULATION"
                  ? "bg-purple-600 hover:bg-purple-500 text-white border-purple-500/50 shadow-purple-950/50"
                  : "border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300"
              }`}
              onClick={handleToggleUnlimitedMode}
              disabled={submitting || refreshing}
            >
              <Zap className="mr-1.5 h-3.5 w-3.5 text-purple-400" />
              {wallet?.walletMode === "UNLIMITED_SIMULATION" ? "Unlimited ON" : "Unlimited Mode"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 text-xs h-8"
              onClick={fetchWallet}
              disabled={refreshing}
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin text-emerald-400" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-8 shadow-lg shadow-emerald-950/50"
              onClick={() => setIsTopUpOpen(true)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Simulation Money
            </Button>
          </div>
        </div>

        {/* Disclaimer Banner */}
        <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-300">
          <ShieldCheck className="h-4 w-4 shrink-0 text-amber-400" />
          <span>
            <strong>SIMULATION MONEY — NO REAL PAYMENT:</strong> This balance is fictional simulation credit for AOCC booking exercises.
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-5">
        {/* Feedback messages */}
        {error && (
          <div className="flex items-center justify-between rounded-md border border-rose-500/30 bg-rose-950/30 p-2.5 text-xs text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {success && (
          <div className="flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-950/30 p-2.5 text-xs text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{success}</span>
            </div>
            <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-emerald-200">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Balance & Aggregates Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 sm:col-span-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Available Wallet Balance
            </div>
            <div className="text-3xl font-extrabold font-mono text-emerald-400 mt-1">
              {wallet?.walletMode === "UNLIMITED_SIMULATION" ? "Unlimited Simulation Money" : formatINR(wallet?.balance)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
              <Coins className="h-3 w-3 text-emerald-500" /> Instant checkout on flight reservations
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <ArrowDownLeft className="h-3 w-3 text-cyan-400" /> Total Added
            </div>
            <div className="text-lg font-bold font-mono text-cyan-400 mt-1">
              {formatINR(wallet?.totalAdded)}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3 text-rose-400" /> Total Spent
            </div>
            <div className="text-lg font-bold font-mono text-rose-400 mt-1">
              {formatINR(wallet?.totalSpent)}
            </div>
          </div>
        </div>

        {/* Quick Top-Up Bar */}
        {isTopUpOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" role="dialog" aria-modal="true" aria-labelledby="add-simulation-money-title">
            <div className="w-full max-w-2xl rounded-xl border border-emerald-500/30 bg-slate-900 p-5 shadow-2xl">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 id="add-simulation-money-title" className="text-lg font-bold text-slate-100">Add Simulation Money</h2>
                  <p className="text-xs text-amber-300">Simulation Money. No real payment is involved.</p>
                </div>
                <Button size="sm" variant="outline" aria-label="Close add simulation money dialog" onClick={() => setIsTopUpOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>Quick Simulation Top-Up</span>
            <span className="text-[11px] text-slate-500">Min: ₹100 · Max: ₹1,000 Billion (₹1 Trillion)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {quickAmounts.map((amt) => (
              <Button
                key={amt}
                size="sm"
                variant="outline"
                className="border-slate-800 bg-slate-900/60 hover:bg-emerald-950/30 hover:border-emerald-500/40 hover:text-emerald-300 text-xs font-mono"
                disabled={submitting}
                onClick={() => handleTopUp(amt)}
              >
                ₹{Number(amt).toLocaleString("en-IN")}
              </Button>
            ))}
          </div>

          {/* Custom Amount Form */}
          <div className="flex gap-2 pt-1">
            <Input
              type="number"
              placeholder="Enter custom amount (e.g. 15000)"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="bg-slate-950 border-slate-800 text-xs font-mono text-slate-200 h-8"
              disabled={submitting}
            />
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs h-8 shrink-0"
              disabled={submitting || !customAmount}
              onClick={() => handleTopUp(customAmount.replaceAll(",", ""))}
            >
              Add Custom
            </Button>
          </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Transactions Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
            <span>Recent Transactions</span>
            <span className="text-[11px] text-slate-500">Immutable Double-Entry Ledger</span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/60">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-800 font-mono">
                <tr>
                  <th className="p-2.5">Date & Time</th>
                  <th className="p-2.5">Type</th>
                  <th className="p-2.5">Amount</th>
                  <th className="p-2.5">Before</th>
                  <th className="p-2.5">After</th>
                  <th className="p-2.5">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 font-sans">
                {!wallet?.recentTransactions || wallet.recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">
                      No wallet transactions recorded yet. Use + Add Money above to top-up.
                    </td>
                  </tr>
                ) : (
                  wallet.recentTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-2.5 font-mono text-[10px] text-slate-400">
                        {new Date(tx.createdAt).toLocaleString("en-IN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="p-2.5">
                        <Badge
                          variant="outline"
                          className={
                            tx.type === "SIMULATION_TOP_UP" || tx.type === "REFUND_CREDIT"
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono"
                              : "border-rose-500/30 bg-rose-500/10 text-rose-400 text-[10px] font-mono"
                          }
                        >
                          {tx.type}
                        </Badge>
                      </td>
                      <td
                        className={`p-2.5 font-mono font-bold ${
                          tx.type === "SIMULATION_TOP_UP" || tx.type === "REFUND_CREDIT"
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {tx.type === "SIMULATION_TOP_UP" || tx.type === "REFUND_CREDIT" ? "+" : "-"}
                        {formatINR(tx.amount)}
                      </td>
                      <td className="p-2.5 font-mono text-slate-400">{formatINR(tx.balanceBefore)}</td>
                      <td className="p-2.5 font-mono text-slate-200">{formatINR(tx.balanceAfter)}</td>
                      <td className="p-2.5 text-slate-300 max-w-xs truncate">{tx.description}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
