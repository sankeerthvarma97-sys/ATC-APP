"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Compass,
  FileText,
  Gauge,
  Layers,
  Navigation,
  RefreshCw,
  Send,
  ShieldAlert,
  Sliders,
  SunMedium,
  Wind,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { RunwayDTO, ResourceStatus } from "@/lib/domain";

const DEFAULT_RUNWAYS: RunwayDTO[] = [
  { id: "rwy-09l-hyd", airportId: "HYD", code: "09L/27R", headingDeg: 92, lengthMeters: 4260, status: "AVAILABLE", wind: "090/08kt", approachType: "CAT IIIb ILS", surfaceCondition: "DRY", frictionMu: 0.76, ilsStatus: "OPERATIONAL", lightingStatus: "FULL", activeConfig: "MIXED_MODE" },
  { id: "rwy-09r-hyd", airportId: "HYD", code: "09R/27L", headingDeg: 92, lengthMeters: 3800, status: "OCCUPIED", wind: "090/08kt", approachType: "CAT II ILS", surfaceCondition: "DRY", frictionMu: 0.74, ilsStatus: "OPERATIONAL", lightingStatus: "FULL", activeConfig: "DEPARTURES_ONLY" },
  { id: "rwy-04l-jfk", airportId: "JFK", code: "04L/22R", headingDeg: 44, lengthMeters: 3682, status: "OCCUPIED", wind: "040/12kt", approachType: "CAT IIIb ILS", surfaceCondition: "DRY", frictionMu: 0.72, ilsStatus: "OPERATIONAL", lightingStatus: "FULL", activeConfig: "ARRIVALS_ONLY" },
  { id: "rwy-04r-jfk", airportId: "JFK", code: "04R/22L", headingDeg: 44, lengthMeters: 2560, status: "AVAILABLE", wind: "040/12kt", approachType: "CAT I ILS", surfaceCondition: "DRY", frictionMu: 0.70, ilsStatus: "OPERATIONAL", lightingStatus: "FULL", activeConfig: "DEPARTURES_ONLY" },
  { id: "rwy-13l-jfk", airportId: "JFK", code: "13L/31R", headingDeg: 134, lengthMeters: 4423, status: "AVAILABLE", wind: "040/12kt", approachType: "CAT II ILS", surfaceCondition: "DRY", frictionMu: 0.75, ilsStatus: "OPERATIONAL", lightingStatus: "FULL", activeConfig: "MIXED_MODE" },
  { id: "rwy-13r-jfk", airportId: "JFK", code: "13R/31L", headingDeg: 134, lengthMeters: 3048, status: "RESERVED", wind: "040/12kt", approachType: "RNAV (GPS)", surfaceCondition: "DRY", frictionMu: 0.69, ilsStatus: "OPERATIONAL", lightingStatus: "PARTIAL", activeConfig: "CLOSED" },
  { id: "rwy-27-bom", airportId: "BOM", code: "09/27", headingDeg: 274, lengthMeters: 3489, status: "AVAILABLE", wind: "260/14kt", approachType: "CAT II ILS", surfaceCondition: "WET", frictionMu: 0.61, ilsStatus: "OPERATIONAL", lightingStatus: "FULL", activeConfig: "MIXED_MODE" },
  { id: "rwy-14-bom", airportId: "BOM", code: "14/32", headingDeg: 142, lengthMeters: 2925, status: "AVAILABLE", wind: "260/14kt", approachType: "VOR/DME", surfaceCondition: "DAMP", frictionMu: 0.65, ilsStatus: "DEGRADED", lightingStatus: "FULL", activeConfig: "DEPARTURES_ONLY" },
  { id: "rwy-28-del", airportId: "DEL", code: "10/28", headingDeg: 281, lengthMeters: 3810, status: "OCCUPIED", wind: "290/06kt", approachType: "CAT IIIb ILS", surfaceCondition: "DRY", frictionMu: 0.78, ilsStatus: "OPERATIONAL", lightingStatus: "FULL", activeConfig: "ARRIVALS_ONLY" },
  { id: "rwy-29-del", airportId: "DEL", code: "11/29", headingDeg: 291, lengthMeters: 4430, status: "AVAILABLE", wind: "290/06kt", approachType: "CAT IIIb ILS", surfaceCondition: "DRY", frictionMu: 0.80, ilsStatus: "OPERATIONAL", lightingStatus: "FULL", activeConfig: "DEPARTURES_ONLY" },
  { id: "rwy-09l-blr", airportId: "BLR", code: "09L/27R", headingDeg: 93, lengthMeters: 4000, status: "AVAILABLE", wind: "090/09kt", approachType: "CAT I ILS", surfaceCondition: "DRY", frictionMu: 0.75, ilsStatus: "OPERATIONAL", lightingStatus: "FULL", activeConfig: "ARRIVALS_ONLY" },
  { id: "rwy-09r-blr", airportId: "BLR", code: "09R/27L", headingDeg: 93, lengthMeters: 4000, status: "AVAILABLE", wind: "090/09kt", approachType: "CAT IIIb ILS", surfaceCondition: "DRY", frictionMu: 0.77, ilsStatus: "OPERATIONAL", lightingStatus: "FULL", activeConfig: "DEPARTURES_ONLY" },
];

export function RunwaysSection({ activeStation = "HYD" }: { activeStation?: string }) {
  const [runways, setRunways] = useState<RunwayDTO[]>(DEFAULT_RUNWAYS);
  const [stationFilter, setStationFilter] = useState<string>(activeStation || "ALL");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notamModalOpen, setNotamModalOpen] = useState(false);
  const [notamText, setNotamText] = useState("");
  const [selectedRwyForNotam, setSelectedRwyForNotam] = useState<string>("");
  const [notamSuccess, setNotamSuccess] = useState<string | null>(null);

  // Sync station filter when activeStation prop changes
  useEffect(() => {
    if (activeStation && activeStation !== "ALL") {
      setStationFilter(activeStation);
    }
  }, [activeStation]);

  const loadRunways = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/resources?type=RUNWAY");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.runways) && data.runways.length > 0) {
          setRunways(data.runways);
        }
      }
    } catch (err) {
      console.warn("Failed to load runways from API, retaining cached data.", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRunways();
  }, [loadRunways]);

  const handleUpdateRunway = async (
    runwayId: string,
    updates: Partial<RunwayDTO>
  ) => {
    setSavingId(runwayId);
    // Optimistic update
    setRunways((prev) =>
      prev.map((r) => (r.id === runwayId ? { ...r, ...updates } : r))
    );

    try {
      const target = runways.find((r) => r.id === runwayId);
      if (!target) return;

      const res = await fetch("/api/resources", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceType: "RUNWAY",
          id: runwayId,
          code: target.code,
          status: updates.status,
          updates,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.warn("Server runway update returned error:", errorData);
      }
    } catch (err) {
      console.error("Failed to patch runway:", err);
    } finally {
      setSavingId(null);
    }
  };

  const handleIssueNotam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notamText.trim()) return;

    try {
      // Broadcast operational event for NOTAM
      await fetch("/api/operations/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "RESOURCE_CHANGE",
          severity: "WARNING",
          title: `AIRFIELD NOTAM: RWY ${selectedRwyForNotam || "ALL"}`,
          detail: notamText.trim(),
          payload: { runway: selectedRwyForNotam, station: stationFilter },
        }),
      });

      setNotamSuccess(`NOTAM successfully broadcast across aerodrome network.`);
      setTimeout(() => {
        setNotamSuccess(null);
        setNotamModalOpen(false);
        setNotamText("");
      }, 1600);
    } catch (err) {
      console.error("Failed to broadcast NOTAM:", err);
    }
  };

  const filtered = runways.filter((r) =>
    stationFilter === "ALL" ? true : r.airportId === stationFilter
  );

  const availableCount = filtered.filter((r) => r.status === "AVAILABLE").length;
  const occupiedCount = filtered.filter((r) => r.status === "OCCUPIED").length;
  const closedCount = filtered.filter((r) => r.status === "CLOSED").length;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="border-cyan-500/40 bg-cyan-950/30 text-cyan-300 font-mono text-[11px]">
              ICAO ANNEX 14 AERODROMES
            </Badge>
            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-950/30 text-emerald-300 font-mono text-[11px]">
              AIRFIELD CONTROL ACTIVE
            </Badge>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Navigation className="h-6 w-6 text-cyan-400" />
            Runway Infrastructure, Approaches & Friction Monitoring
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Direct operational control over surface friction (Mu), ILS Category readiness, runway lighting circuits, and NOTAM alerts.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={stationFilter}
            onChange={(e) => setStationFilter(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs font-mono font-semibold text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="ALL">All Stations (Network Wide)</option>
            <option value="HYD">HYD / VOHS (Hyderabad)</option>
            <option value="BOM">BOM / VABB (Mumbai)</option>
            <option value="DEL">DEL / VIDP (Delhi)</option>
            <option value="BLR">BLR / VOBL (Bengaluru)</option>
            <option value="JFK">JFK / KJFK (New York)</option>
          </select>

          <Button
            size="sm"
            variant="outline"
            className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 h-9 rounded-xl font-mono text-xs flex items-center gap-1.5"
            onClick={loadRunways}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 text-cyan-400 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-500 text-white h-9 rounded-xl font-mono text-xs shadow-lg shadow-amber-600/20 flex items-center gap-1.5"
            onClick={() => {
              setSelectedRwyForNotam(filtered[0]?.code || "");
              setNotamModalOpen(true);
            }}
          >
            <FileText className="h-3.5 w-3.5" />
            Issue NOTAM
          </Button>
        </div>
      </div>

      {/* Top Operational Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-slate-800 bg-slate-900/60 p-3">
          <CardHeader className="p-0 pb-1 flex flex-row items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Total Runways</span>
            <Layers className="h-3.5 w-3.5 text-cyan-400" />
          </CardHeader>
          <div className="text-xl font-bold font-mono text-white">{filtered.length}</div>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">Active airfield corridors</p>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 p-3">
          <CardHeader className="p-0 pb-1 flex flex-row items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Available / Open</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          </CardHeader>
          <div className="text-xl font-bold font-mono text-emerald-400">{availableCount}</div>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">Ready for arrival / departure</p>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 p-3">
          <CardHeader className="p-0 pb-1 flex flex-row items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Active Movements</span>
            <Navigation className="h-3.5 w-3.5 text-sky-400" />
          </CardHeader>
          <div className="text-xl font-bold font-mono text-sky-400">{occupiedCount}</div>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">Rollout / takeoff clearance</p>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 p-3">
          <CardHeader className="p-0 pb-1 flex flex-row items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Restricted / Closed</span>
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
          </CardHeader>
          <div className="text-xl font-bold font-mono text-amber-400">{closedCount}</div>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">Maintenance / inspection</p>
        </Card>
      </div>

      {/* Runway Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((rwy) => {
          const isAvail = rwy.status === "AVAILABLE";
          const isOcc = rwy.status === "OCCUPIED";
          const isClosed = rwy.status === "CLOSED";
          const isReserved = rwy.status === "RESERVED";
          const isSaving = savingId === rwy.id;

          const muVal = rwy.frictionMu ?? 0.75;
          const muRating = muVal >= 0.7 ? "GOOD" : muVal >= 0.5 ? "MEDIUM" : "POOR";
          const muColor = muVal >= 0.7 ? "text-emerald-400" : muVal >= 0.5 ? "text-amber-400" : "text-red-400";

          return (
            <Card
              key={rwy.id}
              className={`border-slate-800 bg-[#090e17]/90 transition-all ${
                isOcc
                  ? "border-sky-500/40 bg-sky-950/10 shadow-lg shadow-sky-950/20"
                  : isClosed
                  ? "border-red-500/40 bg-red-950/10"
                  : "hover:border-slate-700"
              }`}
            >
              <CardHeader className="pb-3 border-b border-slate-800/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-mono font-black text-white tracking-wider">
                      RWY {rwy.code}
                    </span>
                    <Badge variant="outline" className="font-mono text-xs border-slate-700 bg-slate-900 text-slate-300">
                      {rwy.airportId}
                    </Badge>
                  </div>
                  <Badge
                    variant={isAvail ? "default" : isOcc ? "warning" : "destructive"}
                    className={`text-xs font-mono font-semibold px-2 py-0.5 ${
                      isAvail
                        ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
                        : isOcc
                        ? "border-sky-500/40 bg-sky-950/40 text-sky-300"
                        : isClosed
                        ? "border-red-500/40 bg-red-950/40 text-red-300"
                        : "border-amber-500/40 bg-amber-950/40 text-amber-300"
                    }`}
                  >
                    {rwy.status}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-slate-400 font-mono flex items-center justify-between mt-1">
                  <span>{rwy.approachType || "CAT IIIb ILS"}</span>
                  <span className="text-cyan-400 font-semibold">{rwy.activeConfig || "MIXED_MODE"}</span>
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 text-xs pt-3">
                {/* Physical Specifications Matrix */}
                <div className="grid grid-cols-2 gap-2 text-slate-400 font-mono">
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                    <Compass className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-500">HEADING</div>
                      <div className="text-slate-200 font-bold">{rwy.headingDeg}° MAG</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                    <Gauge className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-500">TORA LENGTH</div>
                      <div className="text-slate-200 font-bold">{rwy.lengthMeters.toLocaleString()} M</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                    <Wind className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-500">SURFACE WIND</div>
                      <div className="text-slate-200 font-bold">{rwy.wind || "CALM"}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                    <Sliders className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-500">FRICTION (Mu)</div>
                      <div className={`font-bold ${muColor}`}>
                        {muVal.toFixed(2)} · {muRating}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Airfield Subsystem Status Badges */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/40 border border-slate-800/60 font-mono text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${rwy.ilsStatus === "DEGRADED" ? "bg-amber-400" : "bg-emerald-400"}`} />
                    <span className="text-slate-300">ILS: {rwy.ilsStatus || "OPERATIONAL"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <SunMedium className="h-3 w-3 text-amber-400" />
                    <span className="text-slate-300">AGL: {rwy.lightingStatus || "FULL"}</span>
                  </div>
                  <div className="text-slate-400">
                    SURFACE: <span className="text-white font-semibold">{rwy.surfaceCondition || "DRY"}</span>
                  </div>
                </div>

                {/* Real-time State Override Toolbar */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px] font-mono">Airfield State:</span>
                    <select
                      value={rwy.status}
                      disabled={isSaving}
                      onChange={(e) =>
                        handleUpdateRunway(rwy.id, {
                          status: e.target.value as ResourceStatus,
                        })
                      }
                      className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] font-mono font-semibold text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    >
                      <option value="AVAILABLE">AVAILABLE (Open)</option>
                      <option value="OCCUPIED">OCCUPIED (Active)</option>
                      <option value="RESERVED">RESERVED (Approach Inbound)</option>
                      <option value="CLOSED">CLOSED (Hazard/Maintenance)</option>
                      <option value="MAINTENANCE">MAINTENANCE (Sweeper/FOD)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px] font-mono">Runway Flow:</span>
                    <select
                      value={rwy.activeConfig || "MIXED_MODE"}
                      disabled={isSaving}
                      onChange={(e) =>
                        handleUpdateRunway(rwy.id, {
                          activeConfig: e.target.value as RunwayDTO["activeConfig"],
                        })
                      }
                      className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] font-mono text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    >
                      <option value="MIXED_MODE">Mixed Mode (Arr + Dep)</option>
                      <option value="ARRIVALS_ONLY">Arrivals Only</option>
                      <option value="DEPARTURES_ONLY">Departures Only</option>
                      <option value="CLOSED">Closed to Operations</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* NOTAM Broadcast Modal */}
      {notamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg border-amber-500/40 bg-slate-900 shadow-2xl text-slate-100">
            <CardHeader className="border-b border-slate-800 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <ShieldAlert className="h-5 w-5" />
                  <span>Issue Airfield Notice to Air Missions (NOTAM)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNotamModalOpen(false)}
                  className="text-slate-400 hover:text-white font-mono text-sm"
                >
                  ✕
                </button>
              </div>
              <CardDescription className="text-xs text-slate-400 font-mono mt-1">
                Dispatches an authoritative security & operations advisory to all tower, pilot, and dispatch consoles.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleIssueNotam}>
              <CardContent className="pt-4 space-y-4">
                {notamSuccess && (
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs font-mono text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{notamSuccess}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1.5">
                    Target Runway / Airfield Sector
                  </label>
                  <select
                    value={selectedRwyForNotam}
                    onChange={(e) => setSelectedRwyForNotam(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-xs font-mono text-slate-200"
                  >
                    <option value="ALL">Entire Aerodrome (All Runways)</option>
                    {filtered.map((r) => (
                      <option key={r.id} value={r.code}>
                        RWY {r.code} ({r.airportId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1.5">
                    Advisory Content / Action Required
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={notamText}
                    onChange={(e) => setNotamText(e.target.value)}
                    placeholder="e.g. RWY 09R/27L CLOSED FOR SURFACE FRICTION TESTING AND RUBBER REMOVAL BETWEEN 1200Z AND 1430Z. CAUTION BRAKING ACTION REPORTED MEDIUM TO POOR ON TAXIWAYS."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </CardContent>

              <div className="p-4 border-t border-slate-800 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-700 bg-slate-800 text-slate-300 h-9 rounded-xl font-mono text-xs"
                  onClick={() => setNotamModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-500 text-white h-9 rounded-xl font-mono text-xs shadow-lg shadow-amber-600/20 flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  Broadcast NOTAM
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
