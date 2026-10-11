"use client";

import { useState, useEffect } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Copy,
  FileCheck,
  FileText,
  Navigation,
  Plane,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Ticket,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { IcaoFlightPlanDTO } from "@/lib/domain";

export function FlightPlanSection() {
  const [flightPlans, setFlightPlans] = useState<IcaoFlightPlanDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Form State - Default: Hyderabad (VOHS) to Mumbai (VABB)
  const [callsign, setCallsign] = useState("SC101");
  const [flightRules, setFlightRules] = useState<"I" | "V">("I");
  const [flightType, setFlightType] = useState<"S" | "N" | "G">("S");
  const [aircraftType, setAircraftType] = useState("A320");
  const [wakeTurbulence, setWakeTurbulence] = useState<"L" | "M" | "H" | "J">("M");
  const [equipment, setEquipment] = useState("SDFGHIJ1RVW/LB1");
  const [depAirport, setDepAirport] = useState("VOHS");
  const [eobt, setEobt] = useState("0930Z");
  const [cruisingSpeed, setCruisingSpeed] = useState("N0440");
  const [cruisingLevel, setCruisingLevel] = useState("F320");
  const [route, setRoute] = useState("OPAMO W20 BADGR SURAT");
  const [destAirport, setDestAirport] = useState("VABB");
  const [totalEet, setTotalEet] = useState("0130");
  const [altAirport, setAltAirport] = useState("VOBL");
  const [remarks, setRemarks] = useState("PBN/A1B1C1D1 DOF/260921 REG/VT-SC1");

  const refetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/flight-plans");
      if (res.ok) {
        const data = await res.json();
        setFlightPlans(data.flightPlans || []);
      }
    } catch {
      // Ignore fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch("/api/flight-plans")
      .then((res) => res.json())
      .then((data) => {
        if (active && data.flightPlans) setFlightPlans(data.flightPlans);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Quick Preset Handlers (Domestic Routes)
  const applyPreset = (preset: "HYD_BOM" | "HYD_DEL" | "HYD_BLR") => {
    if (preset === "HYD_BOM") {
      setCallsign("SC101");
      setAircraftType("A320");
      setWakeTurbulence("M");
      setDepAirport("VOHS");
      setDestAirport("VABB");
      setAltAirport("VOBL");
      setCruisingLevel("F320");
      setCruisingSpeed("N0440");
      setTotalEet("0115");
      setRoute("OPAMO W20 BADGR SURAT");
    } else if (preset === "HYD_DEL") {
      setCallsign("AV202");
      setAircraftType("B738");
      setWakeTurbulence("M");
      setDepAirport("VOHS");
      setDestAirport("VIDP");
      setAltAirport("VIJP");
      setCruisingLevel("F340");
      setCruisingSpeed("N0450");
      setTotalEet("0210");
      setRoute("NNP J12 BBB J13 DPN");
    } else if (preset === "HYD_BLR") {
      setCallsign("BH305");
      setAircraftType("A320");
      setWakeTurbulence("M");
      setDepAirport("VOHS");
      setDestAirport("VOBL");
      setAltAirport("VOMM");
      setCruisingLevel("F280");
      setCruisingSpeed("N0430");
      setTotalEet("0100");
      setRoute("DEDSA W13 KAGDO");
    }
  };

  // Raw ICAO Formatted Telegraphic Message
  const icaoTelegraphic = `(FPL-${callsign}-${flightRules}${flightType}
-${aircraftType}/${wakeTurbulence}-${equipment}
-${depAirport}${eobt}
-${cruisingSpeed}${cruisingLevel} ${route}
-${destAirport}${totalEet} ${altAirport}
-${remarks})`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/flight-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callsign,
          flightRules,
          flightType,
          aircraftType,
          wakeTurbulence,
          equipment,
          departureAirport: depAirport,
          eobt,
          cruisingSpeed,
          cruisingLevel,
          route,
          destinationAirport: destAirport,
          totalEet,
          alternateAirport: altAirport,
          remarks,
        }),
      });

      if (res.ok) {
        setNotification(`ICAO Flight Plan for ${callsign} filed successfully into ATC strip bay!`);
        void refetchPlans();
        setTimeout(() => setNotification(null), 4000);
      }
    } catch {
      // Fallback
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch("/api/flight-plans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        void refetchPlans();
      }
    } catch {
      // Fallback
    }
  };

  return (
    <div className="space-y-6 font-mono">
      {/* Header */}
      <Card className="border border-slate-800 bg-slate-900/80 backdrop-blur">
        <CardHeader className="p-4 border-b border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold text-white tracking-wide">
                  ICAO DOC 4444 FLIGHT PLAN (FPL) DISPATCH
                </CardTitle>
                <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[10px]">
                  IFR &bull; EUROCONTROL &bull; FAA NAS
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-400">
                File standardized international flight plans and push directly to the ATC Electronic Flight Progress Strip (FPS) bay.
              </CardDescription>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-slate-400 mr-1">PRESETS:</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => applyPreset("HYD_BOM")}
              className="h-6 text-[10px] border-slate-700 text-slate-300"
            >
              HYD &rarr; BOM (Mumbai)
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => applyPreset("HYD_DEL")}
              className="h-6 text-[10px] border-slate-700 text-slate-300"
            >
              HYD &rarr; DEL (Delhi)
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => applyPreset("HYD_BLR")}
              className="h-6 text-[10px] border-slate-700 text-slate-300"
            >
              HYD &rarr; BLR (Bengaluru)
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          {notification && (
            <div className="mb-4 p-3 rounded-xl border border-emerald-500/50 bg-emerald-950/60 text-emerald-300 text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              {notification}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              {/* Item 7 & 8 */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  ITEM 7: AIRCRAFT ID / CALLSIGN
                </label>
                <Input
                  value={callsign}
                  onChange={(e) => setCallsign(e.target.value.toUpperCase())}
                  placeholder="SC101"
                  required
                  className="bg-slate-950 border-slate-800 text-cyan-300 font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  ITEM 8: FLIGHT RULES
                </label>
                <select
                  value={flightRules}
                  onChange={(e) => setFlightRules(e.target.value as "I" | "V")}
                  aria-label="Item 8: Flight Rules"
                  className="w-full h-9 bg-slate-950 border border-slate-800 rounded-md px-3 text-xs text-slate-200"
                >
                  <option value="I">I &bull; Instrument Flight Rules (IFR)</option>
                  <option value="V">V &bull; Visual Flight Rules (VFR)</option>
                </select>
              </div>

              {/* Item 9 */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  ITEM 9: AIRCRAFT TYPE
                </label>
                <Input
                  value={aircraftType}
                  onChange={(e) => setAircraftType(e.target.value.toUpperCase())}
                  placeholder="B789"
                  required
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  ITEM 9: WAKE TURBULENCE
                </label>
                <select
                  value={wakeTurbulence}
                  onChange={(e) => setWakeTurbulence(e.target.value as "L" | "M" | "H" | "J")}
                  aria-label="Item 9: Wake Turbulence Category"
                  className="w-full h-9 bg-slate-950 border border-slate-800 rounded-md px-3 text-xs text-slate-200"
                >
                  <option value="H">H &bull; Heavy (&gt; 136,000 kg)</option>
                  <option value="M">M &bull; Medium (7,000 - 136,000 kg)</option>
                  <option value="L">L &bull; Light (&lt; 7,000 kg)</option>
                  <option value="J">J &bull; Super (A380-800)</option>
                </select>
              </div>

              {/* Item 13 */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  ITEM 13: DEPARTURE AERODROME
                </label>
                <Input
                  value={depAirport}
                  onChange={(e) => setDepAirport(e.target.value.toUpperCase())}
                  placeholder="KJFK"
                  maxLength={4}
                  required
                  className="bg-slate-950 border-slate-800 text-emerald-400 font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  ITEM 13: EOBT (EST. OFF-BLOCK)
                </label>
                <Input
                  value={eobt}
                  onChange={(e) => setEobt(e.target.value.toUpperCase())}
                  placeholder="1430Z"
                  className="bg-slate-950 border-slate-800 text-slate-200"
                />
              </div>

              {/* Item 15 Speed & FL */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  ITEM 15: CRUISING SPEED
                </label>
                <Input
                  value={cruisingSpeed}
                  onChange={(e) => setCruisingSpeed(e.target.value.toUpperCase())}
                  placeholder="N0485"
                  className="bg-slate-950 border-slate-800 text-slate-200"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  ITEM 15: INITIAL LEVEL
                </label>
                <Input
                  value={cruisingLevel}
                  onChange={(e) => setCruisingLevel(e.target.value.toUpperCase())}
                  placeholder="F370"
                  className="bg-slate-950 border-slate-800 text-fuchsia-400 font-bold"
                />
              </div>
            </div>

            {/* Item 15 Route */}
            <div className="text-xs">
              <label className="text-[10px] text-slate-400 block mb-1">
                ITEM 15: NAVIGATIONAL ROUTE (WAYPOINTS, AIRWAYS, SIDS & STARS)
              </label>
              <Input
                value={route}
                onChange={(e) => setRoute(e.target.value.toUpperCase())}
                placeholder="MERIT DCT PUT DCT BOSTN N124B COLOR"
                required
                className="bg-slate-950 border-slate-800 text-cyan-200 font-mono"
              />
            </div>

            {/* Item 16 Destination & Alternates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  ITEM 16: DESTINATION AERODROME
                </label>
                <Input
                  value={destAirport}
                  onChange={(e) => setDestAirport(e.target.value.toUpperCase())}
                  placeholder="EGLL"
                  maxLength={4}
                  required
                  className="bg-slate-950 border-slate-800 text-emerald-400 font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  ITEM 16: TOTAL EET (HHMM)
                </label>
                <Input
                  value={totalEet}
                  onChange={(e) => setTotalEet(e.target.value)}
                  placeholder="0615"
                  className="bg-slate-950 border-slate-800 text-slate-200"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  ITEM 16: ALTERNATE AERODROME
                </label>
                <Input
                  value={altAirport}
                  onChange={(e) => setAltAirport(e.target.value.toUpperCase())}
                  placeholder="EGKK"
                  maxLength={4}
                  className="bg-slate-950 border-slate-800 text-slate-200"
                />
              </div>
            </div>

            {/* ICAO Standard Telegraphic Output Preview Box */}
            <div className="p-3 rounded-xl bg-black/80 border border-slate-800 text-[11px] text-slate-300 font-mono">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span>ICAO DOC 4444 TELEGRAPHIC FORMAT</span>
                <span className="text-[10px] text-cyan-400">READY FOR AFTN TRANSMISSION</span>
              </div>
              <pre className="text-emerald-400 select-all leading-relaxed whitespace-pre-wrap">
                {icaoTelegraphic}
              </pre>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="submit"
                disabled={submitting}
                className="h-9 px-6 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                {submitting ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <Send className="h-4 w-4 mr-1.5" />
                )}
                {submitting ? "Transmitting..." : "Transmit & File ICAO Flight Plan"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Active Electronic Flight Progress Strip (FPS) Bay */}
      <Card className="border border-slate-800 bg-slate-900/80 backdrop-blur">
        <CardHeader className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ticket className="h-4 w-4 text-emerald-400" />
            <CardTitle className="text-sm font-bold text-white">
              ATC ELECTRONIC FLIGHT PROGRESS STRIP (FPS) BAY
            </CardTitle>
          </div>
          <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-xs">
            {flightPlans.length} FILED STRIPS
          </Badge>
        </CardHeader>

        <CardContent className="p-4 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-2 font-medium">CALLSIGN</th>
                <th className="pb-2 font-medium">TYPE</th>
                <th className="pb-2 font-medium">DEP &rarr; DEST</th>
                <th className="pb-2 font-medium">CRUISE FL</th>
                <th className="pb-2 font-medium">ROUTING</th>
                <th className="pb-2 font-medium">STATUS</th>
                <th className="pb-2 font-medium text-right">STRIP ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {flightPlans.map((plan) => (
                <tr key={plan.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 font-bold text-cyan-300">{plan.callsign}</td>
                  <td className="py-3 text-slate-300">
                    {plan.aircraftType} ({plan.wakeTurbulence})
                  </td>
                  <td className="py-3">
                    <span className="text-white font-bold">{plan.departureAirport}</span>
                    <span className="text-slate-500 mx-1.5">&rarr;</span>
                    <span className="text-white font-bold">{plan.destinationAirport}</span>
                  </td>
                  <td className="py-3 text-fuchsia-400 font-bold">{plan.cruisingLevel}</td>
                  <td className="py-3 text-slate-400 max-w-xs truncate">{plan.route}</td>
                  <td className="py-3">
                    <Badge
                      className={`text-[9px] font-bold ${
                        plan.status === "CLEARED"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : plan.status === "ACCEPTED"
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                          : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      }`}
                    >
                      {plan.status}
                    </Badge>
                  </td>
                  <td className="py-3 text-right space-x-2">
                    {plan.status !== "CLEARED" && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(plan.id, "CLEARED")}
                        className="h-6 px-2.5 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                      >
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Issue ATC Clearance
                      </Button>
                    )}
                    {plan.status === "CLEARED" && (
                      <span className="text-[10px] text-emerald-400 flex items-center justify-end gap-1 font-bold">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Cleared for Pushback
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
