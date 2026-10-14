"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronRight,
  Flame,
  Mic,
  Radio,
  Send,
  ShieldAlert,
  Sparkles,
  Volume2,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AiAtcAssistantResponse, FlightDTO } from "@/lib/domain";
import { atcVoice } from "@/lib/services/voice-service";
import { cn } from "@/lib/utils";

interface AiAtcAssistantCardProps {
  selectedFlight?: FlightDTO | null;
  activeAirportCode?: string;
  onApplyParameters?: (params: {
    altitudeFt?: number;
    headingDeg?: number;
    speedKt?: number;
    squawk?: string;
    runway?: string;
  }) => void;
  className?: string;
}

const PRESET_RADIO_TRANSMISSIONS = [
  {
    label: "Direct Waypoint",
    text: "Vistara 814, passing 4000 for 7000, request direct BOPOL.",
  },
  {
    label: "Pushback & Start",
    text: "IndiGo 502, request pushback and start-up facing west, stand 14.",
  },
  {
    label: "MAYDAY Emergency",
    text: "Air India 101, declaring MAYDAY, engine 2 fire, request immediate vectors ILS 09L.",
  },
  {
    label: "Turbulence Descent",
    text: "SpiceJet 303, experiencing severe turbulence, request descent to 4000 feet.",
  },
  {
    label: "Speed Vectoring",
    text: "Emirates 545, heading 240, request speed reduction to 210 knots.",
  },
];

export function AiAtcAssistantCard({
  selectedFlight,
  activeAirportCode = "HYD",
  onApplyParameters,
  className,
}: AiAtcAssistantCardProps) {
  const [pilotInput, setPilotInput] = useState(
    selectedFlight
      ? `${selectedFlight.callsign}, passing ${selectedFlight.altitudeFt} feet, request direct BOPOL.`
      : "Vistara 814, passing 4000 for 7000, request direct BOPOL.",
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [assistantResult, setAssistantResult] = useState<AiAtcAssistantResponse | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleQueryAssistant = async (customText?: string) => {
    const textToQuery = customText || pilotInput;
    if (!textToQuery.trim()) return;

    setIsProcessing(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/ai/atc-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pilotTransmission: textToQuery,
          selectedFlightId: selectedFlight?.id,
          airportCode: activeAirportCode,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to consult AI ATC assistant.");
      }

      const data: AiAtcAssistantResponse = await res.json();
      setAssistantResult(data);
      setFeedback("Clearance generated and validated against ICAO Doc 4444.");
    } catch {
      setFeedback("AI Co-Pilot service offline. Check connection or fallback status.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyParameters = () => {
    if (!assistantResult?.suggestedParameters) return;
    onApplyParameters?.(assistantResult.suggestedParameters);
    setFeedback(`Applied parameters to tactical panel: Alt, Hdg, Spd, and Squawk.`);
  };

  const handleTransmitRadioAudio = () => {
    if (!assistantResult) return;
    setIsPlayingAudio(true);

    atcVoice.speakClearance(assistantResult.recommendedClearance, {
      callsign: assistantResult.callsign,
      withReadback: true,
      isEmergency: assistantResult.intent.startsWith("EMERGENCY"),
      onEnd: () => {
        setIsPlayingAudio(false);
      },
    });
  };

  return (
    <Card className={cn("border-border/60 bg-card/90 backdrop-blur shadow-sm overflow-hidden", className)}>
      <CardHeader className="py-3 px-4 border-b border-border/50 bg-muted/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            AI Air Traffic Controller Assistant (Gemini Co-Pilot)
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {assistantResult ? (
              <Badge
                variant={assistantResult.simulated ? "outline" : "default"}
                className="text-[10px] font-mono"
              >
                {assistantResult.model}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
                Gemini Ready
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className="text-xs">
          Natural-language pilot radio transmission parsing, automated ICAO clearance dispatch, and STCA conflict prevention.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Quick Presets */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
            <span>Pilot Radio Transmission Presets:</span>
            <span className="text-[10px] font-mono text-primary">ICAO ANNEX 11</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_RADIO_TRANSMISSIONS.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                className="h-6 text-[11px] px-2 py-0 border-border/60 hover:border-primary/50 text-foreground"
                onClick={() => {
                  setPilotInput(preset.text);
                  handleQueryAssistant(preset.text);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Input area */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                value={pilotInput}
                onChange={(e) => setPilotInput(e.target.value)}
                placeholder="Enter pilot radio transmission (e.g. 'AIC101 requesting direct BOPOL')..."
                className="font-mono text-xs pr-8 bg-background"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleQueryAssistant();
                }}
              />
              <Mic className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
            <Button
              size="sm"
              className="text-xs font-semibold gap-1.5 shrink-0"
              onClick={() => handleQueryAssistant()}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Sparkles className="h-3.5 w-3.5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Parse & Advise
                </>
              )}
            </Button>
          </div>
        </div>

        {feedback && (
          <div className="text-[11px] font-mono text-primary flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded border border-primary/20">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            {feedback}
          </div>
        )}

        {/* STCA Airspace Conflicts Alert if detected */}
        {assistantResult?.conflicts && assistantResult.conflicts.length > 0 && (
          <div className="rounded border border-amber-500/40 bg-amber-950/20 p-2.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-amber-400">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4" />
                STCA Separation Conflict Alert ({assistantResult.conflicts.length} Active)
              </span>
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                LOSS OF SEPARATION
              </Badge>
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {assistantResult.conflicts.map((c) => (
                <div
                  key={c.conflictId}
                  className="p-2 rounded bg-background/60 border border-amber-500/20 text-[11px] space-y-1"
                >
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-foreground font-semibold">
                      {c.flightA.callsign} ({c.flightA.altitudeFt}ft) &harr; {c.flightB.callsign} ({c.flightB.altitudeFt}ft)
                    </span>
                    <span className="text-amber-400 font-bold">
                      {c.horizontalSeparationNm} NM / {c.verticalSeparationFt} FT
                    </span>
                  </div>
                  <p className="text-muted-foreground text-[10px] leading-relaxed">
                    <span className="text-amber-300 font-medium">Advisory: </span>
                    {c.resolutionAdvisory}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Clearance Recommendation Card */}
        {assistantResult && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs font-mono font-bold">
                  {assistantResult.callsign}
                </Badge>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {assistantResult.intent}
                </Badge>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">
                {new Date(assistantResult.timestamp).toLocaleTimeString()}
              </span>
            </div>

            {/* Recommended Clearance */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-primary tracking-wider flex items-center gap-1">
                <Radio className="h-3 w-3" />
                Recommended ICAO ATC Clearance
              </span>
              <div className="p-2.5 rounded bg-background border border-primary/30 text-foreground text-xs font-mono font-medium leading-relaxed">
                {assistantResult.recommendedClearance}
              </div>
            </div>

            {/* Pilot Readback */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Standard Pilot Readback (Automated)
              </span>
              <div className="p-2 rounded bg-background/70 border border-emerald-500/20 text-emerald-300 text-[11px] font-mono italic">
                &ldquo;{assistantResult.pilotReadback}&rdquo;
              </div>
            </div>

            {/* Reasoning */}
            <div className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="text-foreground font-semibold">Separation Rationale: </span>
              {assistantResult.reasoning}
            </div>

            {/* Tactical Actions */}
            <div className="flex items-center gap-2 pt-1">
              {onApplyParameters && Object.keys(assistantResult.suggestedParameters).length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 gap-1.5 flex-1 border-primary/40 hover:bg-primary/10 text-primary font-medium"
                  onClick={handleApplyParameters}
                >
                  <Zap className="h-3 w-3" />
                  Apply Suggested Vectors
                </Button>
              )}

              <Button
                size="sm"
                className="text-xs h-7 gap-1.5 flex-1 font-semibold"
                onClick={handleTransmitRadioAudio}
                disabled={isPlayingAudio}
              >
                <Volume2 className={cn("h-3 w-3", isPlayingAudio && "animate-pulse text-amber-300")} />
                {isPlayingAudio ? "Transmitting VHF..." : "Transmit on Radio"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
