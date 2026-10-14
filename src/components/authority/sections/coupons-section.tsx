"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Tag,
  Plus,
  Search,
  Check,
  Copy,
  Calendar,
  AlertCircle,
  GraduationCap,
  Shield,
  Heart,
  Briefcase,
  Sparkles,
  RefreshCw,
  Archive,
  Power,
  Percent,
  Coins,
  Ticket,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  CouponDTO,
  PassengerCategory,
  DiscountType,
  SeatClass,
} from "@/lib/domain";

interface CouponsSectionProps {
  onNavigateTo?: (section: string) => void;
}

export function CouponsSection({ onNavigateTo }: CouponsSectionProps) {
  const [coupons, setCoupons] = useState<CouponDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [nowTimestamp] = useState(() => Date.now());

  // New Coupon Dialog State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Create Form State
  const [newCategory, setNewCategory] = useState<PassengerCategory>("STUDENT");
  const [newCode, setNewCode] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDiscountType, setNewDiscountType] = useState<DiscountType>("PERCENTAGE");
  const [newDiscountValue, setNewDiscountValue] = useState("15");
  const [newMaxCap, setNewMaxCap] = useState("1500");
  const [newMinFare, setNewMinFare] = useState("1000");
  const [newMaxRedemptions, setNewMaxRedemptions] = useState("500");
  const [newMaxPerPassenger, setNewMaxPerPassenger] = useState("2");
  const [newValidUntil, setNewValidUntil] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().split("T")[0];
  });
  const [newReqVerification, setNewReqVerification] = useState(true);
  const [newClasses, setNewClasses] = useState<SeatClass[]>(["ECONOMY"]);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/coupons?limit=100");
      if (res.ok) {
        const data = await res.json();
        setCoupons(data.coupons || []);
      }
    } catch (err) {
      console.error("Failed to load coupons:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      await Promise.resolve();
      if (!cancelled) {
        await fetchCoupons();
      }
    };
    void loadData();

    const handleGlobalRefresh = () => fetchCoupons();
    window.addEventListener("aocc:refresh", handleGlobalRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener("aocc:refresh", handleGlobalRefresh);
    };
  }, [fetchCoupons]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleGenerateCode = (category: PassengerCategory) => {
    const catMap: Record<PassengerCategory, string> = {
      GENERAL: "GEN",
      STUDENT: "STUD",
      ARMED_FORCES: "ARMY",
      SENIOR_CITIZEN: "SNR",
      STAFF: "STAFF",
    };
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    setNewCode(`AOCC-${catMap[category]}-${randomHex}`);
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      const payload = {
        code: newCode.trim().toUpperCase() || undefined,
        description: newDescription.trim(),
        category: newCategory,
        discountType: newDiscountType,
        discountValue: Number(newDiscountValue),
        maxDiscountCap: newMaxCap ? Number(newMaxCap) : undefined,
        minBookingFare: newMinFare ? Number(newMinFare) : 0,
        maxTotalRedemptions: newMaxRedemptions ? Number(newMaxRedemptions) : undefined,
        maxPerPassenger: newMaxPerPassenger ? Number(newMaxPerPassenger) : 1,
        validUntil: new Date(`${newValidUntil}T23:59:59.000Z`).toISOString(),
        requiresVerification: newReqVerification,
        applicableClasses: newClasses,
      };

      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create coupon.");
      }

      setIsCreateOpen(false);
      resetForm();
      await fetchCoupons();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (coupon: CouponDTO) => {
    const nextStatus = coupon.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    try {
      const res = await fetch(`/api/coupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setCoupons((prev) =>
          prev.map((c) => (c.id === coupon.id ? { ...c, status: nextStatus } : c))
        );
      }
    } catch (err) {
      console.error("Failed to toggle coupon status:", err);
    }
  };

  const handleArchiveCoupon = async (id: string) => {
    if (!confirm("Are you sure you want to archive this coupon? It will be disabled permanently.")) {
      return;
    }
    try {
      const res = await fetch(`/api/coupons/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCoupons((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error("Failed to archive coupon:", err);
    }
  };

  const resetForm = () => {
    setNewCategory("STUDENT");
    setNewCode("");
    setNewDescription("");
    setNewDiscountType("PERCENTAGE");
    setNewDiscountValue("15");
    setNewMaxCap("1500");
    setNewMinFare("1000");
    setNewMaxRedemptions("500");
    setNewMaxPerPassenger("2");
    setNewReqVerification(true);
    setNewClasses(["ECONOMY"]);
    setCreateError(null);
  };

  // Filtered List
  const filteredCoupons = coupons.filter((c) => {
    if (categoryFilter !== "ALL" && c.category !== categoryFilter) return false;
    if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        c.code.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Calculate Metrics
  const activeCount = coupons.filter((c) => c.status === "ACTIVE").length;
  const totalRedemptions = coupons.reduce((acc, c) => acc + (c.redemptionsCount || 0), 0);
  const estimatedSavings = coupons.reduce((acc, c) => {
    const avgSaving =
      c.discountType === "PERCENTAGE"
        ? Math.min((c.discountValue * 4500) / 100, c.maxDiscountCap || 2000)
        : c.discountValue;
    return acc + avgSaving * (c.redemptionsCount || 0);
  }, 0);

  const getCategoryIcon = (category: PassengerCategory) => {
    switch (category) {
      case "STUDENT":
        return <GraduationCap className="w-3.5 h-3.5 text-amber-400" />;
      case "ARMED_FORCES":
        return <Shield className="w-3.5 h-3.5 text-emerald-400" />;
      case "SENIOR_CITIZEN":
        return <Heart className="w-3.5 h-3.5 text-rose-400" />;
      case "STAFF":
        return <Briefcase className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return <Tag className="w-3.5 h-3.5 text-sky-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sky-500/10 border border-sky-500/20 rounded-lg text-sky-400">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Coupons & Special Fare Management
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                  Live Engine
                </Badge>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Authoritative simulator discount system, concession verification, and passenger quota policies.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCoupons}
            className="border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => {
              resetForm();
              handleGenerateCode("STUDENT");
              setIsCreateOpen(true);
            }}
            className="bg-sky-600 hover:bg-sky-500 text-white font-medium shadow-md shadow-sky-600/20"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Issue Coupon
          </Button>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            Active Vouchers
            <Tag className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1.5 font-mono">{activeCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">out of {coupons.length} registered</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            Redemptions
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1.5 font-mono">{totalRedemptions}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">atomic redemptions recorded</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            Discounts Granted
            <Coins className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1.5 font-mono">
            ₹{estimatedSavings.toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">simulated passenger savings</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            Special Concessions
            <Shield className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400 mt-1.5 font-mono">5 Tiers</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Student, Armed Forces, Staff & Senior</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search coupon code or description..."
            className="pl-9 bg-slate-950/60 border-slate-700/80 text-white placeholder:text-slate-500 h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-950/60 border border-slate-800 p-1 rounded-lg text-xs">
            <span className="text-slate-400 px-2 text-[11px] uppercase tracking-wider font-semibold">
              Category:
            </span>
            {(["ALL", "GENERAL", "STUDENT", "ARMED_FORCES", "SENIOR_CITIZEN", "STAFF"] as const).map(
              (cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    categoryFilter === cat
                      ? "bg-sky-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  {cat === "ALL" ? "All" : cat.replace(/_/g, " ")}
                </button>
              )
            )}
          </div>

          <div className="flex items-center gap-1 bg-slate-950/60 border border-slate-800 p-1 rounded-lg text-xs">
            {(["ALL", "ACTIVE", "DISABLED", "EXHAUSTED"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  statusFilter === st
                    ? "bg-slate-700 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                <th className="py-3 px-4">Coupon Code</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Discount Policy</th>
                <th className="py-3 px-4">Redemptions</th>
                <th className="py-3 px-4">Validity Period</th>
                <th className="py-3 px-4">Check-in Verification</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-400" />
                    Loading authoritative coupon registry...
                  </td>
                </tr>
              ) : filteredCoupons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                    No coupon codes match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredCoupons.map((coupon) => {
                  const isExpired = new Date(coupon.validUntil).getTime() < nowTimestamp;
                  const isCapacityFull =
                    coupon.maxTotalRedemptions !== undefined &&
                    coupon.redemptionsCount >= coupon.maxTotalRedemptions;

                  return (
                    <tr
                      key={coupon.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Code */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white tracking-wide bg-slate-950/80 border border-slate-700/80 px-2 py-0.5 rounded text-xs">
                            {coupon.code}
                          </span>
                          <button
                            onClick={() => handleCopyCode(coupon.code)}
                            title="Copy Coupon Code"
                            className="text-slate-400 hover:text-sky-400 transition-colors p-1 rounded hover:bg-slate-800"
                          >
                            {copiedCode === coupon.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 max-w-xs truncate">
                          {coupon.description}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-950 border border-slate-800">
                          {getCategoryIcon(coupon.category)}
                          <span className="text-slate-200">
                            {coupon.category.replace(/_/g, " ")}
                          </span>
                        </div>
                      </td>

                      {/* Discount Policy */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-white flex items-center gap-1">
                          {coupon.discountType === "PERCENTAGE" ? (
                            <>
                              <Percent className="w-3 h-3 text-emerald-400" />
                              <span>{coupon.discountValue}% OFF</span>
                            </>
                          ) : (
                            <>
                              <Coins className="w-3 h-3 text-sky-400" />
                              <span>₹{coupon.discountValue.toLocaleString("en-IN")} FLAT</span>
                            </>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 space-y-0.5">
                          {coupon.maxDiscountCap && (
                            <div>Cap: ₹{coupon.maxDiscountCap.toLocaleString("en-IN")}</div>
                          )}
                          {coupon.minBookingFare && coupon.minBookingFare > 0 ? (
                            <div>Min: ₹{coupon.minBookingFare.toLocaleString("en-IN")}</div>
                          ) : null}
                        </div>
                      </td>

                      {/* Redemptions */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-white font-semibold">
                            {coupon.redemptionsCount}
                          </span>
                          <span className="text-slate-500 font-mono">
                            / {coupon.maxTotalRedemptions ?? "∞"}
                          </span>
                        </div>
                        {coupon.maxTotalRedemptions && (
                          <div className="w-24 bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                            <div
                              className={`h-full ${
                                isCapacityFull ? "bg-rose-500" : "bg-sky-500"
                              }`}
                              style={{
                                width: `${Math.min(
                                  100,
                                  (coupon.redemptionsCount / coupon.maxTotalRedemptions) * 100
                                )}%`,
                              }}
                            />
                          </div>
                        )}
                        <div className="text-[10px] text-slate-500 mt-1">
                          Limit: {coupon.maxPerPassenger ?? 1} per passenger
                        </div>
                      </td>

                      {/* Validity */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-[11px] text-slate-300">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>{new Date(coupon.validUntil).toLocaleDateString()}</span>
                        </div>
                        <div className="text-[10px] mt-0.5">
                          {isExpired ? (
                            <span className="text-rose-400 font-semibold">Expired</span>
                          ) : (
                            <span className="text-slate-400">Valid</span>
                          )}
                        </div>
                      </td>

                      {/* ID Verification */}
                      <td className="py-3 px-4">
                        {coupon.requiresVerification ? (
                          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-300 border-amber-500/30">
                            Required at Desk
                          </Badge>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Instant Apply</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {coupon.status === "ACTIVE" && !isExpired && !isCapacityFull && (
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                            Active
                          </Badge>
                        )}
                        {coupon.status === "DISABLED" && (
                          <Badge variant="outline" className="text-[10px] bg-slate-800 text-slate-400 border-slate-700">
                            Disabled
                          </Badge>
                        )}
                        {(coupon.status === "EXHAUSTED" || isCapacityFull) && (
                          <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/30">
                            Exhausted
                          </Badge>
                        )}
                        {isExpired && coupon.status !== "DISABLED" && (
                          <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-400 border-rose-500/30">
                            Expired
                          </Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 opacity-90 group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleStatus(coupon)}
                            title={coupon.status === "ACTIVE" ? "Disable Coupon" : "Activate Coupon"}
                            className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800"
                          >
                            <Power className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleArchiveCoupon(coupon.id)}
                            title="Soft Archive (Permanently Hide)"
                            className="h-7 w-7 text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Action to Ticketing Desk */}
      <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-500/10 border border-sky-500/20 rounded-lg text-sky-400">
            <Ticket className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Test Coupon in Ticketing Desk</div>
            <div className="text-xs text-slate-400">
              Apply coupon codes during real-time flight bookings with live fare breakdown.
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigateTo?.("ticketing")}
          className="border-slate-700 bg-slate-800/80 text-sky-400 hover:text-sky-300 hover:bg-slate-800"
        >
          Open Ticketing Desk &rarr;
        </Button>
      </div>

      {/* Issue Coupon Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="max-w-xl w-full bg-slate-900 border border-slate-800 text-white rounded-xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Ticket className="w-5 h-5 text-sky-400" />
                Issue Special Fare Discount Coupon
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Create an authoritative promotional voucher with custom discount ceilings and category gating.
              </p>
            </div>

          {createError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <form onSubmit={handleCreateCoupon} className="space-y-4 py-2">
            {/* Category and Code Generator */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                  Beneficiary Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => {
                    const cat = e.target.value as PassengerCategory;
                    setNewCategory(cat);
                    handleGenerateCode(cat);
                  }}
                  className="w-full h-9 bg-slate-950 border border-slate-700 rounded-md px-3 text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="GENERAL">General Public</option>
                  <option value="STUDENT">Student Concession</option>
                  <option value="ARMED_FORCES">Armed Forces & Paramilitary</option>
                  <option value="SENIOR_CITIZEN">Senior Citizen (60+)</option>
                  <option value="STAFF">Airline & Operations Staff</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                    Coupon Code
                  </label>
                  <button
                    type="button"
                    onClick={() => handleGenerateCode(newCategory)}
                    className="text-[10px] text-sky-400 hover:text-sky-300"
                  >
                    Auto-Generate
                  </button>
                </div>
                <Input
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  placeholder="e.g. AOCC-STUD-XYZ123"
                  className="bg-slate-950 border-slate-700 text-white font-mono uppercase h-9 text-xs"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                Description & Terms
              </label>
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="e.g. 15% concession for verified full-time students on economy flights"
                className="bg-slate-950 border-slate-700 text-white h-9 text-xs"
                required
              />
            </div>

            {/* Discount Type & Value */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                  Discount Type
                </label>
                <select
                  value={newDiscountType}
                  onChange={(e) => setNewDiscountType(e.target.value as DiscountType)}
                  className="w-full h-9 bg-slate-950 border border-slate-700 rounded-md px-3 text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FIXED_AMOUNT">Fixed Amount (₹)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                  {newDiscountType === "PERCENTAGE" ? "Percentage (%)" : "Flat Amount (₹)"}
                </label>
                <Input
                  type="number"
                  min="1"
                  max={newDiscountType === "PERCENTAGE" ? "90" : "50000"}
                  value={newDiscountValue}
                  onChange={(e) => setNewDiscountValue(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white h-9 text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                  Max Cap (₹)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={newMaxCap}
                  onChange={(e) => setNewMaxCap(e.target.value)}
                  placeholder="Optional limit"
                  className="bg-slate-950 border-slate-700 text-white h-9 text-xs"
                />
              </div>
            </div>

            {/* Minimum Fare and Quota */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                  Min Base Fare (₹)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={newMinFare}
                  onChange={(e) => setNewMinFare(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                  Total Redemption Cap
                </label>
                <Input
                  type="number"
                  min="1"
                  value={newMaxRedemptions}
                  onChange={(e) => setNewMaxRedemptions(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white h-9 text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                  Uses Per Passenger
                </label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={newMaxPerPassenger}
                  onChange={(e) => setNewMaxPerPassenger(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white h-9 text-xs"
                  required
                />
              </div>
            </div>

            {/* Expiry Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                  Valid Until Date
                </label>
                <Input
                  type="date"
                  value={newValidUntil}
                  onChange={(e) => setNewValidUntil(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white h-9 text-xs"
                  required
                />
              </div>

              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer p-2 bg-slate-950 border border-slate-800 rounded-md">
                  <input
                    type="checkbox"
                    checked={newReqVerification}
                    onChange={(e) => setNewReqVerification(e.target.checked)}
                    className="rounded border-slate-700 text-sky-500 focus:ring-sky-500 h-4 w-4 bg-slate-900"
                  />
                  <span className="text-xs text-slate-300">
                    Require ID Verification at Check-in Desk
                  </span>
                </label>
              </div>
            </div>

            {/* Applicable Seat Classes */}
            <div>
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                Eligible Travel Classes
              </label>
              <div className="flex items-center gap-4">
                {(["ECONOMY", "BUSINESS", "FIRST"] as SeatClass[]).map((cls) => {
                  const checked = newClasses.includes(cls);
                  return (
                    <label
                      key={cls}
                      className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          if (checked) {
                            if (newClasses.length > 1) {
                              setNewClasses(newClasses.filter((c) => c !== cls));
                            }
                          } else {
                            setNewClasses([...newClasses, cls]);
                          }
                        }}
                        className="rounded border-slate-700 text-sky-500 focus:ring-sky-500 h-3.5 w-3.5 bg-slate-900"
                      />
                      <span>{cls}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-slate-800 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="border-slate-700 bg-slate-800 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="bg-sky-600 hover:bg-sky-500 text-white font-medium"
              >
                {creating ? "Issuing..." : "Create & Activate Coupon"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    )}
  </div>
  );
}
