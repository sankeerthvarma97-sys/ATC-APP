"use client";

import { useState, useCallback } from "react";
import {
  Radio,
  RotateCcw,
  Sparkles,
  Send,
  TowerControl,
  Signal,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { atcVoice } from "@/lib/services/voice-service";
import { cn } from "@/lib/utils";

export interface RadioTransmission {
  id: string;
  callsign: string;
  frequency: string;
  direction: "ATC_TO_PILOT" | "PILOT_TO_ATC" | "ATIS";
  text: string;
  timestamp: string;
}

const AVIATION_FREQUENCIES = [
  { name: "HYD Tower (Primary)", freq: "119.200 MHz", role: "TWR", station: "HYD" },
  { name: "HYD Ground Control", freq: "121.850 MHz", role: "GND", station: "HYD" },
  { name: "HYD Terminal Approach", freq: "124.950 MHz", role: "APP", station: "HYD" },
  { name: "HYD ATIS Information", freq: "128.400 MHz", role: "ATIS", station: "HYD" },
  { name: "BOM Tower (Mumbai)", freq: "118.100 MHz", role: "TWR", station: "BOM" },
  { name: "DEL Tower (Delhi)", freq: "118.100 MHz", role: "TWR", station: "DEL" },
  { name: "BLR Tower (Bangalore)", freq: "118.500 MHz", role: "TWR", station: "BLR" },
  { name: "KJFK Tower (New York)", freq: "118.700 MHz", role: "TWR", station: "JFK" },
];

const QUICK_CLEARANCES = [
  {
    label: "Takeoff RWY 09L",
    text: "SkyConnect 101, wind 090 at 8 knots, runway 09 Left, cleared for takeoff.",
    freq: "119.200 MHz",
  },
  {
    label: "ILS Approach 09L",
    text: "AeroVista 245, turn right heading 092, descend and maintain 3000, cleared ILS runway 09 Left approach.",
    freq: "124.950 MHz",
  },
  {
    label: "Pushback Stand B12",
    text: "SkyConnect 101, ground, pushback and engine start approved facing west, QNH 1013.",
    freq: "121.850 MHz",
  },
  {
    label: "Line Up & Wait 09L",
    text: "Blue Horizon 310, runway 09 Left, line up and wait, traffic on 4-mile final.",
    freq: "119.200 MHz",
  },
  {
    label: "Cleared to Land",
    text: "Blue Horizon 310, wind 080 at 10 knots, runway 09 Left, cleared to land.",
    freq: "119.200 MHz",
  },
  {
    label: "Taxi to Gate B24",
    text: "AeroVista 245, vacate via Taxiway Echo, taxi to gate Bravo 24 via Alpha.",
    freq: "121.850 MHz",
  },
];

export function AtcRadioSynthesizer({
  activeCallsign = "SC101",
  onTransmission,
}: {
  activeCallsign?: string;
  onTransmission?: (tx: RadioTransmission) => void;
}) {
  const [selectedFreq, setSelectedFreq] = useState(AVIATION_FREQUENCIES[0].freq);
  const [pilotReadbackEnabled, setPilotReadbackEnabled] = useState(true);
  const [customText, setCustomText] = useState("");
  const [transmissions, setTransmissions] = useState<RadioTransmission[]>([
    {
      id: "tx-1",
      callsign: "SC101",
      frequency: "121.850 MHz",
      direction: "ATC_TO_PILOT",
      text: "SkyConnect 101, ground, pushback approved facing west.",
      timestamp: "11:38:12",
    },
    {
      id: "tx-2",
      callsign: "AV245",
      frequency: "124.950 MHz",
      direction: "ATC_TO_PILOT",
      text: "AeroVista 245, descend to 3000 feet, contact tower on 119.2.",
      timestamp: "11:39:40",
    },
  ]);

  const transmitClearance = useCallback(
    (textToTransmit: string, freq = selectedFreq, callsign = activeCallsign) => {
      const isAtis = freq.includes("128.400") || freq.includes("128.725");

      const newTx: RadioTransmission = {
        id: `tx-${Date.now()}`,
        callsign,
        frequency: freq,
        direction: isAtis ? "ATIS" : "ATC_TO_PILOT",
        text: textToTransmit,
        timestamp: new Date().toLocaleTimeString(),
      };

      setTransmissions((prev) => [newTx, ...prev.slice(0, 19)]);
      onTransmission?.(newTx);

      // Automated ICAO Pilot Readback generation
      if (pilotReadbackEnabled && !isAtis) {
        const readbackText = atcVoice.generatePilotReadback(callsign, textToTransmit);
        setTimeout(() => {
          const readbackTx: RadioTransmission = {
            id: `tx-rb-${Date.now()}`,
            callsign,
            frequency: freq,
            direction: "PILOT_TO_ATC",
            text: readbackText,
            timestamp: new Date().toLocaleTimeString(),
          };
          setTransmissions((prev) => [readbackTx, ...prev.slice(0, 19)]);
          onTransmission?.(readbackTx);
        }, 600);
      }
    },
    [activeCallsign, onTransmission, pilotReadbackEnabled, selectedFreq]
  );

  const handleCustomSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;
    transmitClearance(customText.trim());
    setCustomText("");
  };

  return (
    <Card className="border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-md">
      <CardHeader className="pb-3 border-b border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                VHF Radio Telecommunications Console
                <Badge variant="outline" className="border-sky-500/40 text-sky-400 bg-sky-950/40 text-[10px] font-mono">
                  CPDLC / TEXT DISPATCH
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Aeronautical VHF Datalink text dispatch, ICAO standard clearances, and pilot readbacks.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPilotReadbackEnabled(!pilotReadbackEnabled)}
              className={cn(
                "h-7 text-xs border-slate-700 font-mono",
                pilotReadbackEnabled ? "text-emerald-400 border-emerald-500/40 bg-emerald-950/20" : "text-slate-400"
              )}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Pilot Readback: {pilotReadbackEnabled ? "ON" : "OFF"}
            </Button>
          </div>
        </div>

        {/* Frequency Selector Bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3">
          <span className="text-[11px] font-mono text-slate-400 mr-1 flex items-center gap-1">
            <Signal className="h-3 w-3 text-sky-400" /> Channels:
          </span>
          {AVIATION_FREQUENCIES.map((freq) => (
            <button
              key={freq.name}
              type="button"
              onClick={() => setSelectedFreq(freq.freq)}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-mono transition-all",
                selectedFreq === freq.freq
                  ? "bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/30"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              )}
            >
              {freq.role}: {freq.freq}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Quick Clearance Dispatch Grid */}
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <TowerControl className="h-3.5 w-3.5 text-sky-400" />
            Standard ATC Clearances (One-Click Transmit):
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {QUICK_CLEARANCES.map((qc) => (
              <button
                key={qc.label}
                type="button"
                onClick={() => transmitClearance(qc.text, qc.freq)}
                className="text-left p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-sky-500/50 hover:bg-slate-900 transition-all group"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-slate-200 group-hover:text-sky-300">
                  <span>{qc.label}</span>
                  <span className="text-[10px] font-mono text-slate-500">{qc.freq}</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-1">{qc.text}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Clearance Transmission Bar */}
        <form onSubmit={handleCustomSend} className="flex gap-2">
          <Input
            placeholder={`Transmit clearance to ${activeCallsign} on ${selectedFreq}...`}
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            className="bg-slate-950/70 border-slate-800 focus:border-sky-500 text-xs font-mono"
          />
          <Button
            type="submit"
            disabled={!customText.trim()}
            className="bg-sky-600 hover:bg-sky-500 text-slate-950 font-bold text-xs shrink-0"
          >
            <Send className="h-3.5 w-3.5 mr-1" />
            Transmit
          </Button>
        </form>

        {/* Transmission Log / Radio Feed */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Active Frequency Transmissions:</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTransmissions([])}
              className="h-6 px-2 text-[10px] text-slate-500 hover:text-slate-300"
            >
              <RotateCcw className="h-3 w-3 mr-1" /> Clear Feed
            </Button>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 max-h-48 overflow-y-auto space-y-2 font-mono text-xs">
            {transmissions.length === 0 ? (
              <div className="text-center py-6 text-slate-600 text-xs">
                No active radio transmissions logged on {selectedFreq}.
              </div>
            ) : (
              transmissions.map((tx) => (
                <div
                  key={tx.id}
                  className={cn(
                    "p-2 rounded-lg border text-xs",
                    tx.direction === "ATC_TO_PILOT"
                      ? "bg-sky-950/30 border-sky-500/30 text-sky-200"
                      : tx.direction === "PILOT_TO_ATC"
                      ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-200 ml-4"
                      : "bg-purple-950/30 border-purple-500/30 text-purple-200"
                  )}
                >
                  <div className="flex items-center justify-between text-[10px] opacity-75 mb-0.5">
                    <span className="font-bold tracking-wider">
                      {tx.direction === "ATC_TO_PILOT"
                        ? "ATC TOWER → " + tx.callsign
                        : tx.direction === "PILOT_TO_ATC"
                        ? tx.callsign + " (READBACK)"
                        : "ATIS BROADCAST"}
                    </span>
                    <span>{tx.timestamp} &bull; {tx.frequency}</span>
                  </div>
                  <div className="font-sans text-xs">{tx.text}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
