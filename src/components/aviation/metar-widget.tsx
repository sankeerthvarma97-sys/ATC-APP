"use client";

import { useEffect, useState } from "react";
import { Cloud, Compass, Gauge, RefreshCw, Thermometer, Wind } from "lucide-react";
import type { MetarReport } from "@/lib/services/weather-service";
import { Badge } from "@/components/ui/badge";

export function MetarWidget({ station = "HYD" }: { station?: string }) {
  const [report, setReport] = useState<MetarReport | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshWeather = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/weather/metar?station=${station}`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok) setReport(data.metar);
      }
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch(`/api/weather/metar?station=${station}`)
      .then((res) => res.json())
      .then((data) => {
        if (active && data.ok) setReport(data.metar);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [station]);

  if (!report) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 font-mono text-xs text-slate-400 flex items-center justify-between">
        <span>Loading METAR for {station}...</span>
        <RefreshCw className="h-3.5 w-3.5 animate-spin text-sky-400" />
      </div>
    );
  }

  const categoryColor =
    report.flightCategory === "VFR"
      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
      : report.flightCategory === "MVFR"
      ? "bg-blue-500/20 text-blue-400 border-blue-500/40"
      : "bg-amber-500/20 text-amber-400 border-amber-500/40";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-xs text-slate-200 shadow-xl space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <Cloud className="h-4 w-4 text-sky-400" />
          <span className="font-bold text-white tracking-wide">{report.station} ({station})</span>
          <span className="text-[10px] text-slate-400 truncate max-w-[140px] sm:max-w-none">
            {report.stationName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-[10px] ${categoryColor}`}>
            {report.flightCategory}
          </Badge>
          <button
            onClick={() => void refreshWeather()}
            disabled={loading}
            className="p-1 text-slate-400 hover:text-white transition"
            title="Refresh METAR"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Raw METAR String */}
      <div className="rounded bg-slate-900/90 px-2.5 py-1.5 text-[11px] text-sky-300 font-mono tracking-wider border border-slate-800/80 overflow-x-auto">
        {report.raw}
      </div>

      {/* Key Atmospheric Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        {/* Surface Winds */}
        <div className="rounded-lg bg-slate-900/50 p-2 border border-slate-800/60">
          <div className="text-[10px] text-slate-400 flex items-center gap-1">
            <Wind className="h-3 w-3 text-cyan-400" />
            <span>SURFACE WIND</span>
          </div>
          <div className="text-sm font-bold text-white mt-1">
            {String(report.wind.direction).padStart(3, "0")}° @ {report.wind.speed} kt
            {report.wind.gust ? <span className="text-amber-400 text-xs ml-1">G{report.wind.gust}</span> : null}
          </div>
        </div>

        {/* Temperature / Dew Point */}
        <div className="rounded-lg bg-slate-900/50 p-2 border border-slate-800/60">
          <div className="text-[10px] text-slate-400 flex items-center gap-1">
            <Thermometer className="h-3 w-3 text-rose-400" />
            <span>TEMP / DEW</span>
          </div>
          <div className="text-sm font-bold text-white mt-1">
            {report.temperatureC}°C / {report.dewPointC}°C
          </div>
        </div>

        {/* Altimeter QNH */}
        <div className="rounded-lg bg-slate-900/50 p-2 border border-slate-800/60">
          <div className="text-[10px] text-slate-400 flex items-center gap-1">
            <Gauge className="h-3 w-3 text-emerald-400" />
            <span>ALTIMETER (QNH)</span>
          </div>
          <div className="text-sm font-bold text-white mt-1">
            Q{report.altimeterHpa} <span className="text-[10px] text-slate-400 font-normal">({report.altimeterInHg}&quot;)</span>
          </div>
        </div>

        {/* Visibility */}
        <div className="rounded-lg bg-slate-900/50 p-2 border border-slate-800/60">
          <div className="text-[10px] text-slate-400 flex items-center gap-1">
            <Compass className="h-3 w-3 text-indigo-400" />
            <span>VISIBILITY</span>
          </div>
          <div className="text-sm font-bold text-white mt-1">
            {report.visibilityMeters >= 9999 ? "10+ km (CAVOK)" : `${report.visibilityMeters}m`}
          </div>
        </div>
      </div>

      {/* Runway Crosswind Breakdown */}
      {report.runwayAnalysis.length > 0 && (
        <div className="border-t border-slate-800/60 pt-2">
          <div className="text-[10px] text-slate-400 mb-1.5 uppercase tracking-wider">
            Active Runway Wind Components:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {report.runwayAnalysis.slice(0, 2).map((rwy) => (
              <div
                key={rwy.runwayId}
                className="flex items-center justify-between rounded bg-slate-900/40 px-2.5 py-1.5 border border-slate-800/60 text-[11px]"
              >
                <span className="font-bold text-sky-300">{rwy.runwayId}</span>
                <span className="text-slate-300">
                  Headwind: <span className="text-white font-semibold">{rwy.headwindKt} kt</span>
                </span>
                <span className={rwy.crosswindKt > 15 ? "text-rose-400 font-bold" : "text-emerald-400"}>
                  X-Wind: {rwy.crosswindKt} kt ({rwy.crosswindDir})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
