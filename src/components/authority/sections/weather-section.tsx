"use client";

import { useState, useMemo } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  Compass,
  Droplets,
  Eye,
  Gauge,
  Navigation,
  RefreshCw,
  Sun,
  Thermometer,
  Wind,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export interface AirportWeather {
  station: string;
  name: string;
  metar: string;
  taf: string;
  windDir: number;
  windSpeedKts: number;
  gustKts?: number;
  visibilitySm: string;
  clouds: string;
  tempC: number;
  dewPointC: number;
  altimeterInHg: string;
  qnhHpa: number;
  flightCategory: "VFR" | "MVFR" | "IFR" | "LIFR";
  condition: "CLEAR" | "RAIN" | "THUNDER" | "FOG";
  activeRunways: { code: string; headingDeg: number }[];
}

const WEATHER_REPORTS: AirportWeather[] = [
  {
    station: "KJFK",
    name: "New York John F. Kennedy International",
    metar: "KJFK 211151Z 06014G22KT 10SM BKN045 OVC090 14/08 A3002 RMK AO2 SLP164",
    taf: "KJFK 211120Z 2112/2218 06015KT P6SM BKN050 FM211800 08018G25KT 5SM -RA BR BKN030 OVC060",
    windDir: 60,
    windSpeedKts: 14,
    gustKts: 22,
    visibilitySm: "10 SM (16 KM)",
    clouds: "Broken at 4,500 FT, Overcast at 9,000 FT",
    tempC: 14,
    dewPointC: 8,
    altimeterInHg: "30.02 inHg",
    qnhHpa: 1016,
    flightCategory: "VFR",
    condition: "CLEAR",
    activeRunways: [
      { code: "04L", headingDeg: 44 },
      { code: "04R", headingDeg: 44 },
      { code: "13L", headingDeg: 134 },
      { code: "22R", headingDeg: 224 },
      { code: "31L", headingDeg: 314 },
    ],
  },
  {
    station: "VOHS",
    name: "Hyderabad Rajiv Gandhi International",
    metar: "VOHS 211130Z 09009KT 6000 FEW025 SCT080 32/21 Q1010 NOSIG",
    taf: "VOHS 211000Z 2112/2218 09010KT 6000 SCT030 FM220000 12006KT 5000 HZ",
    windDir: 90,
    windSpeedKts: 9,
    visibilitySm: "6,000 M",
    clouds: "Few at 2,500 FT, Scattered at 8,000 FT",
    tempC: 32,
    dewPointC: 21,
    altimeterInHg: "29.83 inHg",
    qnhHpa: 1010,
    flightCategory: "VFR",
    condition: "CLEAR",
    activeRunways: [
      { code: "09L", headingDeg: 92 },
      { code: "27R", headingDeg: 272 },
    ],
  },
  {
    station: "VABB",
    name: "Mumbai Chhatrapati Shivaji Maharaj",
    metar: "VABB 211140Z 27016G26KT 4000 +TSRA BKN015CB OVC070 28/25 Q1008 TEMPO 2000 TSRA",
    taf: "VABB 210900Z 2112/2218 26018G28KT 3000 +TSRA BKN012CB TEMPO 2114/2118 1500 TSRA",
    windDir: 270,
    windSpeedKts: 16,
    gustKts: 26,
    visibilitySm: "4,000 M (Reduced in heavy rain)",
    clouds: "Broken CB at 1,500 FT, Overcast at 7,000 FT",
    tempC: 28,
    dewPointC: 25,
    altimeterInHg: "29.77 inHg",
    qnhHpa: 1008,
    flightCategory: "IFR",
    condition: "THUNDER",
    activeRunways: [
      { code: "09", headingDeg: 90 },
      { code: "27", headingDeg: 270 },
      { code: "14", headingDeg: 140 },
    ],
  },
  {
    station: "VIDP",
    name: "Delhi Indira Gandhi International",
    metar: "VIDP 211130Z 30008KT 2500 HZ NSC 27/17 Q1012 NOSIG",
    taf: "VIDP 210900Z 2112/2218 31008KT 3000 HZ NSC BECMG 2120/2122 1500 FU",
    windDir: 300,
    windSpeedKts: 8,
    visibilitySm: "2,500 M (Haze)",
    clouds: "Nil Significant Cloud",
    tempC: 27,
    dewPointC: 17,
    altimeterInHg: "29.88 inHg",
    qnhHpa: 1012,
    flightCategory: "MVFR",
    condition: "FOG",
    activeRunways: [
      { code: "10", headingDeg: 100 },
      { code: "28", headingDeg: 280 },
      { code: "11L", headingDeg: 110 },
      { code: "29R", headingDeg: 290 },
    ],
  },
  {
    station: "EGLL",
    name: "London Heathrow Airport",
    metar: "EGLL 211120Z 24011KT 9999 FEW030 16/09 Q1020 NOSIG",
    taf: "EGLL 211100Z 2112/2218 23012KT 9999 SCT035 PROB30 TEMPO 2202/2206 BKN012",
    windDir: 240,
    windSpeedKts: 11,
    visibilitySm: "10+ KM (9999)",
    clouds: "Few at 3,000 FT",
    tempC: 16,
    dewPointC: 9,
    altimeterInHg: "30.12 inHg",
    qnhHpa: 1020,
    flightCategory: "VFR",
    condition: "CLEAR",
    activeRunways: [
      { code: "09L", headingDeg: 92 },
      { code: "27R", headingDeg: 272 },
    ],
  },
];

export function WeatherSection() {
  const [reports, setReports] = useState<AirportWeather[]>(WEATHER_REPORTS);
  const [selectedStation, setSelectedStation] = useState<string>("KJFK");
  const [selectedRwyIndex, setSelectedRwyIndex] = useState<number>(0);

  const current = reports.find((r) => r.station === selectedStation) || reports[0];
  const activeRunways = current.activeRunways || [];
  const selectedRunway = activeRunways[selectedRwyIndex] || activeRunways[0] || { code: "04L", headingDeg: 44 };

  // Calculate Trigonometric Crosswind & Headwind Vectors
  const { headwindKts, crosswindKts, isTailwind, crosswindSide } = useMemo(() => {
    const angleDiff = ((current.windDir - selectedRunway.headingDeg + 180) % 360) - 180;
    const rad = (angleDiff * Math.PI) / 180;
    const windSpeed = current.windSpeedKts;

    const rawHeadwind = Math.round(windSpeed * Math.cos(rad));
    const rawCrosswind = Math.round(Math.abs(windSpeed * Math.sin(rad)));
    const side = angleDiff > 0 ? "Right" : "Left";

    return {
      headwindKts: Math.abs(rawHeadwind),
      crosswindKts: rawCrosswind,
      isTailwind: rawHeadwind < 0,
      crosswindSide: rawCrosswind === 0 ? "Direct" : side,
    };
  }, [current.windDir, current.windSpeedKts, selectedRunway.headingDeg]);

  const crosswindRisk =
    crosswindKts > 25
      ? "CRITICAL"
      : crosswindKts > 15
      ? "CAUTION"
      : "SAFE";

  const getConditionIcon = (cond: AirportWeather["condition"]) => {
    switch (cond) {
      case "THUNDER":
        return <CloudLightning className="h-6 w-6 text-amber-400 animate-bounce" />;
      case "RAIN":
        return <CloudRain className="h-6 w-6 text-sky-400" />;
      case "FOG":
        return <CloudFog className="h-6 w-6 text-zinc-400" />;
      default:
        return <Sun className="h-6 w-6 text-amber-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Wind className="h-6 w-6 text-cyan-400" />
            Aviation Weather Observations, METAR/TAF & Crosswind Engine
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Standard atmospheric observations, runway crosswind component vectors, barometric altimetry (QNH), and terminal forecasts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedStation}
            onChange={(e) => {
              setSelectedStation(e.target.value);
              setSelectedRwyIndex(0);
            }}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-mono text-white focus:ring-1 focus:ring-cyan-500"
          >
            {reports.map((r) => (
              <option key={r.station} value={r.station}>
                {r.station} — {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Meteorological Card */}
      <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-xl">
        <CardHeader className="pb-3 border-b border-slate-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30">
                {getConditionIcon(current.condition)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-mono font-bold text-white tracking-tight">
                    {current.station}
                  </span>
                  <Badge
                    className={`text-xs font-mono ${
                      current.flightCategory === "VFR"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        : current.flightCategory === "MVFR"
                        ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
                        : "bg-red-500/20 text-red-400 border-red-500/40"
                    }`}
                  >
                    {current.flightCategory} FLIGHT RULES
                  </Badge>
                </div>
                <CardTitle className="text-sm text-slate-300 font-mono">{current.name}</CardTitle>
              </div>
            </div>

            <div className="flex items-center gap-4 text-right font-mono">
              <div>
                <div className="text-3xl font-bold text-white">{current.tempC}°C</div>
                <span className="text-[11px] text-slate-400">Dewpoint: {current.dewPointC}°C</span>
              </div>
              <div className="border-l border-slate-800 pl-4">
                <div className="text-sm font-bold text-cyan-300">QNH {current.qnhHpa}</div>
                <span className="text-[10px] text-slate-500">{current.altimeterInHg}</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4 font-mono text-xs">
          {/* Raw METAR String */}
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
              Raw Operational METAR:
            </span>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-200 select-all leading-relaxed">
              {current.metar}
            </div>
          </div>

          {/* Core Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/50 space-y-1">
              <span className="text-slate-400 uppercase flex items-center gap-1.5 text-[10px]">
                <Wind className="h-3.5 w-3.5 text-cyan-400" /> Surface Wind
              </span>
              <div className="font-bold text-base text-white">
                {current.windDir}° at {current.windSpeedKts} kts
                {current.gustKts ? ` (G${current.gustKts})` : ""}
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/50 space-y-1">
              <span className="text-slate-400 uppercase flex items-center gap-1.5 text-[10px]">
                <Eye className="h-3.5 w-3.5 text-purple-400" /> Visibility
              </span>
              <div className="font-bold text-base text-white">{current.visibilitySm}</div>
            </div>

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/50 space-y-1">
              <span className="text-slate-400 uppercase flex items-center gap-1.5 text-[10px]">
                <Gauge className="h-3.5 w-3.5 text-amber-400" /> Altimeter Setting
              </span>
              <div className="font-bold text-base text-white">{current.altimeterInHg}</div>
            </div>

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/50 space-y-1">
              <span className="text-slate-400 uppercase flex items-center gap-1.5 text-[10px]">
                <Cloud className="h-3.5 w-3.5 text-blue-400" /> Cloud Ceiling
              </span>
              <div className="font-bold text-xs text-white truncate">{current.clouds}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Runway Crosswind Component Vector Calculator HUD */}
      <Card className="border-cyan-500/30 bg-slate-900/80 backdrop-blur-xl shadow-xl font-mono">
        <CardHeader className="pb-3 border-b border-slate-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Compass className="h-4 w-4 text-cyan-400" />
                Runway Crosswind & Headwind Vector Calculator
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Calculates aerodynamic wind components against the selected runway magnetic centerline.
              </CardDescription>
            </div>
            {/* Runway Selector Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {activeRunways.map((rwy, idx) => (
                <button
                  key={rwy.code}
                  type="button"
                  onClick={() => setSelectedRwyIndex(idx)}
                  className={`px-3 py-1 rounded-lg text-xs transition border ${
                    selectedRwyIndex === idx
                      ? "border-cyan-500/60 bg-cyan-950/40 text-cyan-200 font-bold ring-1 ring-cyan-500/40"
                      : "border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white"
                  }`}
                >
                  RWY {rwy.code} ({rwy.headingDeg}°)
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
            {/* Vector 1: Headwind / Tailwind */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 uppercase text-[10px]">Longitudinal Component</span>
                <Badge
                  variant="outline"
                  className={`text-[9px] ${
                    isTailwind ? "text-red-400 border-red-500/40" : "text-emerald-400 border-emerald-500/40"
                  }`}
                >
                  {isTailwind ? "TAILWIND" : "HEADWIND"}
                </Badge>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">{headwindKts}</span>
                <span className="text-xs text-slate-400">KNOTS</span>
              </div>
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                {isTailwind ? (
                  <ArrowDown className="h-3 w-3 text-red-400" />
                ) : (
                  <ArrowUp className="h-3 w-3 text-emerald-400" />
                )}
                {isTailwind ? "Tailwind component degrades takeoff/landing roll" : "Favorable headwind for lift generation"}
              </div>
            </div>

            {/* Vector 2: Direct Crosswind */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 uppercase text-[10px]">Lateral Crosswind Component</span>
                <Badge
                  className={`text-[9px] font-bold ${
                    crosswindRisk === "CRITICAL"
                      ? "bg-red-500/20 text-red-400 border-red-500/50 animate-pulse"
                      : crosswindRisk === "CAUTION"
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
                      : "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                  }`}
                >
                  {crosswindRisk}
                </Badge>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-cyan-300">{crosswindKts}</span>
                <span className="text-xs text-slate-400">KNOTS ({crosswindSide})</span>
              </div>
              <div className="text-[10px] text-slate-500">
                Max demonstrated limit: 33 kt (Narrowbody) / 38 kt (Widebody)
              </div>
            </div>

            {/* Vector 3: Centerline Alignment Summary */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between space-y-2">
              <span className="text-slate-400 uppercase text-[10px]">Centerline Angular Delta</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">
                  {Math.abs(current.windDir - selectedRunway.headingDeg)}°
                </span>
                <span className="text-xs text-slate-400">
                  (Wind {current.windDir}° vs RWY {selectedRunway.headingDeg}°)
                </span>
              </div>
              <div className="text-[10px] text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Runway {selectedRunway.code} ILS Localizer Active
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Terminal Aerodrome Forecast (TAF) Card */}
      <Card className="border-slate-800 bg-slate-900/80 font-mono text-xs">
        <CardHeader className="py-3 px-4 border-b border-slate-800">
          <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            Decoded Terminal Aerodrome Forecast (TAF Trend)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-2 text-slate-300">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 select-all leading-relaxed">
            {current.taf}
          </div>
          <p className="text-[10px] text-slate-500">
            Valid through 24h operational window. Issued by National Aviation Meteorological Authority.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
