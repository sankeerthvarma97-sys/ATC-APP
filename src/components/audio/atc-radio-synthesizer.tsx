"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Mic,
  MicOff,
  Radio,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Square,
  Sparkles,
  CheckCircle2,
  Send,
  Zap,
  TowerControl,
  Headphones,
  Signal,
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
    text: "SkyConnect 101, pushback and engine start approved, face west, QNH 1013.",
    freq: "121.850 MHz",
  },
  {
    label: "Taxi via TWY Echo",
    text: "Blue Horizon 310, taxi via Taxiway Echo to holding point runway 09 Left, cross runway 27 Right.",
    freq: "121.850 MHz",
  },
  {
    label: "Emergency Priority",
    text: "IndianSky 7700, radar contact, runway 09 Left cleared for priority landing, emergency CFR standing by.",
    freq: "119.200 MHz",
  },
  {
    label: "Go-Around Instruction",
    text: "Nova 404, go around! Fly runway heading, climb and maintain 4000 feet, contact departure.",
    freq: "119.200 MHz",
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
  const [audioEnabled, setAudioEnabled] = useState(atcVoice.isAudioActive());
  const [pilotReadbackEnabled, setPilotReadbackEnabled] = useState(true);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [isPilotSpeaking, setIsPilotSpeaking] = useState(false);
  const [atisPlaying, setAtisPlaying] = useState(false);
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

  useEffect(() => {
    return atcVoice.subscribe((enabled) => {
      setAudioEnabled(enabled);
    });
  }, []);

  const handleToggleAudio = () => {
    const next = atcVoice.toggleAudio();
    setAudioEnabled(next);
  };

  const transmitClearance = useCallback(
    (textToSpeak: string, freq = selectedFreq, callsign = activeCallsign) => {
      const isAtis = freq.includes("128.400") || freq.includes("128.725");

      const newTx: RadioTransmission = {
        id: `tx-${Date.now()}`,
        callsign,
        frequency: freq,
        direction: isAtis ? "ATIS" : "ATC_TO_PILOT",
        text: textToSpeak,
        timestamp: new Date().toLocaleTimeString(),
      };

      setTransmissions((prev) => [newTx, ...prev.slice(0, 19)]);
      onTransmission?.(newTx);

      if (!audioEnabled) return;

      setIsTransmitting(true);

      atcVoice.speakClearance(textToSpeak, {
        isEmergency: textToSpeak.toLowerCase().includes("emergency") || textToSpeak.includes("7700"),
        callsign,
        withReadback: pilotReadbackEnabled && !isAtis,
        onEnd: () => {
          setIsTransmitting(false);
          if (pilotReadbackEnabled && !isAtis) {
            setIsPilotSpeaking(true);
            const readbackText = atcVoice.generatePilotReadback(callsign, textToSpeak);
            const readbackTx: RadioTransmission = {
              id: `tx-rb-${Date.now()}`,
              callsign,
              frequency: freq,
              direction: "PILOT_TO_ATC",
              text: readbackText,
              timestamp: new Date().toLocaleTimeString(),
            };
            setTransmissions((prev) => [readbackTx, ...prev.slice(0, 19)]);
            setTimeout(() => {
              setIsPilotSpeaking(false);
            }, 2500);
          }
        },
      });
    },
    [activeCallsign, audioEnabled, onTransmission, pilotReadbackEnabled, selectedFreq]
  );

  const toggleAtisLoop = () => {
    if (atisPlaying) {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setAtisPlaying(false);
      setIsTransmitting(false);
      return;
    }

    setAtisPlaying(true);
    const atisText =
      "Hyderabad Rajiv Gandhi Information Delta. Time 0915 Zulu. Wind 090 at 8 knots. Visibility 10 kilometers. Cloud scattered 3000 feet. Temperature 28, dewpoint 21. QNH 1013. ILS runway 09 Left in use. Departures runway 09 Left. Notice to airmen: bird activity in approach corridor. Advise controller on initial contact you have Information Delta.";

    transmitClearance(atisText, "128.400 MHz", "HYD ATIS");
  };

  const handleSendCustom = () => {
    if (!customText.trim()) return;
    transmitClearance(customText.trim());
    setCustomText("");
  };

  const handleReplayTransmission = (tx: RadioTransmission) => {
    if (!audioEnabled) return;
    setIsTransmitting(true);
    atcVoice.speakClearance(tx.text, {
      callsign: tx.callsign,
      withReadback: false,
      onEnd: () => setIsTransmitting(false),
    });
  };

  return (
    <Card className="border-cyan-500/30 bg-slate-900/90 backdrop-blur-xl shadow-2xl font-mono">
      <CardHeader className="pb-3 border-b border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Headphones className="h-4 w-4 text-cyan-400" />
              Synthesized VHF Aviation Radio Transceiver & Voice Datalink
            </CardTitle>
            <CardDescription className="text-xs text-slate-400 font-mono">
              Web Audio 1.8kHz bandpass squelch filter, Roger courtesy beeps, and automated pilot voice readbacks.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs text-slate-400 hover:text-white"
              onClick={handleToggleAudio}
            >
              {audioEnabled ? <Volume2 className="h-4 w-4 text-emerald-400 mr-1" /> : <VolumeX className="h-4 w-4 text-slate-500 mr-1" />}
              {audioEnabled ? "Radio Audio ON" : "Radio Muted"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={cn(
                "h-8 px-2 text-[10px] font-mono",
                pilotReadbackEnabled ? "border-cyan-500/40 text-cyan-300 bg-cyan-950/20" : "border-slate-800 text-slate-500",
              )}
              onClick={() => setPilotReadbackEnabled(!pilotReadbackEnabled)}
            >
              Pilot Readback: {pilotReadbackEnabled ? "ACTIVE" : "OFF"}
            </Button>
            {isTransmitting && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/50 animate-pulse text-[10px]">
                ● TOWER TRANSMITTING
              </Badge>
            )}
            {isPilotSpeaking && (
              <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/50 animate-pulse text-[10px]">
                ● PILOT READBACK
              </Badge>
            )}
          </div>
        </div>

        {/* Radio Channel Tuner Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 scrollbar-none">
          {AVIATION_FREQUENCIES.map((channel) => (
            <button
              key={channel.freq}
              type="button"
              onClick={() => setSelectedFreq(channel.freq)}
              className={cn(
                "px-2.5 py-1 rounded text-[11px] border transition shrink-0 flex items-center gap-1.5 font-mono",
                selectedFreq === channel.freq
                  ? "bg-cyan-950/80 border-cyan-500/60 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)] font-bold"
                  : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200",
              )}
            >
              <Radio className="h-3 w-3 text-cyan-400" />
              <span>{channel.name}</span>
              <span className="text-[10px] opacity-75">({channel.freq})</span>
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Quick Clearance Dispatch Grid */}
        <div className="space-y-2">
          <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between">
            <span className="uppercase">Operational Clearances (One-Click Transmission with Pilot Readback):</span>
            <span className="text-cyan-400">Target Callsign: {activeCallsign}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {QUICK_CLEARANCES.map((c) => (
              <button
                key={c.label}
                type="button"
                disabled={isTransmitting || isPilotSpeaking}
                onClick={() => transmitClearance(c.text, c.freq)}
                className="text-left p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800/80 hover:border-cyan-500/40 transition disabled:opacity-50 text-xs font-mono group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 group-hover:text-cyan-300">{c.label}</span>
                  <Radio className="h-3 w-3 text-cyan-400 opacity-60 group-hover:opacity-100" />
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-1">{c.text}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Clearance Transmitter */}
        <div className="flex items-center gap-2 pt-1">
          <Input
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendCustom()}
            placeholder={`Enter clearance for ${activeCallsign} on ${selectedFreq}...`}
            className="bg-slate-950 border-slate-800 text-xs font-mono text-slate-200 focus:border-cyan-500"
          />
          <Button
            size="sm"
            onClick={handleSendCustom}
            disabled={!customText.trim() || isTransmitting}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs px-3"
          >
            <Send className="h-3.5 w-3.5 mr-1" /> Transmit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={toggleAtisLoop}
            className={cn(
              "font-mono text-xs border-slate-700",
              atisPlaying ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse" : "text-slate-300 hover:text-white",
            )}
          >
            {atisPlaying ? "Stop ATIS" : "Broadcast ATIS"}
          </Button>
        </div>

        {/* Live Audio Spectrum & Squelch Waveform Indicator */}
        {(isTransmitting || isPilotSpeaking) && (
          <div className="rounded-lg border border-cyan-500/40 bg-slate-950/80 p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Signal className="h-5 w-5 text-cyan-400 animate-pulse" />
              <div>
                <div className="text-xs font-bold text-cyan-300">
                  {isTransmitting ? "VHF TOWER TRANSMITTER ACTIVE" : "AIR-TO-GROUND PILOT READBACK TRANSMITTING"}
                </div>
                <div className="text-[10px] text-slate-400">Frequency: {selectedFreq} &bull; Carrier Waveform Modulation 1.8 kHz</div>
              </div>
            </div>
            {/* Animated Audio Equalizer Bars */}
            <div className="flex items-end gap-1 h-6">
              {[40, 75, 100, 60, 90, 45, 80, 65].map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-cyan-400 rounded-t animate-pulse"
                  style={{
                    height: `${h}%`,
                    animationDelay: `${i * 80}ms`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Radio Transmission Chatter History */}
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>LIVE RADIO CHATTER FEED ({transmissions.length})</span>
            <span className="text-emerald-400">VHF Dual Squelch Active</span>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {transmissions.map((tx) => (
              <div
                key={tx.id}
                className={cn(
                  "p-2 rounded-lg border text-xs font-mono flex items-center justify-between gap-3 transition",
                  tx.direction === "PILOT_TO_ATC"
                    ? "bg-slate-950/80 border-cyan-500/30 text-cyan-200"
                    : tx.direction === "ATIS"
                    ? "bg-amber-950/20 border-amber-500/30 text-amber-200"
                    : "bg-slate-950/40 border-slate-800 text-slate-300",
                )}
              >
                <div className="space-y-0.5 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] px-1 py-0 font-bold",
                        tx.direction === "PILOT_TO_ATC"
                          ? "border-cyan-400 text-cyan-300"
                          : tx.direction === "ATIS"
                          ? "border-amber-400 text-amber-300"
                          : "border-emerald-400 text-emerald-300",
                      )}
                    >
                      {tx.direction === "PILOT_TO_ATC" ? "PILOT" : tx.direction === "ATIS" ? "ATIS" : "TOWER"}
                    </Badge>
                    <span className="font-bold text-slate-200">{tx.callsign}</span>
                    <span className="text-[10px] text-slate-500">[{tx.frequency}]</span>
                    <span className="text-[10px] text-slate-500 ml-auto">{tx.timestamp}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed truncate">{tx.text}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleReplayTransmission(tx)}
                  title="Replay transmission with squelch"
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white shrink-0 transition"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
