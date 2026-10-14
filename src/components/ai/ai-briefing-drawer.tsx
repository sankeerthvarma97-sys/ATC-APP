"use client";

import { useState, useCallback } from "react";
import {
  Bot,
  Brain,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  FileText,
  HelpCircle,
  Lightbulb,
  Radio,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
  Wind,
  X,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export interface AiBriefingPayload {
  model: string;
  simulated: boolean;
  risk: "INFO" | "ADVISORY" | "WARNING" | "CRITICAL";
  briefing: string;
  actions: string[];
}

const PRESET_TACTICAL_QUERIES = [
  {
    icon: Wind,
    label: "Runways & Braking Action",
    focus: "runways" as const,
    question: "Analyze active runway friction (mu), crosswinds, and ILS Cat III approach suitability.",
  },
  {
    icon: Compass,
    label: "Sector Separation & Holds",
    focus: "airport" as const,
    question: "Evaluate sector arrival rate, holding stacks at CAMRN, and spacing compression risks.",
  },
  {
    icon: ShieldAlert,
    label: "Emergency Diversion Protocol",
    focus: "emergencies" as const,
    question: "Review emergency priority protocols for FDX901 hydraulic caution and staging fire rescue.",
  },
  {
    icon: Clock,
    label: "Ramp Turnaround Delays",
    focus: "delays" as const,
    question: "Audit gate stand bottlenecks, pushback queue sequencing, and fueling timeline delays.",
  },
];

export function AiBriefingDrawer({
  portalName = "Air Traffic Control",
  defaultFocus = "airport",
}: {
  portalName?: string;
  defaultFocus?: "airport" | "delays" | "emergencies" | "staffing" | "runways";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [focus, setFocus] = useState<"airport" | "delays" | "emergencies" | "staffing" | "runways">(defaultFocus);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [briefingResult, setBriefingResult] = useState<AiBriefingPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completedActions, setCompletedActions] = useState<Record<number, boolean>>({});
  const [audioEnabled, setAudioEnabled] = useState(true);

  const playChime = useCallback(
    (freq1 = 587.33, freq2 = 880) => {
      if (!audioEnabled || typeof window === "undefined") return;
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.frequency.setValueAtTime(freq1, now);
        osc2.frequency.setValueAtTime(freq2, now + 0.1);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc1.stop(now + 0.1);
        osc2.start(now + 0.1);
        osc2.stop(now + 0.35);
      } catch {
        // audio context blocked
      }
    },
    [audioEnabled]
  );

  const requestBriefing = async (queryText: string, queryFocus: typeof focus) => {
    if (!queryText.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          focus: queryFocus,
          question: queryText.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}: Failed to generate briefing`);
      }

      const data: AiBriefingPayload = await res.json();
      setBriefingResult(data);
      setCompletedActions({});
      playChime(660, 990);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate AI tactical briefing");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (preset: (typeof PRESET_TACTICAL_QUERIES)[number]) => {
    setQuestion(preset.question);
    setFocus(preset.focus);
    requestBriefing(preset.question, preset.focus);
  };

  const toggleActionDone = (index: number) => {
    setCompletedActions((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <div className="w-full">
      {/* Trigger / Summary Bar */}
      <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-cyan-950/20 backdrop-blur-md p-3 sm:p-4 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-600/20 border border-cyan-500/40 text-cyan-400">
            <Sparkles className="h-5 w-5 animate-pulse text-cyan-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                AOCC AI Tactical Briefing Copilot
              </h3>
              <Badge className="text-[10px] font-mono border-cyan-500/40 bg-cyan-950/40 text-cyan-300">
                Gemini Flash & Sim Neural
              </Badge>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Live generative & algorithmic intelligence for {portalName} operators.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs font-mono text-slate-400 hover:text-white"
            onClick={() => setAudioEnabled(!audioEnabled)}
          >
            {audioEnabled ? <Volume2 className="h-3.5 w-3.5 text-emerald-400" /> : <VolumeX className="h-3.5 w-3.5 text-slate-500" />}
          </Button>
          <Button
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="h-8 px-3 text-xs font-mono bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition flex items-center gap-1.5 shadow-md shadow-cyan-900/30"
          >
            <Bot className="h-3.5 w-3.5" />
            {isOpen ? "Close Copilot" : "Open Briefing Copilot"}
            {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Expanded Briefing Copilot Drawer */}
      {isOpen && (
        <Card className="mt-3 border-cyan-500/30 bg-slate-900/95 backdrop-blur-2xl shadow-2xl transition-all">
          <CardHeader className="pb-3 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold font-mono text-white flex items-center gap-2">
                  <Brain className="h-4 w-4 text-cyan-400" />
                  Tactical Airspace & Operations Reasoning
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 font-mono">
                  Select a live operational query or enter custom ATC instructions for evaluation.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Quick Query Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-3">
              {PRESET_TACTICAL_QUERIES.map((preset, idx) => {
                const IconComponent = preset.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-cyan-500/50 hover:bg-cyan-950/20 text-left transition flex items-center gap-2.5 text-xs text-slate-300 font-mono group"
                  >
                    <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-cyan-400 group-hover:text-cyan-300 group-hover:border-cyan-500/60">
                      <IconComponent className="h-3.5 w-3.5" />
                    </div>
                    <span className="truncate">{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-4">
            {/* Custom Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                requestBriefing(question, focus);
              }}
              className="flex flex-col sm:flex-row gap-2"
            >
              <div className="flex-1 relative">
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask tactical guidance (e.g. recommend runway assignment for heavy B772 arrival...)"
                  className="bg-slate-950/80 border-slate-800 text-slate-100 font-mono text-xs pr-10 focus-visible:ring-cyan-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={focus}
                  onChange={(e) => setFocus(e.target.value as typeof focus)}
                  className="h-10 px-3 rounded-md border border-slate-800 bg-slate-950 text-slate-300 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="airport">Airspace / Tower</option>
                  <option value="runways">Runway Surface / ILS</option>
                  <option value="emergencies">Emergency Incidents</option>
                  <option value="delays">Turnaround & Ramp</option>
                  <option value="staffing">Staff Readiness</option>
                </select>

                <Button
                  type="submit"
                  disabled={loading || !question.trim()}
                  className="h-10 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs rounded-lg flex items-center gap-1.5"
                >
                  {loading ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  {loading ? "Analyzing..." : "Brief"}
                </Button>
              </div>
            </form>

            {/* Error state */}
            {error && (
              <div className="p-3 rounded-xl border border-red-500/40 bg-red-950/20 text-red-300 font-mono text-xs flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Briefing Result Output */}
            {briefingResult && (
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3 font-mono">
                {/* Result Header Badges */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 uppercase">Assessment Severity:</span>
                    <Badge
                      className={`text-xs font-bold ${
                        briefingResult.risk === "CRITICAL"
                          ? "bg-red-500/20 text-red-400 border-red-500/50 animate-pulse"
                          : briefingResult.risk === "WARNING"
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
                          : briefingResult.risk === "ADVISORY"
                          ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50"
                          : "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                      }`}
                    >
                      {briefingResult.risk}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span>Engine:</span>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-slate-700 text-slate-300">
                      {briefingResult.model}
                    </Badge>
                    {briefingResult.simulated && (
                      <span className="text-slate-500">(Deterministic Fallback)</span>
                    )}
                  </div>
                </div>

                {/* Briefing Narrative */}
                <div className="text-xs leading-relaxed text-slate-200 bg-slate-900/60 p-3 rounded-lg border border-slate-800/60">
                  {briefingResult.briefing}
                </div>

                {/* Action Items Checklist */}
                {briefingResult.actions && briefingResult.actions.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                      <CheckSquare className="h-3.5 w-3.5 text-cyan-400" />
                      Tactical Action Items Checklist
                    </span>
                    <div className="space-y-1.5">
                      {briefingResult.actions.map((action, idx) => {
                        const isDone = !!completedActions[idx];
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => toggleActionDone(idx)}
                            className={`w-full text-left p-2 rounded-lg border text-xs transition flex items-start gap-2.5 ${
                              isDone
                                ? "border-emerald-500/30 bg-emerald-950/20 text-slate-400 line-through"
                                : "border-slate-800 bg-slate-900/40 text-slate-200 hover:border-slate-700"
                            }`}
                          >
                            {isDone ? (
                              <CheckSquare className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                            ) : (
                              <Square className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                            )}
                            <span className="flex-1">{action}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
