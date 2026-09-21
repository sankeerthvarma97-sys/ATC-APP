"use client";

import { useState, useCallback } from "react";
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

export interface BaggageItem {
  tagNumber: string;
  pnr: string;
  passengerName: string;
  flightNumber: string;
  gate: string;
  weightKg: number;
  classType: "FIRST" | "BUSINESS" | "ECONOMY";
  edsStatus: "CLEARED" | "LEVEL_2_INSPECTION" | "SUSPECT" | "PENDING";
  sortationStatus: "INDUCTED" | "SORTED_CAROUSEL" | "PACKED_ULD" | "LOADED_RAMP";
  assignedUld: string;
  timestamp: string;
}

export interface UldContainer {
  id: string;
  code: string;
  type: "AKH (A320)" | "LD3 (B777/A330)" | "BULK_CART";
  flightNumber: string;
  destination: string;
  maxWeightKg: number;
  tareWeightKg: number;
  currentWeightKg: number;
  bagCount: number;
  status: "OPEN_PACKING" | "SEALED" | "RAMP_TRANSIT" | "STOWED_ONBOARD";
}

const INITIAL_ULDS: UldContainer[] = [
  {
    id: "uld-1",
    code: "AKH-88214-SC",
    type: "AKH (A320)",
    flightNumber: "SC101",
    destination: "BOM",
    maxWeightKg: 1588,
    tareWeightKg: 82,
    currentWeightKg: 1240,
    bagCount: 64,
    status: "OPEN_PACKING",
  },
  {
    id: "uld-2",
    code: "AKH-10492-AV",
    type: "AKH (A320)",
    flightNumber: "AV201",
    destination: "DEL",
    maxWeightKg: 1588,
    tareWeightKg: 82,
    currentWeightKg: 890,
    bagCount: 46,
    status: "OPEN_PACKING",
  },
  {
    id: "uld-3",
    code: "LD3-44120-BA",
    type: "LD3 (B777/A330)",
    flightNumber: "BAW112",
    destination: "EGLL",
    maxWeightKg: 1588,
    tareWeightKg: 95,
    currentWeightKg: 1510,
    bagCount: 78,
    status: "SEALED",
  },
];

const INITIAL_BAGS: BaggageItem[] = [
  {
    tagNumber: "BAG-SC101-0841",
    pnr: "SC7K92P",
    passengerName: "Rahul Varma",
    flightNumber: "SC101",
    gate: "A1",
    weightKg: 21.4,
    classType: "BUSINESS",
    edsStatus: "CLEARED",
    sortationStatus: "PACKED_ULD",
    assignedUld: "AKH-88214-SC",
    timestamp: "11:20:14",
  },
  {
    tagNumber: "BAG-SC101-0842",
    pnr: "SC7K92P",
    passengerName: "Rahul Varma",
    flightNumber: "SC101",
    gate: "A1",
    weightKg: 18.2,
    classType: "BUSINESS",
    edsStatus: "CLEARED",
    sortationStatus: "PACKED_ULD",
    assignedUld: "AKH-88214-SC",
    timestamp: "11:20:18",
  },
  {
    tagNumber: "BAG-AV201-1904",
    pnr: "AV10294",
    passengerName: "Ananya Desai",
    flightNumber: "AV201",
    gate: "B3",
    weightKg: 23.0,
    classType: "ECONOMY",
    edsStatus: "CLEARED",
    sortationStatus: "SORTED_CAROUSEL",
    assignedUld: "AKH-10492-AV",
    timestamp: "11:24:45",
  },
  {
    tagNumber: "BAG-BH301-4411",
    pnr: "BH99412",
    passengerName: "Sarah Jenkins",
    flightNumber: "BH301",
    gate: "C2",
    weightKg: 19.5,
    classType: "BUSINESS",
    edsStatus: "CLEARED",
    sortationStatus: "INDUCTED",
    assignedUld: "AKH-88214-SC",
    timestamp: "11:26:02",
  },
  {
    tagNumber: "BAG-SEC-9912",
    pnr: "IS88201",
    passengerName: "Elena Rostova",
    flightNumber: "IS303",
    gate: "B12",
    weightKg: 24.8,
    classType: "ECONOMY",
    edsStatus: "LEVEL_2_INSPECTION",
    sortationStatus: "INDUCTED",
    assignedUld: "UNASSIGNED",
    timestamp: "11:27:10",
  },
];

export function BaggageSection({
  onNavigateTo,
}: {
  onNavigateTo?: (section: string) => void;
}) {
  const [bags, setBags] = useState<BaggageItem[]>(INITIAL_BAGS);
  const [ulds, setUlds] = useState<UldContainer[]>(INITIAL_ULDS);
  const [scannedInput, setScannedInput] = useState("");
  const [scanResult, setScanResult] = useState<{
    ok: boolean;
    title: string;
    detail: string;
    item?: BaggageItem;
  } | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [selectedCarousel, setSelectedCarousel] = useState<number>(1);

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

  const handleScanTag = (customTag?: string) => {
    const tag = (customTag || scannedInput).trim().toUpperCase();
    if (!tag) return;

    // Check if bag is already known
    const existing = bags.find((b) => b.tagNumber.toUpperCase() === tag);
    if (existing) {
      playSound(1400, 0.1);
      // Advance sortation status
      const nextStatus: BaggageItem["sortationStatus"] =
        existing.sortationStatus === "INDUCTED"
          ? "SORTED_CAROUSEL"
          : existing.sortationStatus === "SORTED_CAROUSEL"
          ? "PACKED_ULD"
          : "LOADED_RAMP";

      const updated = { ...existing, sortationStatus: nextStatus };
      setBags((prev) => prev.map((b) => (b.tagNumber === existing.tagNumber ? updated : b)));
      setScanResult({
        ok: true,
        title: `TAG MATCH: ${existing.tagNumber}`,
        detail: `Passenger ${existing.passengerName} (${existing.flightNumber}) status advanced to ${nextStatus}.`,
        item: updated,
      });
      setScannedInput("");
      return;
    }

    // New tag induction
    playSound(1100, 0.1);
    const newBag: BaggageItem = {
      tagNumber: tag,
      pnr: `REC-${Math.floor(1000 + Math.random() * 9000)}`,
      passengerName: "Inducted Passenger",
      flightNumber: "SC101",
      gate: "A1",
      weightKg: Math.round((14 + Math.random() * 10) * 10) / 10,
      classType: "ECONOMY",
      edsStatus: "CLEARED",
      sortationStatus: "SORTED_CAROUSEL",
      assignedUld: "AKH-88214-SC",
      timestamp: new Date().toLocaleTimeString(),
    };

    setBags((prev) => [newBag, ...prev]);
    setScanResult({
      ok: true,
      title: `NEW INGESTION: ${tag}`,
      detail: `3D EDS Computed Tomography passed (CLEARED). Routed to Carousel 01.`,
      item: newBag,
    });
    setScannedInput("");
  };

  const handleSealUld = (uldId: string) => {
    playSound(880, 0.2);
    setUlds((prev) =>
      prev.map((u) =>
        u.id === uldId
          ? { ...u, status: u.status === "OPEN_PACKING" ? "SEALED" : "RAMP_TRANSIT" }
          : u
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Luggage className="h-6 w-6 text-purple-400" />
            Baggage Handling System (BHS) & Sortation Center
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Automated make-up carousels, 3D EDS explosive screening, IATA optical tag tracking & ULD container balance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs font-mono text-slate-400 hover:text-white"
            onClick={() => setAudioEnabled(!audioEnabled)}
          >
            {audioEnabled ? <Volume2 className="h-4 w-4 text-emerald-400 mr-1.5" /> : <VolumeX className="h-4 w-4 text-slate-500 mr-1.5" />}
            {audioEnabled ? "Scanner Beep ON" : "Muted"}
          </Button>
          <Badge variant="outline" className="border-purple-500/40 text-purple-300 bg-purple-950/20 font-mono text-xs">
            BHS Line Online · 99.4% Read Rate
          </Badge>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] text-slate-400 uppercase flex items-center gap-1.5">
              <Luggage className="h-3.5 w-3.5 text-purple-400" />
              Total Ingested Bags
            </span>
            <div className="text-xl font-bold text-white">1,482 Bags</div>
            <div className="text-[10px] text-slate-500">Peak Rate: 32 bags/min</div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] text-slate-400 uppercase flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              EDS Level 1 Clearance
            </span>
            <div className="text-xl font-bold text-emerald-400">99.4% Pass</div>
            <div className="text-[10px] text-slate-500">Smiths Detection CT 3D</div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] text-slate-400 uppercase flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-cyan-400" />
              ULD Containers Active
            </span>
            <div className="text-xl font-bold text-white">18 Units</div>
            <div className="text-[10px] text-slate-500">14 Sealed · 4 Packing</div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] text-slate-400 uppercase flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-amber-400" />
              Apron Tug Transfers
            </span>
            <div className="text-xl font-bold text-amber-300">100% On-Time</div>
            <div className="text-[10px] text-slate-500">Avg Handoff: 8.4 mins</div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Grid: Optical Barcode Scanner HUD & Carousel Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Optical Scanner HUD Station */}
        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl lg:col-span-1">
          <CardHeader className="pb-3 border-b border-slate-800">
            <CardTitle className="text-sm font-bold font-mono text-white flex items-center gap-2">
              <Scan className="h-4 w-4 text-purple-400" />
              Optical Barcode Induction Scanner
            </CardTitle>
            <CardDescription className="text-xs text-slate-400 font-mono">
              Scan IATA 10-digit baggage tags or select quick demo tags below.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4 font-mono">
            {/* Viewfinder HUD Box */}
            <div className="relative h-44 rounded-xl border-2 border-dashed border-purple-500/40 bg-slate-950/80 overflow-hidden flex flex-col items-center justify-center p-4">
              {/* Corner HUD Markers */}
              <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-purple-400" />
              <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-purple-400" />
              <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-purple-400" />
              <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-purple-400" />

              {/* Laser Scanning Animation Beam */}
              <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_12px_#c084fc] animate-pulse" />

              <Barcode className="h-12 w-12 text-purple-400/80 mb-2" />
              <span className="text-[11px] text-purple-300 font-bold tracking-wider">
                READY FOR INDUCTION SCAN
              </span>
              <span className="text-[10px] text-slate-500">Optical Laser Active &bull; 99.4% Read Rate</span>
            </div>

            {/* Quick Demo Scan Buttons */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Quick Test Tags:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] border-slate-800 hover:border-purple-500/40 text-slate-300 truncate"
                  onClick={() => handleScanTag("BAG-SC101-0841")}
                >
                  TAG-SC101-0841
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] border-slate-800 hover:border-purple-500/40 text-slate-300 truncate"
                  onClick={() => handleScanTag("BAG-AV201-1904")}
                >
                  TAG-AV201-1904
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] border-slate-800 hover:border-purple-500/40 text-slate-300 truncate"
                  onClick={() => handleScanTag("BAG-BH301-4411")}
                >
                  TAG-BH301-4411
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] border-red-500/40 hover:bg-red-950/20 text-red-300 truncate"
                  onClick={() => handleScanTag("BAG-SEC-9912")}
                >
                  SUSPECT-TAG
                </Button>
              </div>
            </div>

            {/* Scan Input Box */}
            <div className="flex gap-2">
              <Input
                value={scannedInput}
                onChange={(e) => setScannedInput(e.target.value)}
                placeholder="Scan or type IATA tag..."
                className="bg-slate-950/80 border-slate-800 text-xs text-white"
                onKeyDown={(e) => e.key === "Enter" && handleScanTag()}
              />
              <Button
                onClick={() => handleScanTag()}
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3"
              >
                Scan
              </Button>
            </div>

            {/* Scan Result Feedback Alert */}
            {scanResult && (
              <div
                className={`p-3 rounded-xl border text-xs space-y-1 ${
                  scanResult.ok
                    ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-300"
                    : "border-red-500/40 bg-red-950/20 text-red-300"
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {scanResult.title}
                </div>
                <div className="text-[11px] text-slate-300">{scanResult.detail}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right 2 Columns: Make-Up Carousels & Active Ingestion Table */}
        <div className="lg:col-span-2 space-y-4 font-mono">
          {/* Carousel Selector & Telemetry */}
          <Card className="border-slate-800 bg-slate-900/70">
            <CardHeader className="pb-3 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <Truck className="h-4 w-4 text-purple-400" />
                    Make-up Conveyor Carousels
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    High-speed sorting loops with optical photo-eye sensors.
                  </CardDescription>
                </div>
                <div className="flex gap-1.5">
                  {[1, 2, 3].map((num) => (
                    <button
                      key={num}
                      onClick={() => setSelectedCarousel(num)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition border ${
                        selectedCarousel === num
                          ? "border-purple-500/60 bg-purple-950/40 text-purple-200 font-bold"
                          : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                      }`}
                    >
                      Carousel 0{num}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Active Allocation</span>
                  <span className="font-bold text-white">
                    {selectedCarousel === 1
                      ? "Domestic SC101, AV201"
                      : selectedCarousel === 2
                      ? "International BAW112"
                      : "Transfers & Rush Freight"}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Conveyor Velocity</span>
                  <span className="font-bold text-emerald-400">18.2 RPM · Normal</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Current Belt Load</span>
                  <span className="font-bold text-cyan-300">
                    {selectedCarousel === 1 ? "124 Bags on Loop" : selectedCarousel === 2 ? "78 Bags on Loop" : "19 Bags on Loop"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ULD Packing & Weight-and-Balance Matrix */}
          <Card className="border-slate-800 bg-slate-900/70">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <Package className="h-4 w-4 text-cyan-400" />
                  Unit Load Device (ULD) Container Matrix & Weight & Balance
                </CardTitle>
                <Badge variant="outline" className="border-cyan-500/40 text-cyan-300 text-[10px]">
                  Belly Cargo Holds
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {ulds.map((uld) => {
                  const pct = Math.round((uld.currentWeightKg / uld.maxWeightKg) * 100);
                  const isSealed = uld.status === "SEALED" || uld.status === "RAMP_TRANSIT";
                  return (
                    <div
                      key={uld.id}
                      className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between space-y-2.5"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs">{uld.code}</span>
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
                        <div className="text-[10px] text-slate-400 mt-1">
                          Flight: <strong className="text-white">{uld.flightNumber}</strong> ({uld.destination}) · {uld.type}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Payload: {uld.currentWeightKg} kg</span>
                          <span>Max: {uld.maxWeightKg} kg</span>
                        </div>
                        <Progress value={pct} className="h-1.5 bg-slate-800" />
                        <div className="text-[10px] text-slate-500 text-right">{pct}% Gross Limit</div>
                      </div>

                      <Button
                        size="sm"
                        variant={isSealed ? "ghost" : "outline"}
                        onClick={() => handleSealUld(uld.id)}
                        className={`h-7 text-[11px] ${
                          isSealed
                            ? "text-emerald-400 hover:bg-emerald-950/20"
                            : "border-cyan-500/40 hover:bg-cyan-950/30 text-cyan-300"
                        }`}
                      >
                        {isSealed ? "✓ Container Sealed" : "Seal for Tug Dispatch"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Table: Recent Baggage Ingestion & Reconciliation Log */}
      <Card className="border-slate-800 bg-slate-900/80 font-mono">
        <CardHeader className="py-3 px-4 border-b border-slate-800 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
            <Tag className="h-4 w-4 text-purple-400" />
            Active Manifest Baggage Reconciliation Stream
          </CardTitle>
          <span className="text-xs text-slate-500">{bags.length} Bags Tracked</span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-[11px] text-slate-400 uppercase border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-4">Tag Number</th>
                  <th className="py-2.5 px-4">Passenger</th>
                  <th className="py-2.5 px-4">Flight & Stand</th>
                  <th className="py-2.5 px-4">Weight</th>
                  <th className="py-2.5 px-4">EDS Security</th>
                  <th className="py-2.5 px-4">Sortation Status</th>
                  <th className="py-2.5 px-4">Assigned ULD</th>
                  <th className="py-2.5 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {bags.map((bag) => (
                  <tr key={bag.tagNumber} className="hover:bg-slate-800/30 transition">
                    <td className="py-2.5 px-4 font-bold text-purple-300">{bag.tagNumber}</td>
                    <td className="py-2.5 px-4 text-white">
                      <div>{bag.passengerName}</div>
                      <div className="text-[10px] text-slate-500">PNR: {bag.pnr}</div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-300">
                      <span>{bag.flightNumber}</span>
                      <Badge variant="outline" className="text-[9px] py-0 px-1 ml-1.5 border-slate-700">
                        {bag.gate}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 text-slate-300">{bag.weightKg} kg</td>
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
                    </td>
                    <td className="py-2.5 px-4">
                      <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
                        {bag.sortationStatus}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 text-cyan-300 text-[11px]">{bag.assignedUld}</td>
                    <td className="py-2.5 px-4 text-slate-500 text-right text-[11px]">{bag.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
