"use client";

import { useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Flame,
  PhoneCall,
  Radio,
  ShieldAlert,
  Siren,
  Truck,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface EmergencyEvent {
  id: string;
  type: string;
  flight: string;
  squawk: string;
  time: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  details: string;
  arffDispatched: boolean;
}

const INITIAL_EVENTS: EmergencyEvent[] = [
  {
    id: "emg-1",
    type: "ENGINE FIRE / SQUAWK 7700",
    flight: "SKY-770",
    squawk: "7700",
    time: "14:28Z",
    severity: "CRITICAL",
    details: "Number 2 engine oil pressure loss and fire warning. Aircraft requesting immediate priority vectors to RWY 04L.",
    arffDispatched: true,
  },
  {
    id: "emg-2",
    type: "NORDO / LOSS OF COMMS (SQUAWK 7600)",
    flight: "OEA-842",
    squawk: "7600",
    time: "14:15Z",
    severity: "HIGH",
    details: "Aircraft lost VHF radio communication on approach. Following standard lost comms STAR procedure.",
    arffDispatched: false,
  },
];

export function EmergenciesSection() {
  const [events, setEvents] = useState<EmergencyEvent[]>(INITIAL_EVENTS);
  const [declareType, setDeclareType] = useState("ENGINE_FAILURE");
  const [flightInput, setFlightInput] = useState("");
  const [detailsInput, setDetailsInput] = useState("");

  const handleDeclareEmergency = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flightInput.trim()) return;

    const newEvt: EmergencyEvent = {
      id: `emg-${Date.now()}`,
      type: declareType.replace(/_/g, " "),
      flight: flightInput.toUpperCase(),
      squawk: "7700",
      time: new Date().toLocaleTimeString(),
      severity: "CRITICAL",
      details: detailsInput || "Emergency declared by AOCC command.",
      arffDispatched: true,
    };

    setEvents([newEvt, ...events]);
    setFlightInput("");
    setDetailsInput("");
  };

  const toggleDispatchARFF = (id: string) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, arffDispatched: !e.arffDispatched } : e))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Siren className="h-6 w-6 text-rose-500 animate-pulse" />
            Emergency Operations & ARFF Crisis Response
          </h2>
          <p className="text-sm text-muted-foreground">
            Monitor distress squawk codes, coordinate Category 10 fire & rescue crash tenders, and initiate airfield lockouts.
          </p>
        </div>
        <Badge variant="destructive" className="animate-pulse">
          {events.length} ACTIVE INCIDENTS
        </Badge>
      </div>

      {/* ARFF Readiness Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground uppercase flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-rose-400" />
              ARFF Category
            </span>
            <div className="text-2xl font-bold font-mono text-foreground">CAT 10</div>
            <div className="text-xs text-muted-foreground">A380 / B777 Certified</div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground uppercase flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-primary" />
              Crash Tenders
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-400">6 / 6 Ready</div>
            <div className="text-xs text-muted-foreground">Response &lt; 180 sec</div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground uppercase flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
              AFFF Foam Supply
            </span>
            <div className="text-2xl font-bold font-mono text-foreground">34,000 L</div>
            <div className="text-xs text-muted-foreground">Full Tank Capacity</div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground uppercase flex items-center gap-1.5">
              <PhoneCall className="h-3.5 w-3.5 text-rose-400" />
              Emergency Hotline
            </span>
            <div className="text-xl font-bold font-mono text-foreground">HOTLINE-121.5</div>
            <div className="text-xs text-muted-foreground">Guard VHF Monitored</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incident List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 text-rose-500" />
            Active Incident Roster ({events.length})
          </h3>

          <div className="space-y-3">
            {events.map((evt) => (
              <Card
                key={evt.id}
                className="border-rose-500/40 bg-rose-950/10 shadow-sm transition-all"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-bold text-foreground">
                        {evt.flight}
                      </span>
                      <Badge variant="destructive" className="font-mono text-xs">
                        SQUAWK {evt.squawk}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {evt.type}
                      </Badge>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">{evt.time}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <p className="text-foreground/90">{evt.details}</p>

                  <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Crash Rescue Status:</span>
                      {evt.arffDispatched ? (
                        <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/40">
                          ARFF TENDERS ROLLING
                        </Badge>
                      ) : (
                        <Badge variant="outline">STANDBY</Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={evt.arffDispatched ? "outline" : "destructive"}
                      className="h-7 text-xs"
                      onClick={() => toggleDispatchARFF(evt.id)}
                    >
                      {evt.arffDispatched ? "Recall ARFF" : "Scramble ARFF Squad"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Declare Emergency Form */}
        <div>
          <Card className="border-border/60 bg-card/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                Declare Airfield / Flight Emergency
              </CardTitle>
              <CardDescription className="text-xs">
                Escalates to Airport Director, ARFF Commander, and TRACON.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleDeclareEmergency} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Target Aircraft Callsign</label>
                  <Input
                    required
                    placeholder="e.g. SKY-501"
                    value={flightInput}
                    onChange={(e) => setFlightInput(e.target.value)}
                    className="font-mono uppercase bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Emergency Classification</label>
                  <select
                    value={declareType}
                    onChange={(e) => setDeclareType(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="SQUAWK_7700">General Emergency (Squawk 7700)</option>
                    <option value="SQUAWK_7600">Lost Communications / NORDO (Squawk 7600)</option>
                    <option value="SQUAWK_7500">Unlawful Interference / Hijack (Squawk 7500)</option>
                    <option value="ENGINE_FAILURE">Engine Flameout / Fire</option>
                    <option value="HYDRAULIC_FAILURE">Hydraulic Failure / Gear Issue</option>
                    <option value="MEDICAL_EMERGENCY">Severe In-flight Medical</option>
                    <option value="BIRD_STRIKE">Airframe Bird Strike</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Situational Notes</label>
                  <Input
                    placeholder="e.g. Flaps jammed at 15°, 180 souls onboard..."
                    value={detailsInput}
                    onChange={(e) => setDetailsInput(e.target.value)}
                    className="bg-background"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-rose-600 hover:bg-rose-500 text-white font-semibold mt-2"
                >
                  <Siren className="h-4 w-4 mr-2" />
                  Initiate Emergency Protocol
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
