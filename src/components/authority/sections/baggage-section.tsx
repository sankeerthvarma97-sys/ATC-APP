"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Barcode,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  HardHat,
  Luggage,
  Package,
  Plane,
  QrCode,
  RefreshCw,
  Scan,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tag,
  Truck,
  Volume2,
  VolumeX,
  X,
  Zap,
  Lock,
  Unlock,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { BaggageItemDTO, UldContainerDTO, CarouselDTO } from "@/lib/services/baggage-service";

export function BaggageSection({
  onNavigateTo,
}: {
  onNavigateTo?: (section: string) => void;
}) {
  const [bags, setBags] = useState<BaggageItemDTO[]>([]);
  const [ulds, setUlds] = useState<UldContainerDTO[]>([]);
  const [carousels, setCarousels] = useState<CarouselDTO[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters & Search
  const [scannedInput, setScannedInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [flightFilter, setFlightFilter] = useState("ALL");
  const [edsFilter, setEdsFilter] = useState("ALL");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [selectedCarousel, setSelectedCarousel] = useState<number>(1);

  // Scan Feedback
  const [scanResult, setScanResult] = useState<{
    ok: boolean;
    title: string;
    detail: string;
    item?: BaggageItemDTO;
  } | null>(null);

  // Pack ULD Modal
  const [packModalBag, setPackModalBag] = useState<BaggageItemDTO | null>(null);
  const [selectedUldCode, setSelectedUldCode] = useState<string>("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Synthesize optical barcode audio
  const playSound = useCallback(
    (freq = 1200, duration = 0.08) => {
      if (!audioEnabled || typeof window === "undefined") return;
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch {
        // audio context blocked
      }
    },
    [audioEnabled]
  );

  const fetchBaggageData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/baggage");
      if (res.ok) {
        const data = await res.json();
        setBags(data.bags || []);
        setUlds(data.ulds || []);
        setCarousels(data.carousels || []);
      }
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBaggageData();
  }, []);

  const handleScanTag = async (customTag?: string) => {
    const code = (customTag || scannedInput).trim().toUpperCase();
    if (!code) return;

    try {
      const res = await fetch("/api/baggage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SCAN", code }),
      });

      const data = await res.json();
      if (res.ok && data.item) {
        playSound(1400, 0.1);
        setScanResult({
          ok: true,
          title: `TAG MATCH: ${data.item.tagNumber}`,
          detail: `Passenger ${data.item.passengerName} (${data.item.flightNumber}) • EDS: ${data.item.edsStatus} • Carousel 0${data.item.assignedCarousel}`,
          item: data.item,
        });

        // Advance status locally if not packed
        if (data.item.sortationStatus === "INDUCTED") {
          handleUpdateBagStatus(data.item.tagNumber, "SORTED_CAROUSEL");
        }
      } else {
        playSound(450, 0.2);
        setScanResult({
          ok: false,
          title: `TAG UNRECOGNIZED: ${code}`,
          detail: data.error || "Bag not found in flight manifest sortation index.",
        });
      }
    } catch {
      playSound(450, 0.2);
      setScanResult({
        ok: false,
        title: "SCANNER OFFLINE",
        detail: "Communication timeout with automated baggage sortation server.",
      });
    } finally {
      setScannedInput("");
    }
  };

  const handleUpdateBagStatus = async (tagNumber: string, nextStatus: BaggageItemDTO["sortationStatus"]) => {
    try {
      const res = await fetch("/api/baggage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagNumber, updates: { sortationStatus: nextStatus } }),
      });
      if (res.ok) {
        setBags((prev) =>
          prev.map((b) => (b.tagNumber === tagNumber ? { ...b, sortationStatus: nextStatus } : b))
        );
      }
    } catch {
      //
    }
  };

  const handleClearEds = async (tagNumber: string) => {
    playSound(1200, 0.12);
    try {
      const res = await fetch("/api/baggage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CLEAR_EDS", tagNumber }),
      });
      if (res.ok) {
        setBags((prev) =>
          prev.map((b) => (b.tagNumber === tagNumber ? { ...b, edsStatus: "CLEARED", securityNotes: undefined } : b))
        );
        setActionNotice(`✅ Security clearance approved for bag ${tagNumber}. Released for ULD packing.`);
        setTimeout(() => setActionNotice(null), 3000);
      }
    } catch {
      //
    }
  };

  const handleSealUld = async (uldCode: string) => {
    playSound(880, 0.15);
    const targetUld = ulds.find((u) => u.code === uldCode);
    if (!targetUld) return;

    const nextStatus: UldContainerDTO["status"] =
      targetUld.status === "OPEN_PACKING"
        ? "SEALED"
        : targetUld.status === "SEALED"
        ? "RAMP_TRANSIT"
        : "STOWED_ONBOARD";

    try {
      const res = await fetch("/api/baggage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UPDATE_ULD", uldCode, status: nextStatus }),
      });
      if (res.ok) {
        setUlds((prev) =>
          prev.map((u) => (u.code === uldCode ? { ...u, status: nextStatus } : u))
        );
      }
    } catch {
      //
    }
  };

  const handlePackIntoUld = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packModalBag || !selectedUldCode) return;

    playSound(950, 0.1);
    try {
      const res = await fetch("/api/baggage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "PACK_ULD",
          tagNumber: packModalBag.tagNumber,
          uldCode: selectedUldCode,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setBags((prev) =>
          prev.map((b) =>
            b.tagNumber === packModalBag.tagNumber
              ? { ...b, assignedUld: selectedUldCode, sortationStatus: "PACKED_ULD" }
              : b
          )
        );
        fetchBaggageData();
        setActionNotice(`📦 Bag ${packModalBag.tagNumber} loaded into ${selectedUldCode}.`);
        setTimeout(() => setActionNotice(null), 3000);
        setPackModalBag(null);
      } else {
        alert(data.error || "Failed to pack ULD");
      }
    } catch {
      //
    }
  };

  // KPI Calculations
  const totalBagsCount = bags.length;
  const packedUldCount = bags.filter((b) => b.sortationStatus === "PACKED_ULD" || b.sortationStatus === "LOADED_RAMP").length;
  const edsFlaggedCount = bags.filter((b) => b.edsStatus === "LEVEL_2_INSPECTION" || b.edsStatus === "SUSPECT").length;
  const totalWeightKg = Math.round(bags.reduce((acc, b) => acc + (b.weightKg || 0), 0));

  // Filtered Bags
  const filteredBags = useMemo(() => {
    return bags.filter((bag) => {
      const matchesFlight = flightFilter === "ALL" || bag.flightNumber.toUpperCase() === flightFilter.toUpperCase();
      const matchesEds = edsFilter === "ALL" || bag.edsStatus === edsFilter;
      const matchesSearch =
        bag.tagNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bag.pnr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bag.passengerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bag.flightNumber.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesFlight && matchesEds && matchesSearch;
    });
  }, [bags, flightFilter, edsFilter, searchQuery]);

  const uniqueFlights = useMemo(() => {
    return Array.from(new Set(bags.map((b) => b.flightNumber))).filter(Boolean);
  }, [bags]);

  const activeCarouselData = useMemo(() => {
    return carousels.find((c) => c.id === selectedCarousel) || carousels[0];
  }, [carousels, selectedCarousel]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Luggage className="h-6 w-6 text-purple-400" />
            Baggage Handling System (BHS) & Sortation Center
          </h2>
          <p className="text-xs text-muted-foreground font-mono">
            Automated make-up carousels, 3D EDS explosive screening, IATA optical tag tracking & ULD container balance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs font-mono text-muted-foreground hover:text-foreground"
            onClick={() => setAudioEnabled(!audioEnabled)}
          >
            {audioEnabled ? <Volume2 className="h-4 w-4 text-emerald-400 mr-1.5" /> : <VolumeX className="h-4 w-4 text-muted-foreground mr-1.5" />}
            {audioEnabled ? "Laser Audio ON" : "Muted"}
          </Button>
          <Button size="sm" variant="outline" onClick={fetchBaggageData} disabled={loading} className="h-8 text-xs font-mono">
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh BHS
          </Button>
          <Badge variant="outline" className="border-purple-500/40 text-purple-300 bg-purple-950/20 font-mono text-xs">
            BHS Telemetry 99.4% Read
          </Badge>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] text-muted-foreground uppercase flex items-center gap-1.5 font-medium">
              <Luggage className="h-3.5 w-3.5 text-purple-400" />
              Total Ingested Bags
            </span>
            <div className="text-xl font-bold text-foreground">{totalBagsCount} Bags</div>
            <div className="text-[10px] text-muted-foreground">Payload: {totalWeightKg.toLocaleString()} kg</div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] text-muted-foreground uppercase flex items-center gap-1.5 font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              EDS Screening Pass
            </span>
            <div className="text-xl font-bold text-emerald-400">
              {totalBagsCount > 0 ? `${Math.round(((totalBagsCount - edsFlaggedCount) / totalBagsCount) * 100)}% Pass` : "100% Pass"}
            </div>
            <div className="text-[10px] text-muted-foreground">3D Computed Tomography</div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] text-muted-foreground uppercase flex items-center gap-1.5 font-medium">
              <Package className="h-3.5 w-3.5 text-cyan-400" />
              Packed in ULDs
            </span>
            <div className="text-xl font-bold text-foreground">{packedUldCount} / {totalBagsCount}</div>
            <div className="text-[10px] text-muted-foreground">{ulds.length} Belly Hold Containers</div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] text-muted-foreground uppercase flex items-center gap-1.5 font-medium">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
              EDS Level 2 Flagged
            </span>
            <div className={`text-xl font-bold ${edsFlaggedCount > 0 ? "text-amber-400" : "text-emerald-400"}`}>
              {edsFlaggedCount} Bags
            </div>
            <div className="text-[10px] text-muted-foreground">Manual Security Inspection</div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Grid: Optical Barcode Scanner HUD & Carousel Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Optical Scanner HUD Station */}
        <Card className="border-border/80 bg-card/80 backdrop-blur-xl lg:col-span-1">
          <CardHeader className="pb-3 border-b border-border/80">
            <CardTitle className="text-sm font-bold font-mono text-foreground flex items-center gap-2">
              <Scan className="h-4 w-4 text-purple-400" />
              Optical Barcode Induction Scanner
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground font-mono">
              Scan IATA 10-digit baggage tags or select quick demo tags below.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4 font-mono">
            {/* Viewfinder HUD Box */}
            <div className="relative h-44 rounded-xl border-2 border-dashed border-purple-500/40 bg-background/80 overflow-hidden flex flex-col items-center justify-center p-4">
              <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-purple-400" />
              <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-purple-400" />
              <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-purple-400" />
              <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-purple-400" />

              <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_12px_#c084fc] animate-pulse" />

              <Barcode className="h-12 w-12 text-purple-400/80 mb-2" />
              <span className="text-[11px] text-purple-300 font-bold tracking-wider">
                READY FOR INDUCTION SCAN
              </span>
              <span className="text-[10px] text-muted-foreground">Laser Optical Reader Active</span>
            </div>

            {/* Quick Demo Scan Buttons */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-semibold">
                Quick Test Tags:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {bags.slice(0, 4).map((b) => (
                  <Button
                    key={b.id}
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px] border-border/80 hover:border-purple-500/40 text-foreground truncate"
                    onClick={() => handleScanTag(b.tagNumber)}
                  >
                    {b.tagNumber}
                  </Button>
                ))}
              </div>
            </div>

            {/* Scan Input Box */}
            <div className="flex gap-2">
              <Input
                value={scannedInput}
                onChange={(e) => setScannedInput(e.target.value)}
                placeholder="Scan or type IATA tag..."
                className="bg-background border-input text-xs text-foreground font-mono"
                onKeyDown={(e) => e.key === "Enter" && handleScanTag()}
              />
              <Button
                onClick={() => handleScanTag()}
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 font-semibold"
              >
                Scan
              </Button>
            </div>

            {/* Scan Result Feedback Alert */}
            {scanResult && (
              <div
                className={`p-3 rounded-xl border text-xs space-y-1 ${
                  scanResult.ok
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                    : "border-red-500/40 bg-red-500/10 text-red-400"
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {scanResult.title}
                </div>
                <div className="text-[11px] text-muted-foreground">{scanResult.detail}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right 2 Columns: Make-Up Carousels & Active Ingestion Table */}
        <div className="lg:col-span-2 space-y-4 font-mono">
          {/* Carousel Selector & Telemetry */}
          <Card className="border-border/80 bg-card/70">
            <CardHeader className="pb-3 border-b border-border/80">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Truck className="h-4 w-4 text-purple-400" />
                    BHS Sortation Carousels & Belts
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    High-speed makeup sortation and arrival reclaim loops.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {carousels.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCarousel(c.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition border ${
                        selectedCarousel === c.id
                          ? "border-purple-500/60 bg-purple-500/20 text-purple-300 font-bold"
                          : "border-border/80 bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {c.name.split(" ")[0]} {c.id}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              {activeCarouselData && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-lg bg-background/60 border border-border/60">
                    <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Active Flight</span>
                    <span className="font-bold text-foreground text-sm">
                      {activeCarouselData.assignedFlight ? activeCarouselData.assignedFlight : "Unassigned"}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">{activeCarouselData.terminal}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-background/60 border border-border/60">
                    <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Loop Status</span>
                    <Badge
                      className={`text-[10px] mt-0.5 ${
                        activeCarouselData.status === "OPERATIONAL"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {activeCarouselData.status}
                    </Badge>
                  </div>
                  <div className="p-2.5 rounded-lg bg-background/60 border border-border/60">
                    <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Current Belt Load</span>
                    <span className="font-bold text-cyan-300 text-sm">
                      {activeCarouselData.activeBagCount} Bags
                    </span>
                    <span className="text-[10px] text-muted-foreground block">{activeCarouselData.type.replace(/_/g, " ")}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ULD Packing & Weight-and-Balance Matrix */}
          <Card className="border-border/80 bg-card/70">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Package className="h-4 w-4 text-cyan-400" />
                  Unit Load Device (ULD) Container Matrix & Weight & Balance
                </CardTitle>
                <Badge variant="outline" className="border-cyan-500/40 text-cyan-300 text-[10px]">
                  Belly Cargo Holds
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {ulds.map((uld) => {
                  const pct = Math.min(100, Math.round((uld.currentWeightKg / uld.maxWeightKg) * 100));
                  const isSealed = uld.status === "SEALED" || uld.status === "RAMP_TRANSIT" || uld.status === "STOWED_ONBOARD";
                  return (
                    <div
                      key={uld.id}
                      className="p-3 rounded-xl border border-border/80 bg-background/60 flex flex-col justify-between space-y-2.5"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground text-xs">{uld.code}</span>
                          <Badge
                            className={`text-[9px] ${
                              isSealed
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                                : "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
                            }`}
                          >
                            {uld.status}
                          </Badge>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          Flight: <strong className="text-foreground">{uld.flightNumber}</strong> ({uld.destination}) &bull; {uld.type}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Payload: {uld.currentWeightKg} kg</span>
                          <span>Max: {uld.maxWeightKg} kg</span>
                        </div>
                        <Progress value={pct} className="h-1.5 bg-muted" />
                        <div className="text-[10px] text-muted-foreground text-right">{pct}% Gross Limit ({uld.bagCount} bags)</div>
                      </div>

                      <Button
                        size="sm"
                        variant={isSealed ? "ghost" : "outline"}
                        onClick={() => handleSealUld(uld.code)}
                        className={`h-7 text-[11px] ${
                          isSealed
                            ? "text-emerald-400 hover:bg-emerald-500/10"
                            : "border-cyan-500/40 hover:bg-cyan-500/10 text-cyan-300"
                        }`}
                      >
                        {isSealed ? `✓ ${uld.status}` : "Advance ULD Status"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-border/80 bg-card/80 font-mono">
        <CardContent className="p-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Tag (BAG-...), PNR, passenger..."
                className="text-xs bg-background h-8 pl-3"
              />
            </div>
            <div>
              <select
                value={flightFilter}
                onChange={(e) => setFlightFilter(e.target.value)}
                className="w-full h-8 rounded border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none"
              >
                <option value="ALL">All Flight Manifests</option>
                {uniqueFlights.map((flt) => (
                  <option key={flt} value={flt}>
                    Flight {flt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={edsFilter}
                onChange={(e) => setEdsFilter(e.target.value)}
                className="w-full h-8 rounded border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none"
              >
                <option value="ALL">All EDS Security Clearances</option>
                <option value="CLEARED">CLEARED Only</option>
                <option value="LEVEL_2_INSPECTION">LEVEL 2 INSPECTION Required</option>
                <option value="SUSPECT">SUSPECT Only</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Table: Recent Baggage Ingestion & Reconciliation Log */}
      <Card className="border-border/80 bg-card/80 font-mono">
        <CardHeader className="py-3 px-4 border-b border-border/80 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <Tag className="h-4 w-4 text-purple-400" />
            Active Manifest Baggage Reconciliation Stream ({filteredBags.length})
          </CardTitle>
          <span className="text-xs text-muted-foreground">{bags.length} Total Bags Tracked</span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-background/80 text-[11px] text-muted-foreground uppercase border-b border-border/80">
                <tr>
                  <th className="py-2.5 px-4">Tag Number</th>
                  <th className="py-2.5 px-4">Passenger</th>
                  <th className="py-2.5 px-4">Flight & Stand</th>
                  <th className="py-2.5 px-4">Weight</th>
                  <th className="py-2.5 px-4">EDS Security</th>
                  <th className="py-2.5 px-4">Sortation Status</th>
                  <th className="py-2.5 px-4">Assigned ULD</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredBags.map((bag) => {
                  const needsReview = bag.edsStatus === "LEVEL_2_INSPECTION" || bag.edsStatus === "SUSPECT";
                  const canPack = bag.edsStatus === "CLEARED" && (!bag.assignedUld || bag.assignedUld === "UNASSIGNED");

                  return (
                    <tr key={bag.tagNumber} className="hover:bg-muted/30 transition">
                      <td className="py-2.5 px-4 font-bold text-purple-400">{bag.tagNumber}</td>
                      <td className="py-2.5 px-4 text-foreground">
                        <div>{bag.passengerName}</div>
                        <div className="text-[10px] text-muted-foreground">PNR: {bag.pnr}</div>
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground">
                        <span className="text-foreground font-semibold">{bag.flightNumber}</span>
                        <Badge variant="outline" className="text-[9px] py-0 px-1 ml-1.5 border-border/80">
                          {bag.gate}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground">{bag.weightKg} kg</td>
                      <td className="py-2.5 px-4">
                        <Badge
                          className={`text-[9px] ${
                            bag.edsStatus === "CLEARED"
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                              : bag.edsStatus === "LEVEL_2_INSPECTION"
                              ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                              : "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse"
                          }`}
                        >
                          {bag.edsStatus}
                        </Badge>
                        {bag.securityNotes && (
                          <p className="text-[9px] text-amber-400 mt-0.5 line-clamp-1">{bag.securityNotes}</p>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge variant="outline" className="text-[10px] border-border/80 text-muted-foreground">
                          {bag.sortationStatus}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-cyan-300 text-[11px]">
                        {bag.assignedUld || "UNASSIGNED"}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {needsReview && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleClearEds(bag.tagNumber)}
                              className="h-6 text-[10px] border-amber-500/40 text-amber-400 hover:bg-amber-500/10 px-2"
                            >
                              Clear EDS
                            </Button>
                          )}
                          {canPack && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setPackModalBag(bag);
                                const matchingUld = ulds.find(
                                  (u) => u.flightNumber === bag.flightNumber && u.status === "OPEN_PACKING"
                                ) || ulds[0];
                                if (matchingUld) setSelectedUldCode(matchingUld.code);
                              }}
                              className="h-6 text-[10px] border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 px-2"
                            >
                              Pack ULD
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* PACK ULD MODAL */}
      {packModalBag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm font-mono">
          <Card className="w-full max-w-sm border-cyan-500/40 shadow-2xl bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Package className="h-4 w-4 text-cyan-400" />
                  Pack Bag into ULD
                </CardTitle>
                <CardDescription className="text-xs">
                  Tag: {packModalBag.tagNumber} &bull; Flight: {packModalBag.flightNumber} ({packModalBag.weightKg} kg)
                </CardDescription>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setPackModalBag(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePackIntoUld} className="space-y-3 text-xs">
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Select Open ULD Container:</label>
                  <select
                    value={selectedUldCode}
                    onChange={(e) => setSelectedUldCode(e.target.value)}
                    className="w-full h-8 rounded border border-input bg-background px-2 text-xs text-foreground focus:outline-none"
                    required
                  >
                    {ulds
                      .filter((u) => u.status === "OPEN_PACKING")
                      .map((u) => (
                        <option key={u.id} value={u.code}>
                          {u.code} ({u.flightNumber} &bull; {u.currentWeightKg}/{u.maxWeightKg} kg)
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                  <Button type="button" variant="ghost" onClick={() => setPackModalBag(null)} size="sm">
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
                    size="sm"
                  >
                    Confirm ULD Stowage
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
