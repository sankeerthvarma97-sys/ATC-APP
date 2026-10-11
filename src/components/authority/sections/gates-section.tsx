"use client";

import { useState } from "react";
import {
  Clock,
  DoorOpen,
  Filter,
  Plane,
  RefreshCw,
  Warehouse,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import type { GateDTO } from "@/lib/domain";

interface GateWithDetails extends GateDTO {
  airportCode: string;
  terminal: string;
  assignedFlight?: string;
  airline?: string;
  hasJetBridge: boolean;
}

const INITIAL_GATES: GateWithDetails[] = [
  { id: "gate-b12-hyd", code: "B12", terminalId: "T1", airportCode: "HYD", terminal: "Terminal 1 (RGIA)", status: "OCCUPIED", turnMinutes: 40, assignedFlight: "6E-604", airline: "IndiGo", hasJetBridge: true },
  { id: "gate-a4-hyd", code: "A4", terminalId: "T1", airportCode: "HYD", terminal: "Terminal 1 (RGIA)", status: "AVAILABLE", turnMinutes: 45, hasJetBridge: true },
  { id: "gate-a10-hyd", code: "A10", terminalId: "T1", airportCode: "HYD", terminal: "Terminal 1 (RGIA)", status: "AVAILABLE", turnMinutes: 50, hasJetBridge: false },
  { id: "gate-b14-hyd", code: "B14", terminalId: "T1", airportCode: "HYD", terminal: "Terminal 1 (RGIA)", status: "RESERVED", turnMinutes: 30, assignedFlight: "AI-542", airline: "Air India", hasJetBridge: true },
  { id: "gate-c1-hyd", code: "C1", terminalId: "T1", airportCode: "HYD", terminal: "Terminal 1 (RGIA)", status: "AVAILABLE", turnMinutes: 40, hasJetBridge: true },
  { id: "gate-c2-hyd", code: "C2", terminalId: "T1", airportCode: "HYD", terminal: "Terminal 1 (RGIA)", status: "OCCUPIED", turnMinutes: 15, assignedFlight: "UK-821", airline: "Vistara", hasJetBridge: true },
  { id: "gate-a1-hyd", code: "A1", terminalId: "T1", airportCode: "HYD", terminal: "Terminal 1 (RGIA)", status: "AVAILABLE", turnMinutes: 45, hasJetBridge: true },
  { id: "gate-b1-hyd", code: "B1", terminalId: "T1", airportCode: "HYD", terminal: "Terminal 1 (RGIA)", status: "AVAILABLE", turnMinutes: 55, hasJetBridge: true },
];

export function GatesSection({ activeStation = "HYD" }: { activeStation?: string }) {
  const [gates, setGates] = useState<GateWithDetails[]>(INITIAL_GATES);
  const [terminalFilter, setTerminalFilter] = useState("ALL");

  const toggleGate = (id: string) => {
    setGates((prev) =>
      prev.map((g) => {
        if (g.id === id) {
          const nextStatus =
            g.status === "AVAILABLE"
              ? "OCCUPIED"
              : g.status === "OCCUPIED"
              ? "MAINTENANCE"
              : "AVAILABLE";
          return { ...g, status: nextStatus };
        }
        return g;
      })
    );
  };

  const filtered = gates.filter((g) => {
    return terminalFilter === "ALL" || g.terminal === terminalFilter;
  });

  const terminals = Array.from(new Set(gates.map((g) => g.terminal)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Warehouse className="h-6 w-6 text-primary" />
            Gate Management & Concourse Stands
          </h2>
          <p className="text-sm text-muted-foreground">
            Monitor gate occupancy, jet bridge readiness, turnaround countdown timers, and terminal assignments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={terminalFilter}
            onChange={(e) => setTerminalFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold"
          >
            <option value="ALL">All Terminals</option>
            {terminals.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((gate) => {
          const isAvail = gate.status === "AVAILABLE";
          const isOcc = gate.status === "OCCUPIED";
          return (
            <Card key={gate.id} className="border-border/60 bg-card/80">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-mono font-bold text-foreground">
                      GATE {gate.code}
                    </span>
                    <CopyButton value={gate.code} title="Copy Gate Code" />
                    <Badge variant="outline" className="text-xs">
                      {gate.terminal}
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
                  <div className="p-2.5 rounded bg-background/50 border border-border/40 text-muted-foreground text-center">
                    Stand vacant & ready for inbound allocation
                  </div>
                )}

                <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                  <span className="text-muted-foreground text-[11px]">Override State:</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[11px]"
                    onClick={() => toggleGate(gate.id)}
                  >
                    Toggle Gate
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
