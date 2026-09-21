"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  Radio,
  Volume2,
  VolumeX,
  Play,
  Square,
  Sparkles,
  CheckCircle2,
  Send,
  Zap,
  TowerControl,
  Headphones,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export interface RadioTransmission {
  id: string;
  callsign: string;
  frequency: string;
  direction: "ATC_TO_PILOT" | "PILOT_TO_ATC" | "ATIS";
  text: string;
  timestamp: string;
}

const AVIATION_FREQUENCIES = [
  { name: "KJFK Tower", freq: "118.700 MHz", role: "TWR" },
  { name: "KJFK Ground", freq: "121.900 MHz", role: "GND" },
  { name: "NY TRACON Approach", freq: "125.700 MHz", role: "APP" },
  { name: "KJFK ATIS Loop", freq: "128.725 MHz", role: "ATIS" },
];

const QUICK_CLEARANCES = [
  {
    label: "Takeoff 04L",
    text: "SkyConnect 101, wind 060 at 8 knots, runway 04 Left, cleared for takeoff.",
    freq: "118.700 MHz",
  },
  {
    label: "ILS Approach 04R",
    text: "American 245, turn right heading 010, maintain 3000 until established, cleared ILS runway 04 Right approach.",
    freq: "125.700 MHz",
  },
  {
    label: "Pushback Stand A1",
    text: "SkyConnect 101, pushback and engine start approved, face west, QNH 1013.",
    freq: "121.900 MHz",
  },
  {
    label: "Emergency Priority",
    text: "FedEx 901 heavy, radar contact, emergency vehicles dispatched to runway 04 Right, wind calm, cleared to land.",
    freq: "118.700 MHz",
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
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [atisPlaying, setAtisPlaying] = useState(false);
  const [customText, setCustomText] = useState("");
  const [transmissions, setTransmissions] = useState<RadioTransmission[]>([
    {
      id: "tx-1",
      callsign: "SC101",
      frequency: "121.900 MHz",
      direction: "ATC_TO_PILOT",
      text: "SkyConnect 101, ground, pushback approved facing west.",
      timestamp: "11:38:12",
    },
    {
      id: "tx-2",
      callsign: "AAL245",
      frequency: "125.700 MHz",
      direction: "ATC_TO_PILOT",
      text: "American 245, descend to 3000 feet, contact tower on 118.7.",
      timestamp: "11:39:40",
    },
  ]);

  // Squelch click sound effect via Web Audio API
  const playSquelch = useCallback((type: "start" | "end") => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === "start") {
        osc.frequency.setValueAtTime(450, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.06);
      } else {
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      }
    } catch {
      // AudioContext unavailable
    }
  }, []);

  // Text-to-Speech synthesis with standard ICAO phonetic conversion
  const speakTransmission = useCallback(
    (textToSpeak: string, freq = selectedFreq, callsign = activeCallsign) => {
      // Format aviation speech
      const formattedSpeech = textToSpeak
        .replace(/FL(\d{2,3})/g, "flight level $1")
        .replace(/04L/g, "zero four Left")
        .replace(/04R/g, "zero four Right")
        .replace(/31L/g, "three one Left")
        .replace(/31R/g, "three one Right")
        .replace(/RWY/gi, "runway")
        .replace(/HDG/gi, "heading")
        .replace(/QNH/gi, "altimeter");

      const newTx: RadioTransmission = {
        id: `tx-${Date.now()}`,
        callsign,
        frequency: freq,
        direction: freq.includes("128.725") ? "ATIS" : "ATC_TO_PILOT",
        text: textToSpeak,
        timestamp: new Date().toLocaleTimeString(),
      };

      setTransmissions((prev) => [newTx, ...prev.slice(0, 19)]);
      onTransmission?.(newTx);

      if (!audioEnabled || typeof window === "undefined" || !window.speechSynthesis) {
        return;
      }

      playSquelch("start");
      setIsTransmitting(true);

      const utterance = new SpeechSynthesisUtterance(formattedSpeech);
      utterance.rate = 1.05; // ATC rapid-fire clear delivery
      utterance.pitch = 0.95;

      // Pick a professional English voice if available
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(
        (v) => v.lang.includes("en-US") || v.lang.includes("en-GB")
      );
      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      utterance.onend = () => {
        setIsTransmitting(false);
        playSquelch("end");
      };

      utterance.onerror = () => {
        setIsTransmitting(false);
      };

      window.speechSynthesis.speak(utterance);
    },
    [activeCallsign, audioEnabled, onTransmission, playSquelch, selectedFreq]
  );

  // ATIS (Automatic Terminal Information Service) Voice Generator
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
      "Kennedy International Terminal Information Bravo. Time 1140 Zulu. Wind 060 at 8 knots. Visibility 10 miles. Sky condition broken 4500. Temperature 14, dewpoint 8. Altimeter 3002. Simultaneous ILS approaches in use for Runway 04 Left and Runway 04 Right. Departures Runway 31 Left. Advise controller on initial contact you have Information Bravo.";

    speakTransmission(atisText, "128.725 MHz", "KJFK ATIS");
  };

  const handleSendCustom = () => {
    if (!customText.trim()) return;
    speakTransmission(customText.trim());
    setCustomText("");
  };

  return (
    <Card className="border-cyan-500/30 bg-slate-900/90 backdrop-blur-xl shadow-2xl font-mono">
      <CardHeader className="pb-3 border-b border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Headphones className="h-4 w-4 text-cyan-400" />
              Synthesized ATC Radio Transceiver & Voice Channel
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Web Speech Synthesis with VHF squelch audio filter and automated ATIS loops.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs text-slate-400 hover:text-white"
              onClick={() => setAudioEnabled(!audioEnabled)}
            >
              {audioEnabled ? <Volume2 className="h-4 w-4 text-emerald-400 mr-1" /> : <VolumeX className="h-4 w-4 text-slate-500 mr-1" />}
              {audioEnabled ? "TTS Audio ON" : "TTS Muted"}
            </Button>
            {isTransmitting && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/50 animate-pulse text-[10px]">
                ● ON AIR / TRANSMITTING
              </Badge>
            )}
          </div>
        </div>

        {/* Frequency Tuner Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pt-3 pb-1">
          {AVIATION_FREQUENCIES.map((f) => (
            <button
              key={f.freq}
              type="button"
              onClick={() => setSelectedFreq(f.freq)}
              className={`px-3 py-1.5 rounded-lg text-xs transition border flex items-center gap-2 shrink-0 ${
                selectedFreq === f.freq
                  ? "border-cyan-500/60 bg-cyan-950/40 text-cyan-200 font-bold ring-1 ring-cyan-500/40"
                  : "border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white"
              }`}
            >
              <Radio className="h-3 w-3 text-cyan-400" />
              <span>{f.name}</span>
              <Badge variant="outline" className="text-[9px] py-0 px-1 border-slate-700">
                {f.freq}
              </Badge>
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Quick Clearances Bar */}
        <div>
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1.5">
            Quick Tactical Radio Clearances:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {QUICK_CLEARANCES.map((qc, idx) => (
              <Button
                key={idx}
                size="sm"
                variant="outline"
                disabled={isTransmitting}
                onClick={() => speakTransmission(qc.text, qc.freq)}
                className="h-9 text-xs border-slate-800 hover:border-cyan-500/50 bg-slate-950/60 text-slate-200 justify-start truncate"
              >
                <Mic className="h-3 w-3 mr-1.5 text-cyan-400 shrink-0" />
                <span className="truncate">{qc.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Speech Radio Input + ATIS Broadcast Toggle */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Input
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder={`Transmit clearance to ${activeCallsign} on ${selectedFreq}...`}
              className="bg-slate-950/80 border-slate-800 text-xs text-white pr-8"
              onKeyDown={(e) => e.key === "Enter" && handleSendCustom()}
            />
          </div>
          <div className="flex gap-2">
            <Button
              disabled={isTransmitting || !customText.trim()}
              onClick={handleSendCustom}
              className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs px-3"
            >
              <Send className="h-3.5 w-3.5 mr-1" />
              Transmit
            </Button>
            <Button
              variant="outline"
              onClick={toggleAtisLoop}
              className={`text-xs px-3 border ${
                atisPlaying
                  ? "border-amber-500/60 bg-amber-950/30 text-amber-300"
                  : "border-slate-800 bg-slate-950 text-slate-300 hover:text-white"
              }`}
            >
              {atisPlaying ? <Square className="h-3 w-3 mr-1 text-amber-400" /> : <Play className="h-3 w-3 mr-1 text-emerald-400" />}
              {atisPlaying ? "Stop ATIS" : "Play ATIS Bravo"}
            </Button>
          </div>
        </div>

        {/* Transmission Log Stream */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
            Recent Frequency Transmissions:
          </span>
          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
            {transmissions.map((t) => (
              <div
                key={t.id}
                className="p-2 rounded-lg border border-slate-800/80 bg-slate-950/40 text-xs flex items-center justify-between gap-3 text-slate-300"
              >
                <div className="flex items-center gap-2 truncate">
                  <Badge variant="outline" className="text-[9px] py-0 px-1 border-cyan-500/40 text-cyan-300">
                    {t.frequency}
                  </Badge>
                  <strong className="text-white shrink-0">{t.callsign}:</strong>
                  <span className="truncate text-slate-300">{t.text}</span>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0">{t.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
