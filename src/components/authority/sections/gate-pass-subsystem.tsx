"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  BadgeAlert,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCheck,
  Filter,
  Lock,
  Plus,
  Printer,
  QrCode,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/ui/copy-button";
import type {
  GatePassDTO,
  GatePassType,
  SecurityZone,
  TurnstileScanEntry,
} from "@/lib/domain";

const ZONE_DESCRIPTIONS: Record<SecurityZone, { label: string; area: string; color: string }> = {
  ZONE_A_PUBLIC: { label: "Zone A: Public Concourse", area: "Terminal Check-In, Landside Concourse", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  ZONE_B_SECURITY: { label: "Zone B: Sterile Security", area: "Security Screening & Central Concourse", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
  ZONE_C_BOARDING: { label: "Zone C: Boarding Pier", area: "Gates, Aerobridges, Holding Lounges", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" },
  ZONE_D_RAMP: { label: "Zone D: Apron & Ramp", area: "Aircraft Stands, Tarmac, Baggage Makeup", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  ZONE_E_ATC: { label: "Zone E: ATC Tower Cab", area: "Air Traffic Control, Radar Operations", color: "bg-rose-500/10 text-rose-400 border-rose-500/30" },
};

const CHECKPOINTS = [
  { id: "TURNSTILE-01", name: "Turnstile T-01: Apron & Ramp Access", zone: "ZONE_D_RAMP" as SecurityZone },
  { id: "TURNSTILE-02", name: "Turnstile T-02: Boarding Pier Pier-C", zone: "ZONE_C_BOARDING" as SecurityZone },
  { id: "TURNSTILE-03", name: "Turnstile T-03: ATC Cab Security Post", zone: "ZONE_E_ATC" as SecurityZone },
  { id: "TURNSTILE-04", name: "Turnstile T-04: Sterile Screening Gates", zone: "ZONE_B_SECURITY" as SecurityZone },
];

export function GatePassSubsystem() {
  const [passes, setPasses] = useState<GatePassDTO[]>([]);
  const [recentScans, setRecentScans] = useState<TurnstileScanEntry[]>([]);
  const [kpis, setKpis] = useState<{
    totalPasses: number;
    activePasses: number;
    rampAirsidePasses: number;
    turnstileGrantedScans: number;
    turnstileDeniedScans: number;
    recentScansCount: number;
  }>({
    totalPasses: 0,
    activePasses: 0,
    rampAirsidePasses: 0,
    turnstileGrantedScans: 0,
    turnstileDeniedScans: 0,
    recentScansCount: 0,
  });

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Scanner Simulator State
  const [scanPassInput, setScanPassInput] = useState("");
  const [selectedCheckpoint, setSelectedCheckpoint] = useState(CHECKPOINTS[0]);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    granted: boolean;
    reason: string;
    pass?: GatePassDTO;
    scanEntry?: TurnstileScanEntry;
  } | null>(null);

  // Issue Pass Dialog State
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [issueLoading, setIssueLoading] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [newPassForm, setNewPassForm] = useState<{
    holderName: string;
    idNumber: string;
    passType: GatePassType;
    organization: string;
    airportCode: string;
    terminal: string;
    authorizedZones: SecurityZone[];
    durationHours: number;
    escortRequired: boolean;
    purpose: string;
  }>({
    holderName: "",
    idNumber: "",
    passType: "CONTRACTOR",
    organization: "",
    airportCode: "HYD",
    terminal: "T1",
    authorizedZones: ["ZONE_A_PUBLIC", "ZONE_D_RAMP"],
    durationHours: 12,
    escortRequired: false,
    purpose: "",
  });

  // Revoke Dialog State
  const [revokeTarget, setRevokeTarget] = useState<GatePassDTO | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [revokeLoading, setRevokeLoading] = useState(false);

  // Selected Pass for Full Preview Modal
  const [previewPass, setPreviewPass] = useState<GatePassDTO | null>(null);

  const fetchPasses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/security/gate-passes");
      if (res.ok) {
        const data = await res.json();
        setPasses(data.passes || []);
        if (data.kpis) setKpis(data.kpis);
        if (data.recentScans) setRecentScans(data.recentScans);
      }
    } catch {
      // Non-blocking fetch
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasses();
  }, []);

  const handleIssuePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassForm.holderName.trim() || !newPassForm.idNumber.trim() || !newPassForm.organization.trim()) {
      setIssueError("Please fill all required identification fields.");
      return;
    }
    if (newPassForm.authorizedZones.length === 0) {
      setIssueError("Select at least one authorized airport security zone.");
      return;
    }

    setIssueLoading(true);
    setIssueError(null);
    try {
      const res = await fetch("/api/security/gate-passes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPassForm),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setIsIssueModalOpen(false);
        // Reset form
        setNewPassForm({
          holderName: "",
          idNumber: "",
          passType: "CONTRACTOR",
          organization: "",
          airportCode: "HYD",
          terminal: "T1",
          authorizedZones: ["ZONE_A_PUBLIC", "ZONE_D_RAMP"],
          durationHours: 12,
          escortRequired: false,
          purpose: "",
        });
        await fetchPasses();
        // Immediately load the newly issued pass in preview
        if (data.pass) {
          setPreviewPass(data.pass);
          setScanPassInput(data.pass.passNumber);
        }
      } else {
        setIssueError(data.error || "Failed to issue gate pass.");
      }
    } catch {
      setIssueError("Server error while issuing gate pass.");
    } finally {
      setIssueLoading(false);
    }
  };

  const handleScanTurnstile = async (passCodeToScan?: string) => {
    const code = (passCodeToScan || scanPassInput).trim();
    if (!code) return;

    setScanning(true);
    try {
      const res = await fetch("/api/security/gate-passes/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passNumberOrQr: code,
          turnstileId: selectedCheckpoint.id,
          turnstileName: selectedCheckpoint.name,
          zone: selectedCheckpoint.zone,
          direction: "ENTRY",
        }),
      });

      const data = await res.json();
      setScanResult(data);
      if (data.scanEntry) {
        setRecentScans((prev) => [data.scanEntry, ...prev.slice(0, 24)]);
      }
      await fetchPasses();
    } catch {
      setScanResult({
        granted: false,
        reason: "Failed to connect to turnstile access controller.",
      });
    } finally {
      setScanning(false);
    }
  };

  const handleRevokePass = async () => {
    if (!revokeTarget) return;

    setRevokeLoading(true);
    try {
      const res = await fetch(`/api/security/gate-passes/${revokeTarget.passNumber}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: revokeReason.trim() || "Revoked by security supervisor" }),
      });

      if (res.ok) {
        setRevokeTarget(null);
        setRevokeReason("");
        await fetchPasses();
      }
    } catch {
      // Non-blocking
    } finally {
      setRevokeLoading(false);
    }
  };

  const toggleZone = (zone: SecurityZone) => {
    setNewPassForm((prev) => {
      const exists = prev.authorizedZones.includes(zone);
      return {
        ...prev,
        authorizedZones: exists
          ? prev.authorizedZones.filter((z) => z !== zone)
          : [...prev.authorizedZones, zone],
      };
    });
  };

  // Filtered Passes
  const filteredPasses = passes.filter((p) => {
    if (typeFilter !== "ALL" && p.passType !== typeFilter) return false;
    if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.passNumber.toLowerCase().includes(q) ||
        p.holderName.toLowerCase().includes(q) ||
        p.organization.toLowerCase().includes(q) ||
        p.idNumber.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active Gate Passes</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-400">{kpis.activePasses}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Total registered: {kpis.totalPasses}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Ramp Cleared (Zone D)</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-400">{kpis.rampAirsidePasses}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Airside tarmac endorsed</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Building2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Turnstile Granted</p>
              <h3 className="text-2xl font-bold mt-1 text-primary">{kpis.turnstileGrantedScans}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Authorized checkpoint entries</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Access Denied Incursions</p>
              <h3 className="text-2xl font-bold mt-1 text-rose-400">{kpis.turnstileDeniedScans}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Unauthorized or expired attempts</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Turnstile Scanner Simulator & Live Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Turnstile Simulator Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/60 bg-card/80 backdrop-blur">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Turnstile Scanner & Clearance Validator
                  </CardTitle>
                  <CardDescription>
                    Simulates biometric RFID badge tap or QR scan at airside checkpoint turnstiles.
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setIsIssueModalOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Issue New Gate Pass
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Checkpoint Selector */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  Select Airside Security Checkpoint Turnstile:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CHECKPOINTS.map((cp) => {
                    const isSelected = selectedCheckpoint.id === cp.id;
                    const zoneMeta = ZONE_DESCRIPTIONS[cp.zone];
                    return (
                      <button
                        key={cp.id}
                        type="button"
                        onClick={() => setSelectedCheckpoint(cp)}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border/60 hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">{cp.name}</span>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${zoneMeta.color}`}>
                            {cp.zone.replace("ZONE_", "")}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{zoneMeta.area}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scan Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleScanTurnstile();
                }}
                className="flex flex-col sm:flex-row gap-3 pt-2"
              >
                <div className="relative flex-1">
                  <QrCode className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Enter Gate Pass # e.g. GP-HYD-2026-000101 or scan QR payload"
                    value={scanPassInput}
                    onChange={(e) => setScanPassInput(e.target.value.toUpperCase())}
                    className="pl-9 font-mono uppercase bg-background"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={scanning || !scanPassInput.trim()}
                  className="px-6 font-semibold"
                >
                  {scanning ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  ) : (
                    <FileCheck className="h-4 w-4 mr-2" />
                  )}
                  Simulate Turnstile Tap
                </Button>
              </form>

              {/* Quick Preset Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
                <span className="font-medium">Quick Test Passes:</span>
                {[
                  { label: "Capt. Rohit (Crew/Ramp)", code: "GP-HYD-2026-000101" },
                  { label: "Rajesh (Contractor/Ramp)", code: "GP-HYD-2026-000102" },
                  { label: "Dr. Priya (Visitor/ATC)", code: "GP-HYD-2026-000103" },
                  { label: "Meera (Expired)", code: "GP-HYD-2026-000105" },
                  { label: "Sanjay (Revoked)", code: "GP-HYD-2026-000106" },
                ].map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => {
                      setScanPassInput(item.code);
                      handleScanTurnstile(item.code);
                    }}
                    className="px-2 py-0.5 rounded bg-muted hover:bg-muted/80 font-mono text-[11px] text-foreground border border-border"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Turnstile Scan Feedback Card */}
          {scanResult && (
            <Card
              className={`border-2 transition-all ${
                scanResult.granted
                  ? "border-emerald-500/60 bg-emerald-950/15 shadow-lg shadow-emerald-950/30"
                  : "border-rose-500/60 bg-rose-950/15 shadow-lg shadow-rose-950/30"
              }`}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
                  <div className="flex items-center gap-4">
                    {scanResult.granted ? (
                      <div className="h-12 w-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                        <CheckCircle2 className="h-7 w-7" />
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                        <XCircle className="h-7 w-7" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`text-sm py-0.5 px-2.5 font-bold ${
                            scanResult.granted
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                              : "bg-rose-500/20 text-rose-400 border-rose-500/40"
                          }`}
                        >
                          {scanResult.granted ? "ACCESS GRANTED" : "ACCESS DENIED"}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">
                          {selectedCheckpoint.name}
                        </span>
                      </div>
                      <p className="text-sm font-medium mt-1 text-foreground">
                        {scanResult.reason}
                      </p>
                    </div>
                  </div>

                  {scanResult.pass && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewPass(scanResult.pass || null)}
                      className="border-primary/40 text-primary hover:bg-primary/10"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      View Pass Badge
                    </Button>
                  )}
                </div>

                {/* Scanned Badge Details */}
                {scanResult.pass && (
                  <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground">Holder Name:</span>
                      <p className="font-semibold text-foreground mt-0.5">{scanResult.pass.holderName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Pass Type:</span>
                      <p className="font-semibold text-foreground mt-0.5">{scanResult.pass.passType}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Organization:</span>
                      <p className="font-semibold text-foreground mt-0.5 truncate">{scanResult.pass.organization}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Valid Until:</span>
                      <p className="font-semibold text-foreground mt-0.5">
                        {new Date(scanResult.pass.validUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Gate Passes Directory Table */}
          <Card className="border-border/60 bg-card/80 backdrop-blur">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Authorized Airside Passes Directory
                  </CardTitle>
                  <CardDescription>
                    All issued digital gate passes across security zones.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={fetchPasses} disabled={loading} className="h-8 px-2.5">
                    <RotateCcw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search name, pass #, org..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-xs h-8 bg-background"
                  />
                </div>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="text-xs h-8 px-2.5 rounded-md border border-border bg-background text-foreground"
                >
                  <option value="ALL">All Pass Types</option>
                  <option value="CREW">Crew Operations</option>
                  <option value="CONTRACTOR">Contractor</option>
                  <option value="VISITOR">Visitor</option>
                  <option value="VIP">VIP Delegate</option>
                  <option value="TEMPORARY_STAFF">Temporary Staff</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs h-8 px-2.5 rounded-md border border-border bg-background text-foreground"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="REVOKED">Revoked</option>
                </select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-y border-border/60 text-muted-foreground font-medium uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-2.5">Pass Number</th>
                      <th className="px-4 py-2.5">Holder & Org</th>
                      <th className="px-4 py-2.5">Type</th>
                      <th className="px-4 py-2.5">Clearance Zones</th>
                      <th className="px-4 py-2.5">Validity</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-mono text-[11px]">
                    {filteredPasses.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-muted-foreground font-sans">
                          No matching gate passes found.
                        </td>
                      </tr>
                    ) : (
                      filteredPasses.map((p) => {
                        const isExpired = new Date(p.validUntil).getTime() < Date.now();
                        const effectiveStatus = p.status === "ACTIVE" && isExpired ? "EXPIRED" : p.status;
                        return (
                          <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 font-semibold text-foreground">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="cursor-pointer hover:underline text-primary"
                                  onClick={() => setPreviewPass(p)}
                                >
                                  {p.passNumber}
                                </span>
                                <CopyButton value={p.passNumber} title="Copy Pass #" />
                              </div>
                            </td>
                            <td className="px-4 py-3 font-sans">
                              <p className="font-medium text-foreground">{p.holderName}</p>
                              <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{p.organization}</p>
                            </td>
                            <td className="px-4 py-3 font-sans">
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                                {p.passType}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 font-sans">
                              <div className="flex flex-wrap gap-1 max-w-[160px]">
                                {p.authorizedZones.map((z) => (
                                  <span
                                    key={z}
                                    className="text-[9px] px-1 py-0.2 rounded bg-muted text-muted-foreground border border-border"
                                  >
                                    {z.replace("ZONE_", "")}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-sans text-muted-foreground">
                              <p>Until: {new Date(p.validUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                              <p className="text-[10px]">{new Date(p.validUntil).toLocaleDateString()}</p>
                            </td>
                            <td className="px-4 py-3 font-sans">
                              <Badge
                                variant={
                                  effectiveStatus === "ACTIVE"
                                    ? "default"
                                    : effectiveStatus === "REVOKED"
                                    ? "destructive"
                                    : "secondary"
                                }
                                className="text-[10px] px-1.5 py-0"
                              >
                                {effectiveStatus}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right space-x-1 font-sans">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-[11px]"
                                onClick={() => setPreviewPass(p)}
                              >
                                View
                              </Button>
                              {p.status === "ACTIVE" && !isExpired && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-950/20"
                                  onClick={() => setRevokeTarget(p)}
                                >
                                  Revoke
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Turnstile Access Stream Column */}
        <div className="space-y-6">
          <Card className="border-border/60 bg-card/80 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Live Turnstile Tap Log
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-mono">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ONLINE
                </span>
              </CardTitle>
              <CardDescription>
                Real-time security gate incursion monitoring.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentScans.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No turnstile taps recorded yet.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
                  {recentScans.map((scan) => (
                    <div
                      key={scan.id}
                      className={`p-2.5 rounded-lg border text-xs transition-colors ${
                        scan.granted
                          ? "border-emerald-500/30 bg-emerald-950/10"
                          : "border-rose-500/40 bg-rose-950/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          {scan.granted ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-rose-400" />
                          )}
                          {scan.holderName}
                        </span>
                        <Badge
                          variant={scan.granted ? "default" : "destructive"}
                          className="text-[9px] px-1.5 py-0 font-bold"
                        >
                          {scan.granted ? "GRANTED" : "DENIED"}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-muted-foreground mt-1 text-[11px]">
                        <span className="font-mono text-primary cursor-pointer hover:underline" onClick={() => setScanPassInput(scan.passNumber)}>
                          {scan.passNumber}
                        </span>
                        <span className="font-mono">{new Date(scan.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                      </div>

                      <p className="text-[11px] text-muted-foreground mt-1">
                        {scan.turnstileName} &bull; <strong className="text-foreground">{scan.zone.replace("ZONE_", "")}</strong>
                      </p>

                      {!scan.granted && scan.reason && (
                        <p className="text-[10px] text-rose-300 mt-1 font-medium bg-rose-950/40 p-1 rounded border border-rose-800/40">
                          {scan.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Airport Zone Reference Card */}
          <Card className="border-border/60 bg-card/80 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                Airside Security Clearances
              </CardTitle>
            </CardHeader>
            <CardContent className="text-[11px] space-y-2 text-muted-foreground">
              {Object.entries(ZONE_DESCRIPTIONS).map(([key, item]) => (
                <div key={key} className="flex items-start justify-between gap-2 border-b border-border/40 pb-1.5 last:border-none">
                  <div>
                    <span className="font-semibold text-foreground">{item.label}</span>
                    <p className="text-[10px] text-muted-foreground">{item.area}</p>
                  </div>
                  <Badge variant="outline" className={`text-[9px] px-1 py-0 shrink-0 ${item.color}`}>
                    {key.replace("ZONE_", "")}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ISSUE GATE PASS MODAL */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <Card className="w-full max-w-lg border-primary/40 shadow-2xl bg-card max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Issue Airside Gate Pass
                </CardTitle>
                <CardDescription>
                  Generate a digital biometric security pass for airside access.
                </CardDescription>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setIsIssueModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {issueError && (
                <div className="mb-4 p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{issueError}</span>
                </div>
              )}

              <form onSubmit={handleIssuePass} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">Holder Full Name *</label>
                    <Input
                      type="text"
                      placeholder="e.g. Ramesh Varma"
                      value={newPassForm.holderName}
                      onChange={(e) => setNewPassForm({ ...newPassForm, holderName: e.target.value })}
                      required
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">Govt ID / Passport / Crew ID *</label>
                    <Input
                      type="text"
                      placeholder="e.g. IND-PASS-8821"
                      value={newPassForm.idNumber}
                      onChange={(e) => setNewPassForm({ ...newPassForm, idNumber: e.target.value.toUpperCase() })}
                      required
                      className="h-8 text-xs font-mono uppercase bg-background"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">Pass Type *</label>
                    <select
                      value={newPassForm.passType}
                      onChange={(e) => setNewPassForm({ ...newPassForm, passType: e.target.value as GatePassType })}
                      className="w-full h-8 px-2 rounded-md border border-border bg-background text-foreground text-xs"
                    >
                      <option value="CONTRACTOR">Contractor</option>
                      <option value="CREW">Crew Member</option>
                      <option value="VISITOR">Visitor</option>
                      <option value="VIP">VIP Delegate</option>
                      <option value="TEMPORARY_STAFF">Temporary Staff</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">Organization / Airline *</label>
                    <Input
                      type="text"
                      placeholder="e.g. Air India Ground / Siemens"
                      value={newPassForm.organization}
                      onChange={(e) => setNewPassForm({ ...newPassForm, organization: e.target.value })}
                      required
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">Airport & Terminal</label>
                    <div className="flex gap-2">
                      <select
                        value={newPassForm.airportCode}
                        onChange={(e) => setNewPassForm({ ...newPassForm, airportCode: e.target.value })}
                        className="w-1/2 h-8 px-2 rounded-md border border-border bg-background text-foreground text-xs"
                      >
                        <option value="HYD">HYD</option>
                        <option value="BOM">BOM</option>
                        <option value="DEL">DEL</option>
                        <option value="BLR">BLR</option>
                        <option value="MAA">MAA</option>
                      </select>
                      <Input
                        type="text"
                        value={newPassForm.terminal}
                        onChange={(e) => setNewPassForm({ ...newPassForm, terminal: e.target.value })}
                        className="w-1/2 h-8 text-xs bg-background"
                        placeholder="T1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">Validity Duration</label>
                    <select
                      value={newPassForm.durationHours}
                      onChange={(e) => setNewPassForm({ ...newPassForm, durationHours: Number(e.target.value) })}
                      className="w-full h-8 px-2 rounded-md border border-border bg-background text-foreground text-xs"
                    >
                      <option value={4}>4 Hours (Short Visitor)</option>
                      <option value={8}>8 Hours (Single Shift)</option>
                      <option value={12}>12 Hours (Contractor)</option>
                      <option value={24}>24 Hours (Daily Ops / Crew)</option>
                      <option value={72}>72 Hours (3-Day Maintenance)</option>
                    </select>
                  </div>
                </div>

                {/* Security Zones Checkboxes */}
                <div>
                  <label className="text-muted-foreground block mb-1.5 font-medium">
                    Authorized Security Zones Clearance *
                  </label>
                  <div className="space-y-1.5 bg-muted/30 p-2.5 rounded-lg border border-border/60">
                    {(Object.keys(ZONE_DESCRIPTIONS) as SecurityZone[]).map((zone) => {
                      const isChecked = newPassForm.authorizedZones.includes(zone);
                      const desc = ZONE_DESCRIPTIONS[zone];
                      return (
                        <label
                          key={zone}
                          className="flex items-center gap-2 cursor-pointer text-xs p-1 rounded hover:bg-muted/50"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleZone(zone)}
                            className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                          />
                          <span className="font-semibold text-foreground">{desc.label}</span>
                          <span className="text-[10px] text-muted-foreground ml-auto">{desc.area}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Purpose of Entry / Assignment *</label>
                  <Input
                    type="text"
                    placeholder="e.g. Routine baggage system inspection on Apron Bay 4"
                    value={newPassForm.purpose}
                    onChange={(e) => setNewPassForm({ ...newPassForm, purpose: e.target.value })}
                    required
                    className="h-8 text-xs bg-background"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="escortToggle"
                    checked={newPassForm.escortRequired}
                    onChange={(e) => setNewPassForm({ ...newPassForm, escortRequired: e.target.checked })}
                    className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                  />
                  <label htmlFor="escortToggle" className="text-xs text-foreground font-medium cursor-pointer">
                    Escort Required (Must be accompanied by airside security staff)
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/60">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsIssueModalOpen(false)}
                    disabled={issueLoading}
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={issueLoading}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                    size="sm"
                  >
                    {issueLoading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 mr-1.5" />
                    )}
                    Authorize & Issue Pass
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* PREVIEW DIGITAL PASS BADGE MODAL */}
      {previewPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border-2 border-primary/50 rounded-2xl shadow-2xl p-6 relative overflow-hidden space-y-4">
            {/* Header / Brand */}
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold">
                  AOCC
                </div>
                <div>
                  <h4 className="text-sm font-bold tracking-tight text-foreground">AIRPORT OPERATIONS CONTROL</h4>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Airside Security Pass</p>
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setPreviewPass(null)} className="h-7 w-7">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Visual Security Card */}
            <div className="p-4 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-background relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 bg-primary/20 text-primary border-primary/40 mb-1">
                    {previewPass.passType}
                  </Badge>
                  <h3 className="text-lg font-bold text-foreground">{previewPass.holderName}</h3>
                  <p className="text-xs text-muted-foreground">{previewPass.organization}</p>
                </div>
                <div className="h-16 w-16 rounded-lg bg-background border border-border flex items-center justify-center font-mono text-[9px] text-center p-1 text-muted-foreground">
                  <div className="space-y-0.5">
                    <QrCode className="h-7 w-7 mx-auto text-primary" />
                    <span>SCAN TAP</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border/60 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-muted-foreground text-[10px]">Pass Number:</span>
                  <p className="font-mono font-semibold text-foreground flex items-center gap-1">
                    {previewPass.passNumber}
                    <CopyButton value={previewPass.passNumber} title="Copy" />
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px]">Station / Terminal:</span>
                  <p className="font-semibold text-foreground">{previewPass.airportCode} - {previewPass.terminal}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px]">Govt ID / Passport:</span>
                  <p className="font-mono text-foreground">{previewPass.idNumber}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px]">Status:</span>
                  <p className="font-semibold text-emerald-400">{previewPass.status}</p>
                </div>
              </div>

              {/* Clearances */}
              <div className="mt-3 pt-2 border-t border-border/40">
                <span className="text-[10px] text-muted-foreground block mb-1">Authorized Zones:</span>
                <div className="flex flex-wrap gap-1">
                  {previewPass.authorizedZones.map((z) => (
                    <Badge key={z} variant="outline" className="text-[9px] px-1.5 py-0 bg-background/80">
                      {z.replace("ZONE_", "")}
                    </Badge>
                  ))}
                </div>
              </div>

              {previewPass.escortRequired && (
                <div className="mt-2.5 p-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>Escort Required: Staff must be escorted at all times airside.</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setScanPassInput(previewPass.passNumber);
                  setPreviewPass(null);
                  handleScanTurnstile(previewPass.passNumber);
                }}
                className="text-xs border-primary/40 text-primary"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Scan at Turnstile
              </Button>
              <Button
                size="sm"
                onClick={() => window.print()}
                className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                <Printer className="h-3.5 w-3.5 mr-1.5" />
                Print Security Pass
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* REVOKE PASS CONFIRMATION MODAL */}
      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <Card className="w-full max-w-md border-rose-500/40 shadow-2xl bg-card">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-rose-400">
                <ShieldAlert className="h-5 w-5" />
                Revoke Gate Pass
              </CardTitle>
              <CardDescription>
                Revoking will immediately deny turnstile access across all airport zones.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="p-2.5 rounded bg-muted/40 border border-border/60">
                <p><strong>Pass:</strong> <span className="font-mono">{revokeTarget.passNumber}</span></p>
                <p><strong>Holder:</strong> {revokeTarget.holderName} ({revokeTarget.organization})</p>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Revocation Reason *</label>
                <Input
                  type="text"
                  placeholder="e.g. Airside safety non-compliance / early departure"
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setRevokeTarget(null)}
                  disabled={revokeLoading}
                  size="sm"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleRevokePass}
                  disabled={revokeLoading}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-semibold"
                  size="sm"
                >
                  {revokeLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 mr-1.5" />
                  )}
                  Confirm Revocation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
