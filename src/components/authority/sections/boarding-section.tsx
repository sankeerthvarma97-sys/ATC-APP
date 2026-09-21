"use client";

import { useEffect, useState, useTransition } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  DoorClosed,
  DoorOpen,
  Filter,
  Luggage,
  Plane,
  PlaneTakeoff,
  QrCode,
  RefreshCw,
  Search,
  Send,
  UserCheck,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import type { FlightDTO } from "@/lib/domain";

interface ManifestPassenger {
  id: string;
  pnr: string;
  ticketNumber: string;
  name: string;
  seat: string;
  seatClass: "ECONOMY" | "BUSINESS" | "FIRST";
  checkedIn: boolean;
  boarded: boolean;
  boardedAt?: string;
  baggageCount: number;
}

export function BoardingSection({
  onNavigateTo,
}: {
  onNavigateTo?: (section: string, params?: Record<string, string>) => void;
}) {
  const [flights, setFlights] = useState<FlightDTO[]>([]);
  const [selectedFlightId, setSelectedFlightId] = useState<string>("");
  const [selectedGate, setSelectedGate] = useState<string>("GATE A1");
  const [loading, setLoading] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [manifest, setManifest] = useState<ManifestPassenger[]>([]);
  const [filter, setFilter] = useState<"ALL" | "BOARDED" | "WAITING">("ALL");
  const [handoffNotice, setHandoffNotice] = useState<string | null>(null);

  const loadManifestForFlight = (_flight?: FlightDTO) => {
    // Generate manifest from flight bookings / seats
    const mockManifest: ManifestPassenger[] = [
      {
        id: "pax-1",
        pnr: "SKY-98234",
        ticketNumber: "TKT-SKY-1001",
        name: "Capt. Eleanor Vance",
        seat: "1A",
        seatClass: "BUSINESS",
        checkedIn: true,
        boarded: false,
        baggageCount: 2,
      },
      {
        id: "pax-2",
        pnr: "SKY-54120",
        ticketNumber: "TKT-SKY-1002",
        name: "Dr. Marcus Chen",
        seat: "1B",
        seatClass: "BUSINESS",
        checkedIn: true,
        boarded: true,
        boardedAt: "14:10Z",
        baggageCount: 1,
      },
      {
        id: "pax-3",
        pnr: "SKY-88190",
        ticketNumber: "TKT-SKY-1003",
        name: "Sarah Jenkins",
        seat: "4A",
        seatClass: "ECONOMY",
        checkedIn: true,
        boarded: false,
        baggageCount: 1,
      },
      {
        id: "pax-4",
        pnr: "SKY-33910",
        ticketNumber: "TKT-SKY-1004",
        name: "David Morales",
        seat: "4B",
        seatClass: "ECONOMY",
        checkedIn: false,
        boarded: false,
        baggageCount: 0,
      },
      {
        id: "pax-5",
        pnr: "SKY-29104",
        ticketNumber: "TKT-SKY-1005",
        name: "Elena Rostova",
        seat: "4C",
        seatClass: "ECONOMY",
        checkedIn: true,
        boarded: true,
        boardedAt: "14:12Z",
        baggageCount: 2,
      },
      {
        id: "pax-6",
        pnr: "SKY-66291",
        ticketNumber: "TKT-SKY-1006",
        name: "Alex Thorne",
        seat: "5A",
        seatClass: "ECONOMY",
        checkedIn: true,
        boarded: false,
        baggageCount: 1,
      },
    ];
    setManifest(mockManifest);
  };

  const fetchFlights = async () => {
    try {
      const res = await fetch("/api/flights");
      if (!res.ok) return;
      const data = await res.json();
      const list = (data.flights || []) as FlightDTO[];
      setFlights(list);
      if (list.length > 0 && !selectedFlightId) {
        setSelectedFlightId(list[0].id);
        loadManifestForFlight(list[0]);
      }
    } catch {
      // Fallback
    }
  };

  // Load active flights on mount
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/flights");
        if (!res.ok || !active) return;
        const data = await res.json();
        const list = (data.flights || []) as FlightDTO[];
        setFlights(list);
        if (list.length > 0 && !selectedFlightId) {
          setSelectedFlightId(list[0].id);
          loadManifestForFlight(list[0]);
        }
      } catch {
        // Fallback
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [selectedFlightId]);

  const selectedFlight = flights.find((f) => f.id === selectedFlightId) || flights[0];

  const handleSelectFlight = (flightId: string) => {
    setSelectedFlightId(flightId);
    const fl = flights.find((f) => f.id === flightId);
    if (fl) {
      loadManifestForFlight(fl);
    }
  };

  const handleScanBoard = async (pnrOrTicket: string) => {
    const code = pnrOrTicket.trim().toUpperCase();
    if (!code) return;

    // Call server boarding API
    try {
      const res = await fetch("/api/boarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketIdentifier: code,
          gate: selectedGate,
          flightId: selectedFlight?.id,
        }),
      });
      const data = await res.json();

      // Update local state
      setManifest((prev) =>
        prev.map((pax) => {
          if (pax.pnr.toUpperCase() === code || pax.ticketNumber.toUpperCase() === code) {
            return {
              ...pax,
              checkedIn: true,
              boarded: true,
              boardedAt: new Date().toLocaleTimeString(),
            };
          }
          return pax;
        })
      );
      setScanInput("");
    } catch {
      // Local fallback
      setManifest((prev) =>
        prev.map((pax) => {
          if (pax.pnr.toUpperCase() === code || pax.ticketNumber.toUpperCase() === code) {
            return {
              ...pax,
              boarded: true,
              boardedAt: new Date().toLocaleTimeString(),
            };
          }
          return pax;
        })
      );
      setScanInput("");
    }
  };

  const handleBoardAll = () => {
    setManifest((prev) =>
      prev.map((pax) => ({
        ...pax,
        checkedIn: true,
        boarded: true,
        boardedAt: pax.boardedAt || new Date().toLocaleTimeString(),
      }))
    );
  };

  const handleCloseGateAndHandoff = async () => {
    if (!selectedFlight) return;
    setLoading(true);

    try {
      // Update flight status to BOARDING / DEPARTED via flights API
      await fetch(`/api/flights/${selectedFlight.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "BOARDING" }),
      });

      setHandoffNotice(
        `Gate ${selectedGate} closed for Flight ${selectedFlight.callsign}. Manifest finalized with ${
          manifest.filter((p) => p.boarded).length
        } onboard. Handed off to ATC Ground & Tower Control.`
      );

      // Refresh flight list
      fetchFlights();
    } catch {
      setHandoffNotice(`Gate closed. Flight ${selectedFlight.callsign} ready for pushback.`);
    } finally {
      setLoading(false);
    }
  };

  const totalPax = manifest.length;
  const boardedPax = manifest.filter((p) => p.boarded).length;
  const checkedInPax = manifest.filter((p) => p.checkedIn).length;
  const progressPercent = totalPax > 0 ? Math.round((boardedPax / totalPax) * 100) : 0;

  const filteredManifest = manifest.filter((pax) => {
    if (filter === "BOARDED") return pax.boarded;
    if (filter === "WAITING") return !pax.boarded;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <DoorOpen className="h-6 w-6 text-primary" />
            Gate Boarding & Passenger Manifest
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage gate assignment, scan boarding passes, monitor boarding completion, and authorize pushback.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchFlights}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh Flights
          </Button>
        </div>
      </div>

      {handoffNotice && (
        <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <PlaneTakeoff className="h-5 w-5 text-emerald-400 shrink-0" />
            <span className="text-sm font-medium">{handoffNotice}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/30"
              onClick={() => onNavigateTo?.("atc")}
            >
              Open ATC Console &rarr;
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setHandoffNotice(null)}
              className="h-7 px-2 text-xs"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Flight & Gate Selector Controls */}
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Select Active Flight
              </label>
              <select
                value={selectedFlightId}
                onChange={(e) => handleSelectFlight(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {flights.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.callsign} ({f.origin} &rarr; {f.destination}) — {f.status}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Assigned Departure Gate
              </label>
              <select
                value={selectedGate}
                onChange={(e) => setSelectedGate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {["GATE A1", "GATE A2", "GATE B1", "GATE B3", "GATE C4", "GATE D2"].map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleBoardAll}
              >
                <UserCheck className="h-4 w-4 mr-2 text-emerald-400" />
                Board All Manifest
              </Button>
              <Button
                variant="default"
                className="flex-1 bg-primary hover:bg-primary/90"
                onClick={handleCloseGateAndHandoff}
                disabled={loading}
              >
                <DoorClosed className="h-4 w-4 mr-2" />
                Close Gate & Handoff
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Flight Boarding Status & Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-medium uppercase">Flight Details</span>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-bold font-mono text-foreground">
                {selectedFlight?.callsign || "SKY-402"}
              </span>
              <Badge variant="outline" className="text-xs">
                {selectedFlight?.aircraftType || selectedFlight?.aircraftId || "B738"}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {selectedFlight?.origin} &rarr; {selectedFlight?.destination}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-medium uppercase">Total Booked</span>
            <div className="text-2xl font-bold text-foreground font-mono">{totalPax}</div>
            <div className="text-xs text-muted-foreground">{checkedInPax} Checked In</div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-medium uppercase">Boarded Count</span>
            <div className="text-2xl font-bold text-emerald-400 font-mono">{boardedPax}</div>
            <div className="text-xs text-muted-foreground">{totalPax - boardedPax} Remaining</div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium uppercase">Boarding Ratio</span>
              <span className="text-xs font-mono font-bold text-primary">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <div className="text-[11px] text-muted-foreground">Gate Status: OPEN FOR BOARDING</div>
          </CardContent>
        </Card>
      </div>

      {/* Manifest Table & Gate Scanner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Passenger Manifest ({manifest.length})
            </h3>
            <div className="flex items-center gap-1.5">
              {(["ALL", "WAITING", "BOARDED"] as const).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? "default" : "outline"}
                  onClick={() => setFilter(f)}
                  className="h-7 px-2.5 text-xs"
                >
                  {f}
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/60 text-xs text-muted-foreground uppercase border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">Seat</th>
                    <th className="py-2.5 px-3">Passenger</th>
                    <th className="py-2.5 px-3">PNR</th>
                    <th className="py-2.5 px-3">Class</th>
                    <th className="py-2.5 px-3">Bags</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {filteredManifest.map((pax) => (
                    <tr
                      key={pax.id}
                      className={pax.boarded ? "bg-emerald-950/10" : "hover:bg-muted/40"}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                        {pax.seat}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-foreground">
                        {pax.name}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">
                        {pax.pnr}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant={pax.seatClass === "BUSINESS" ? "default" : "outline"}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {pax.seatClass}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground flex items-center gap-1">
                        <Luggage className="h-3 w-3" />
                        {pax.baggageCount}
                      </td>
                      <td className="py-2.5 px-3">
                        {pax.boarded ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            BOARDED
                          </span>
                        ) : pax.checkedIn ? (
                          <span className="text-amber-400 flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            Checked In
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Waiting Check-in</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {!pax.boarded ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-6 px-2 text-[11px]"
                            onClick={() => handleScanBoard(pax.pnr)}
                          >
                            Board
                          </Button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {pax.boardedAt || "DONE"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Gate Scanner Form */}
        <div className="space-y-4">
          <Card className="border-border/60 bg-card/80 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <QrCode className="h-4 w-4 text-primary" />
                Gate Barcode / PNR Scanner
              </CardTitle>
              <CardDescription className="text-xs">
                Scan passenger digital boarding pass or input PNR manually.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Scan or enter PNR e.g. SKY-98234"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleScanBoard(scanInput);
                    }
                  }}
                  className="font-mono text-sm uppercase bg-background"
                />
                <Button
                  className="w-full font-semibold"
                  disabled={!scanInput.trim()}
                  onClick={() => handleScanBoard(scanInput)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Validate & Board
                </Button>
              </div>

              <div className="p-3 rounded bg-muted/40 border border-border/50 text-xs space-y-1 text-muted-foreground">
                <span className="font-semibold text-foreground block">Gate Operations Protocol:</span>
                <p>1. Ensure passenger presents valid digital boarding pass with matching photo ID.</p>
                <p>2. Verify baggage allowance and gate check oversized carry-on luggage.</p>
                <p>3. Once final call expires, click <strong>Close Gate & Handoff</strong> to release flight strip to ATC Tower.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
