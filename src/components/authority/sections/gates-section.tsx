"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Building,
  CheckCircle2,
  Clock,
  DoorOpen,
  Filter,
  Plane,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Warehouse,
  X,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/ui/copy-button";
import type { GateAllocationPlanDTO, GateDTO, ResourceStatus } from "@/lib/domain";

interface GateWithDetails extends GateDTO {
  airportCode: string;
  terminal: string;
  assignedFlight?: string;
  airline?: string;
  hasJetBridge: boolean;
}

const DEFAULT_GATES: GateWithDetails[] = [
  { id: "gate-b12-hyd", code: "B12", terminalId: "T1", airportCode: "HYD", terminal: "Terminal 1", status: "OCCUPIED", turnMinutes: 40, assignedFlight: "SC-101", airline: "SkyConnect", hasJetBridge: true },
  { id: "gate-a4-hyd", code: "A4", terminalId: "T1", airportCode: "HYD", terminal: "Terminal 1", status: "AVAILABLE", turnMinutes: 45, hasJetBridge: true },
  { id: "gate-a10-hyd", code: "A10", terminalId: "T1", airportCode: "HYD", terminal: "Terminal 1", status: "AVAILABLE", turnMinutes: 50, hasJetBridge: false },
  { id: "gate-b14-hyd", code: "B14", terminalId: "T1", airportCode: "HYD", terminal: "Terminal 1", status: "RESERVED", turnMinutes: 30, assignedFlight: "AV-202", airline: "AeroVista", hasJetBridge: true },
  { id: "gate-c1-hyd", code: "C1", terminalId: "T1", airportCode: "HYD", terminal: "Terminal 1", status: "AVAILABLE", turnMinutes: 40, hasJetBridge: true },
  { id: "gate-c2-hyd", code: "C2", terminalId: "T1", airportCode: "HYD", terminal: "Terminal 1", status: "OCCUPIED", turnMinutes: 15, assignedFlight: "BH-305", airline: "Blue Horizon", hasJetBridge: true },
  { id: "gate-a1-hyd", code: "A1", terminalId: "T1", airportCode: "HYD", terminal: "Terminal 1", status: "AVAILABLE", turnMinutes: 45, hasJetBridge: true },
  { id: "gate-b1-hyd", code: "B1", terminalId: "T1", airportCode: "HYD", terminal: "Terminal 1", status: "AVAILABLE", turnMinutes: 55, hasJetBridge: true },
  { id: "gate-a4-bom", code: "A4", terminalId: "T2", airportCode: "BOM", terminal: "Terminal 2", status: "OCCUPIED", turnMinutes: 35, assignedFlight: "NV-420", airline: "Nova Airways", hasJetBridge: true },
  { id: "gate-b2-bom", code: "B2", terminalId: "T2", airportCode: "BOM", terminal: "Terminal 2", status: "AVAILABLE", turnMinutes: 50, hasJetBridge: true },
  { id: "gate-c2-del", code: "C2", terminalId: "T3", airportCode: "DEL", terminal: "Terminal 3", status: "OCCUPIED", turnMinutes: 25, assignedFlight: "AV-202", airline: "AeroVista", hasJetBridge: true },
  { id: "gate-d1-blr", code: "D1", terminalId: "T2", airportCode: "BLR", terminal: "Terminal 2", status: "OCCUPIED", turnMinutes: 30, assignedFlight: "AV-210", airline: "AeroVista", hasJetBridge: true },
  { id: "gate-b6-maa", code: "B6", terminalId: "T1", airportCode: "MAA", terminal: "Terminal 1", status: "OCCUPIED", turnMinutes: 20, assignedFlight: "BH-305", airline: "Blue Horizon", hasJetBridge: true },
];

export function GatesSection({ activeStation = "HYD" }: { activeStation?: string }) {
  const [gates, setGates] = useState<GateWithDetails[]>(DEFAULT_GATES);
  const [stationFilter, setStationFilter] = useState<string>(activeStation || "HYD");
  const [terminalFilter, setTerminalFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(false);
  const [updatingCode, setUpdatingCode] = useState<string | null>(null);

  // Flight Assign Dialog
  const [assignGateTarget, setAssignGateTarget] = useState<GateWithDetails | null>(null);
  const [flightToAssign, setFlightToAssign] = useState("");
  const [airlineName, setAirlineName] = useState("");

  // Intelligent Gate Optimization State
  const [optimizationPlan, setOptimizationPlan] = useState<GateAllocationPlanDTO | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [planFeedback, setPlanFeedback] = useState<string | null>(null);

  const handleRunOptimization = async () => {
    setIsOptimizing(true);
    setPlanFeedback(null);
    try {
      const res = await fetch("/api/operations/gate-allocation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          airportCode: stationFilter === "ALL" ? "HYD" : stationFilter,
        }),
      });
      if (!res.ok) throw new Error("Failed to optimize gate allocations.");
      const plan: GateAllocationPlanDTO = await res.json();
      setOptimizationPlan(plan);
      setPlanFeedback(`Calculated optimal plan with ${plan.overallEfficiencyScore}% efficiency.`);
    } catch {
      setPlanFeedback("Failed to run intelligent gate optimization.");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleApplyOptimizationPlan = () => {
    if (!optimizationPlan) return;
    setGates((prev) =>
      prev.map((g) => {
        const assignment = optimizationPlan.assignments.find((a) => a.allocatedGateCode === g.code);
        if (assignment) {
          return {
            ...g,
            status: "RESERVED",
            assignedFlight: assignment.callsign,
            airline: assignment.airline,
            turnMinutes: assignment.turnaroundMinutes,
          };
        }
        return g;
      })
    );
    setPlanFeedback("Applied all optimized gate allocations successfully.");
  };

  const fetchGates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/resources?type=GATE");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.gates) && data.gates.length > 0) {
          // Merge API gates with rich details
          setGates((prev) => {
            const apiGates = data.gates as GateDTO[];
            return prev.map((g) => {
              const matched = apiGates.find((ag) => ag.code === g.code);
              return matched ? { ...g, status: matched.status } : g;
            });
          });
        }
      }
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGates();
  }, []);

  const handleToggleGate = async (gate: GateWithDetails) => {
    const nextStatus: ResourceStatus =
      gate.status === "AVAILABLE"
        ? "OCCUPIED"
        : gate.status === "OCCUPIED"
        ? "MAINTENANCE"
        : "AVAILABLE";

    setUpdatingCode(gate.code);
    // Optimistic UI update
    setGates((prev) =>
      prev.map((g) => (g.id === gate.id ? { ...g, status: nextStatus } : g))
    );

    try {
      await fetch("/api/resources", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceType: "GATE",
          code: gate.code,
          id: gate.id,
          status: nextStatus,
        }),
      });
    } catch {
      // Revert if failed
      fetchGates();
    } finally {
      setUpdatingCode(null);
    }
  };

  const handleAssignFlight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignGateTarget || !flightToAssign.trim()) return;

    const targetCode = assignGateTarget.code;
    setGates((prev) =>
      prev.map((g) =>
        g.code === targetCode
          ? {
              ...g,
              status: "OCCUPIED",
              assignedFlight: flightToAssign.trim().toUpperCase(),
              airline: airlineName.trim() || "Scheduled Carrier",
              turnMinutes: 45,
            }
          : g
      )
    );

    try {
      await fetch("/api/resources", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceType: "GATE",
          code: targetCode,
          status: "OCCUPIED",
          updates: { assignedFlightId: flightToAssign.trim().toUpperCase() },
        }),
      });
    } catch {
      // Non-blocking
    } finally {
      setAssignGateTarget(null);
      setFlightToAssign("");
      setAirlineName("");
    }
  };

  const filtered = gates.filter((g) => {
    const matchesStation = stationFilter === "ALL" || g.airportCode === stationFilter;
    const matchesTerminal = terminalFilter === "ALL" || g.terminal === terminalFilter;
    const matchesStatus = statusFilter === "ALL" || g.status === statusFilter;
    return matchesStation && matchesTerminal && matchesStatus;
  });

  const availableCount = filtered.filter((g) => g.status === "AVAILABLE").length;
  const occupiedCount = filtered.filter((g) => g.status === "OCCUPIED").length;
  const maintCount = filtered.filter((g) => g.status === "MAINTENANCE").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Warehouse className="h-6 w-6 text-primary" />
            Gate Management & Terminal Stands ({stationFilter})
          </h2>
          <p className="text-sm text-muted-foreground">
            Monitor gate occupancy, contact jet bridges, turnaround countdowns, and flight parking allocations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={stationFilter}
            onChange={(e) => setStationFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground"
          >
            <option value="ALL">All Stations</option>
            <option value="HYD">HYD — Hyderabad</option>
            <option value="BOM">BOM — Mumbai</option>
            <option value="DEL">DEL — Delhi</option>
            <option value="BLR">BLR — Bengaluru</option>
            <option value="MAA">MAA — Chennai</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground"
          >
            <option value="ALL">All States</option>
            <option value="AVAILABLE">Available</option>
            <option value="OCCUPIED">Occupied</option>
            <option value="RESERVED">Reserved</option>
            <option value="MAINTENANCE">Maintenance</option>
          </select>
          <Button
            size="sm"
            onClick={handleRunOptimization}
            disabled={isOptimizing}
            className="h-8 gap-1.5 font-semibold text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            <Sparkles className={`h-3.5 w-3.5 ${isOptimizing ? "animate-spin text-amber-300" : "text-amber-300"}`} />
            {isOptimizing ? "Optimizing..." : "Auto-Allocate Stands"}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchGates} disabled={loading} className="h-8">
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Total Stands</p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{filtered.length}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">In current filter</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Warehouse className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Available Gates</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-400">{availableCount}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Ready for arrival</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Occupied Stands</p>
              <h3 className="text-2xl font-bold mt-1 text-sky-400">{occupiedCount}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Turnaround in progress</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-400">
              <Plane className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Maintenance</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-400">{maintCount}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Jet bridge / tarmac work</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Building className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {planFeedback && (
        <div className="p-3 rounded bg-emerald-950/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{planFeedback}</span>
          </div>
          {optimizationPlan && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[11px] border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/20"
              onClick={handleApplyOptimizationPlan}
            >
              <Zap className="h-3 w-3 mr-1" />
              Apply to All Gates
            </Button>
          )}
        </div>
      )}

      {optimizationPlan && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="py-3 px-4 border-b border-primary/20 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Sparkles className="h-4 w-4 text-amber-400" />
                A-GAMS Intelligent Gate Allocation Plan ({optimizationPlan.airportCode})
              </CardTitle>
              <CardDescription className="text-xs">
                Generated allocation based on wingspan reference code, turnaround buffer, and terminal affinities.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs font-mono">
                {optimizationPlan.overallEfficiencyScore}% Efficiency
              </Badge>
              <Badge variant="outline" className="text-xs font-mono">
                {optimizationPlan.conflictsResolved} Conflicts Resolved
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto">
              {optimizationPlan.assignments.map((a) => (
                <div
                  key={a.flightId}
                  className="p-2.5 rounded border border-border/60 bg-card/90 text-xs space-y-1 font-mono"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <Plane className="h-3.5 w-3.5 text-primary" />
                      {a.callsign}
                    </span>
                    <Badge variant="default" className="text-[10px] font-bold">
                      GATE {a.allocatedGateCode}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                    <span>{a.aircraftType}</span>
                    <span className="text-primary">{a.turnaroundMinutes}m Turn</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate" title={a.compatibilityReason}>
                    {a.compatibilityReason}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((gate) => {
          const isAvail = gate.status === "AVAILABLE";
          const isOcc = gate.status === "OCCUPIED";
          return (
            <Card key={gate.id} className="border-border/60 bg-card/80 hover:bg-card transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-mono font-bold text-foreground">
                      GATE {gate.code}
                    </span>
                    <CopyButton value={gate.code} title="Copy Gate Code" />
                    <Badge variant="outline" className="text-xs">
                      {gate.airportCode} - {gate.terminal}
                    </Badge>
                  </div>
                  <Badge
                    variant={isAvail ? "default" : isOcc ? "destructive" : "secondary"}
                    className="text-xs"
                  >
                    {gate.status}
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  {gate.hasJetBridge ? "Contact Stand (Jet Bridge Equipped)" : "Remote Apron Stand"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {gate.assignedFlight ? (
                  <div className="p-2.5 rounded bg-muted/50 border border-border/50 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-primary flex items-center gap-1.5">
                        <Plane className="h-3 w-3" />
                        {gate.assignedFlight}
                        <CopyButton value={gate.assignedFlight} title="Copy Assigned Flight" />
                      </span>
                      <span className="text-[11px] text-muted-foreground">{gate.airline}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground block">TURNAROUND</span>
                      <span className="font-mono text-foreground font-semibold flex items-center gap-1">
                        <Clock className="h-3 w-3 text-amber-400" />
                        {gate.turnMinutes}m left
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded bg-background/50 border border-border/40 text-muted-foreground flex items-center justify-between">
                    <span>Stand vacant & ready for inbound</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAssignGateTarget(gate)}
                      className="h-6 text-[11px] text-primary hover:bg-primary/10"
                    >
                      Assign Flight
                    </Button>
                  </div>
                )}

                <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                  <span className="text-muted-foreground text-[11px]">Override State:</span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={updatingCode === gate.code}
                    className="h-6 text-[11px]"
                    onClick={() => handleToggleGate(gate)}
                  >
                    {updatingCode === gate.code ? "Saving..." : "Toggle Gate"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ASSIGN FLIGHT MODAL */}
      {assignGateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <Card className="w-full max-w-sm border-primary/40 shadow-2xl bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Plane className="h-4 w-4 text-primary" />
                  Assign Gate {assignGateTarget.code}
                </CardTitle>
                <CardDescription>
                  Station: {assignGateTarget.airportCode} &bull; {assignGateTarget.terminal}
                </CardDescription>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setAssignGateTarget(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAssignFlight} className="space-y-3 text-xs">
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Inbound Callsign / Flight # *</label>
                  <Input
                    type="text"
                    placeholder="e.g. SC-101 or AV-202"
                    value={flightToAssign}
                    onChange={(e) => setFlightToAssign(e.target.value.toUpperCase())}
                    required
                    className="h-8 text-xs font-mono uppercase bg-background"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Airline Name</label>
                  <Input
                    type="text"
                    placeholder="e.g. SkyConnect Airlines"
                    value={airlineName}
                    onChange={(e) => setAirlineName(e.target.value)}
                    className="h-8 text-xs bg-background"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setAssignGateTarget(null)}
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                    size="sm"
                  >
                    Confirm Parking Allocation
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
