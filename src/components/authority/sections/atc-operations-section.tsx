"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { useOperationalPolling } from "@/lib/hooks/use-operational-polling";
import {
  AlertTriangle,
  Compass,
  ExternalLink,
  Gauge,
  Navigation,
  Plane,
  Radio,
  RefreshCw,
  Send,
  ShieldAlert,
  TowerControl,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { FlightDTO } from "@/lib/domain";

const FlightMap = dynamic(
  () => import("@/components/maps/flight-map").then((mod) => mod.FlightMap),
  {
    ssr: false,
    loading: () => (
      <div className="grid min-h-[440px] place-items-center rounded-lg border border-border bg-muted/40 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          Loading Leaflet radar scope...
        </div>
      </div>
    ),
  }
);

export function AtcOperationsSection({
  onOpenConsole,
}: {
  onOpenConsole?: () => void;
}) {
  const [flights, setFlights] = useState<FlightDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<FlightDTO | null>(null);

  // Clearance command state
  const [altInput, setAltInput] = useState("");
  const [hdgInput, setHdgInput] = useState("");
  const [spdInput, setSpdInput] = useState("");
  const [squawkInput, setSquawkInput] = useState("");
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null);

  const fetchFlights = useCallback(async () => {
    try {
      const res = await fetch("/api/flights");
      if (!res.ok) return;
      const data = await res.json();
      const list = (data.flights || []) as FlightDTO[];
      setFlights(list);
      if (list.length > 0) {
        setSelectedFlight((prev) => prev || list[0]);
      }
    } catch {
      //
    }
  }, []);

  useOperationalPolling(fetchFlights, 4000);

  const handleSelectFlight = (flight: FlightDTO) => {
    setSelectedFlight(flight);
    setAltInput(flight.altitudeFt.toString());
    setHdgInput(flight.headingDeg.toString());
    setSpdInput(flight.speedKt.toString());
    setSquawkInput(flight.squawk || "1200");
  };

  const handleIssueClearance = async () => {
    if (!selectedFlight) return;
    setLoading(true);

    try {
      // Patch flight via API
      await fetch(`/api/flights/${selectedFlight.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          altitudeFt: altInput ? parseInt(altInput, 10) : undefined,
          headingDeg: hdgInput ? parseInt(hdgInput, 10) : undefined,
          speedKts: spdInput ? parseInt(spdInput, 10) : undefined,
          squawk: squawkInput || undefined,
        }),
      });

      setCommandFeedback(
        `ATC Clearance transmitted to ${selectedFlight.callsign}: FL${Math.round(
          parseInt(altInput || "0") / 100
        )}, Heading ${hdgInput}°, Speed ${spdInput}kt.`
      );
      setTimeout(() => setCommandFeedback(null), 5000);
      fetchFlights();
    } catch {
      setCommandFeedback("Failed to transmit clearance over radio frequency.");
    } finally {
      setLoading(false);
    }
  };

  const emergencyFlights = flights.filter(
    (f) => f.status === "EMERGENCY" || f.squawk === "7700" || f.squawk === "7600"
  );

  return (
    <div className="space-y-6">
      {/* Title & Quick Switch to full ATC console */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <TowerControl className="h-6 w-6 text-primary" />
            Air Traffic Control Operations (AOCC Tower & TRACON)
          </h2>
          <p className="text-sm text-muted-foreground">
            Live primary & secondary radar tracks, flight progress strips, vectors, and direct tactical clearances.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onOpenConsole && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenConsole}
              className="border-primary/40 text-primary hover:bg-primary/10"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Launch Dedicated ATC Console
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={fetchFlights}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh Radar
          </Button>
        </div>
      </div>

      {/* Emergency alert bar if any active */}
      {emergencyFlights.length > 0 && (
        <div className="p-4 rounded-lg bg-red-950/30 border border-red-500/60 text-red-300 flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
            <span className="text-sm font-bold">
              ALERT: {emergencyFlights.length} AIRCRAFT SQUAWKING EMERGENCY (
              {emergencyFlights.map((f) => f.callsign).join(", ")})
            </span>
          </div>
          <Badge variant="destructive">PRIORITY HANDLING ACTIVE</Badge>
        </div>
      )}

      {commandFeedback && (
        <div className="p-3 rounded bg-emerald-950/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
          <Radio className="h-4 w-4 text-emerald-400 shrink-0" />
          {commandFeedback}
        </div>
      )}

      {/* Radar Map & Tactical Clearance Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaflet Map */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border/60 bg-card overflow-hidden">
            <CardHeader className="py-3 px-4 border-b border-border/50 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Navigation className="h-4 w-4 text-primary" />
                Airfield & Sector Radar Display (KJFK Center)
              </CardTitle>
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                SWEEP 3.0s &bull; {flights.length} CONTACTS
              </div>
            </CardHeader>
            <CardContent className="p-0 h-[480px]">
              <FlightMap flights={flights} />
            </CardContent>
          </Card>

          {/* Quick Strips Table */}
          <div className="rounded-md border border-border bg-card overflow-hidden">
            <div className="p-3 border-b border-border/50 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Active Flight Progress Strips
              </span>
              <span className="text-xs font-mono text-muted-foreground">{flights.length} Total</span>
            </div>
            <div className="overflow-x-auto max-h-56">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-muted/60 text-[11px] text-muted-foreground uppercase border-b border-border sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Callsign</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Squawk</th>
                    <th className="py-2 px-3">Alt (ft)</th>
                    <th className="py-2 px-3">Spd (kts)</th>
                    <th className="py-2 px-3">Hdg</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3 text-right">Select</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {flights.map((f) => {
                    const isSelected = selectedFlight?.id === f.id;
                    return (
                      <tr
                        key={f.id}
                        onClick={() => handleSelectFlight(f)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? "bg-primary/15 font-semibold" : "hover:bg-muted/40"
                        }`}
                      >
                        <td className="py-2 px-3 text-foreground flex items-center gap-1.5">
                          <Plane className="h-3 w-3 text-primary" />
                          {f.callsign}
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">{f.aircraftType || f.aircraftId || "B738"}</td>
                        <td className="py-2 px-3 text-primary">{f.squawk || "1200"}</td>
                        <td className="py-2 px-3 text-foreground">{f.altitudeFt}</td>
                        <td className="py-2 px-3 text-foreground">{f.speedKt}</td>
                        <td className="py-2 px-3 text-foreground">{f.headingDeg}°</td>
                        <td className="py-2 px-3">
                          <Badge
                            variant={f.status === "EMERGENCY" ? "destructive" : "outline"}
                            className="text-[10px] px-1 py-0"
                          >
                            {f.status}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <Button
                            size="sm"
                            variant={isSelected ? "default" : "ghost"}
                            className="h-5 px-2 text-[10px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectFlight(f);
                            }}
                          >
                            Track
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Tactical Control Clearance Panel */}
        <div className="space-y-4">
          <Card className="border-border/60 bg-card/80 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-primary" />
                  Tactical Clearance Transceiver
                </span>
                {selectedFlight && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {selectedFlight.callsign}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                Issue radio clearances and squawk transponder codes directly to aircraft FMC.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedFlight ? (
                <>
                  <div className="p-3 rounded bg-muted/40 border border-border/50 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">ROUTE</span>
                      <span className="font-semibold text-foreground">
                        {selectedFlight.origin} &rarr; {selectedFlight.destination}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">FLIGHT PHASE</span>
                      <span className="font-semibold text-primary">{selectedFlight.status}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">CURRENT ALT</span>
                      <span className="font-mono text-foreground">{selectedFlight.altitudeFt} FT</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">CURRENT HDG</span>
                      <span className="font-mono text-foreground">{selectedFlight.headingDeg}°</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Gauge className="h-3.5 w-3.5 text-primary" />
                        Assigned Altitude (Feet)
                      </label>
                      <Input
                        type="number"
                        placeholder="e.g. 10000"
                        value={altInput}
                        onChange={(e) => setAltInput(e.target.value)}
                        className="font-mono text-sm bg-background"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Compass className="h-3.5 w-3.5 text-primary" />
                        Vector Heading (Degrees)
                      </label>
                      <Input
                        type="number"
                        placeholder="e.g. 240"
                        value={hdgInput}
                        onChange={(e) => setHdgInput(e.target.value)}
                        className="font-mono text-sm bg-background"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Plane className="h-3.5 w-3.5 text-primary" />
                        Target Speed (Knots IAS)
                      </label>
                      <Input
                        type="number"
                        placeholder="e.g. 250"
                        value={spdInput}
                        onChange={(e) => setSpdInput(e.target.value)}
                        className="font-mono text-sm bg-background"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <ShieldAlert className="h-3.5 w-3.5 text-primary" />
                        Transponder Squawk Code
                      </label>
                      <Input
                        placeholder="e.g. 4721 or 7700"
                        value={squawkInput}
                        onChange={(e) => setSquawkInput(e.target.value)}
                        className="font-mono text-sm bg-background"
                      />
                    </div>

                    <Button
                      className="w-full font-semibold mt-2"
                      onClick={handleIssueClearance}
                      disabled={loading}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Transmit Clearance
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  Select a flight from the radar strips to issue clearance.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
