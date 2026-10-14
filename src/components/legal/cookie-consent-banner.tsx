"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, Shield, Check, X, Sliders, ChevronDown, ChevronUp, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "aocc_cookie_consent_preferences_v1";

export interface CookiePreferences {
  strictlyNecessary: boolean;
  functionalRadar: boolean;
  performanceTelemetry: boolean;
  timestamp: string;
}

const DEFAULT_PREFERENCES: CookiePreferences = {
  strictlyNecessary: true,
  functionalRadar: true,
  performanceTelemetry: true,
  timestamp: new Date().toISOString(),
};

export function CookieConsentBanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // Show after a brief delay for optimal UX
        const timer = setTimeout(() => setIsOpen(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage may be disabled
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      //
    }
    setPreferences(prefs);
    setIsOpen(false);
  };

  const handleAcceptAll = () => {
    savePreferences({
      strictlyNecessary: true,
      functionalRadar: true,
      performanceTelemetry: true,
      timestamp: new Date().toISOString(),
    });
  };

  const handleEssentialOnly = () => {
    savePreferences({
      strictlyNecessary: true,
      functionalRadar: false,
      performanceTelemetry: false,
      timestamp: new Date().toISOString(),
    });
  };

  const handleSaveCustom = () => {
    savePreferences({
      ...preferences,
      strictlyNecessary: true, // Always required
      timestamp: new Date().toISOString(),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 md:p-6 pointer-events-none">
      <div className="max-w-4xl mx-auto pointer-events-auto bg-[#0a0f1d]/95 backdrop-blur-xl border border-sky-500/30 rounded-2xl p-5 md:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.85)] text-slate-200 animate-in fade-in slide-in-from-bottom-6 duration-300">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 shrink-0 mt-0.5">
              <Cookie className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-white tracking-wide">
                  AOCC Privacy & Cookie Consent
                </h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-sky-950/60 border border-sky-500/40 text-sky-300">
                  Aviation Telemetry
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                We use strictly necessary cookies to maintain secure authenticated session state, and optional
                functional cookies to cache high-refresh ADS-B radar trajectories, Blackbox FDR audio, and system telemetry.
                Review our{" "}
                <Link href="/cookies" className="text-sky-400 underline hover:text-sky-300 font-medium">
                  Cookie Policy
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-sky-400 underline hover:text-sky-300 font-medium">
                  Privacy Policy
                </Link>.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0 flex-wrap justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreferences(!showPreferences)}
              className="border-slate-700 bg-slate-900/80 text-slate-300 hover:text-white text-xs font-mono h-8"
            >
              <Sliders className="h-3.5 w-3.5 mr-1 text-slate-400" />
              Customize
              {showPreferences ? (
                <ChevronUp className="h-3 w-3 ml-1 text-slate-500" />
              ) : (
                <ChevronDown className="h-3 w-3 ml-1 text-slate-500" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEssentialOnly}
              className="border-slate-700 bg-slate-900/80 text-slate-300 hover:text-white text-xs h-8"
            >
              Essential Only
            </Button>
            <Button
              size="sm"
              onClick={handleAcceptAll}
              className="bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-lg shadow-sky-600/20 h-8"
            >
              Accept All Cookies
            </Button>
          </div>
        </div>

        {/* Detailed Preference Drawer */}
        {showPreferences && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3 animate-in fade-in duration-200">
            <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
              Cookie Categories & Consent Configuration:
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* Category 1: Strictly Necessary */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-emerald-400" />
                    Strictly Necessary
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    ALWAYS ACTIVE
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Required for user authentication, RBAC authorization, and CSRF protection. Cannot be disabled.
                </p>
              </div>

              {/* Category 2: Functional Radar & Telemetry */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-sky-400" />
                    Functional & Audio
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.functionalRadar}
                    onChange={(e) =>
                      setPreferences({ ...preferences, functionalRadar: e.target.checked })
                    }
                    className="accent-sky-500 h-4 w-4 rounded cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Stores VHF squelch audio volume, Blackbox replay speed, and cockpit radar viewport settings.
                </p>
              </div>

              {/* Category 3: Simulation Analytics */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-purple-400" />
                    Telemetry Analytics
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.performanceTelemetry}
                    onChange={(e) =>
                      setPreferences({ ...preferences, performanceTelemetry: e.target.checked })
                    }
                    className="accent-purple-500 h-4 w-4 rounded cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Anonymous simulation metric aggregation used to monitor 10,000-staff workload and latency.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                onClick={handleSaveCustom}
                className="bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/30 text-xs font-mono"
              >
                Save My Preferences
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
