"use client";

import { useState } from "react";
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  Compass,
  Droplets,
  Eye,
  Gauge,
  RefreshCw,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AirportWeather {
  station: string;
  name: string;
  metar: string;
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
}

const WEATHER_REPORTS: AirportWeather[] = [
  {
    station: "KJFK",
    name: "New York John F. Kennedy",
    metar: "KJFK 201451Z 04012G18KT 10SM BKN045 OVC090 18/12 A3002 RMK AO2 SLP164",
    windDir: 40,
    windSpeedKts: 12,
    gustKts: 18,
    visibilitySm: "10 SM (16 KM)",
    clouds: "Broken at 4,500 FT, Overcast at 9,000 FT",
    tempC: 18,
    dewPointC: 12,
    altimeterInHg: "30.02 inHg",
    qnhHpa: 1016,
    flightCategory: "VFR",
    condition: "CLEAR",
  },
  {
    station: "VOHS",
    name: "Hyderabad Rajiv Gandhi Intl",
    metar: "VOHS 201430Z 09008KT 6000 FEW025 SCT080 31/22 Q1010 NOSIG",
    windDir: 90,
    windSpeedKts: 8,
    visibilitySm: "6,000 M",
    clouds: "Few at 2,500 FT, Scattered at 8,000 FT",
    tempC: 31,
    dewPointC: 22,
    altimeterInHg: "29.83 inHg",
    qnhHpa: 1010,
    flightCategory: "VFR",
    condition: "CLEAR",
  },
  {
    station: "VABB",
    name: "Mumbai Chhatrapati Shivaji",
    metar: "VABB 201440Z 26014KT 4000 +TSRA BKN015CB OVC070 28/25 Q1008 TEMPO 2000 TSRA",
    windDir: 260,
    windSpeedKts: 14,
    visibilitySm: "4,000 M (Reduced in heavy rain)",
    clouds: "Broken CB at 1,500 FT, Overcast at 7,000 FT",
    tempC: 28,
    dewPointC: 25,
    altimeterInHg: "29.77 inHg",
    qnhHpa: 1008,
    flightCategory: "IFR",
    condition: "THUNDER",
  },
  {
    station: "VIDP",
    name: "Delhi Indira Gandhi Intl",
    metar: "VIDP 201430Z 29006KT 2500 HZ NSC 26/18 Q1012 NOSIG",
    windDir: 290,
    windSpeedKts: 6,
    visibilitySm: "2,500 M (Haze)",
    clouds: "Nil Significant Cloud",
    tempC: 26,
    dewPointC: 18,
    altimeterInHg: "29.88 inHg",
    qnhHpa: 1012,
    flightCategory: "MVFR",
    condition: "FOG",
  },
  {
    station: "OMDB",
    name: "Dubai International",
    metar: "OMDB 201400Z 34010KT CAVOK 36/19 Q1009 NOSIG",
    windDir: 340,
    windSpeedKts: 10,
    visibilitySm: "10+ KM (CAVOK)",
    clouds: "Sky Clear (CAVOK)",
    tempC: 36,
    dewPointC: 19,
    altimeterInHg: "29.80 inHg",
    qnhHpa: 1009,
    flightCategory: "VFR",
    condition: "CLEAR",
  },
  {
    station: "WSSS",
    name: "Singapore Changi Airport",
    metar: "WSSS 201430Z 12006KT 9000 -RA FEW018TCU SCT030 BKN140 29/25 Q1011 NOSIG",
    windDir: 120,
    windSpeedKts: 6,
    visibilitySm: "9,000 M (-Light Rain)",
    clouds: "Few TCU at 1,800 FT, Scattered at 3,000 FT",
    tempC: 29,
    dewPointC: 25,
    altimeterInHg: "29.85 inHg",
    qnhHpa: 1011,
    flightCategory: "VFR",
    condition: "RAIN",
  },
];

export function WeatherSection() {
  const [reports, setReports] = useState<AirportWeather[]>(WEATHER_REPORTS);
  const [selectedStation, setSelectedStation] = useState<string>("KJFK");

  const current = reports.find((r) => r.station === selectedStation) || reports[0];

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Wind className="h-6 w-6 text-primary" />
            Aviation Weather Observations (METAR & TAF)
          </h2>
          <p className="text-sm text-muted-foreground">
            Aviation meteorological observations, barometric altimeter settings (QNH), and instrument flight rules (IFR/VFR) criteria.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold"
          >
            {reports.map((r) => (
              <option key={r.station} value={r.station}>
                {r.station} — {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hero Weather Card for Selected Station */}
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                {getConditionIcon(current.condition)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-mono font-bold text-foreground">
                    {current.station}
                  </span>
                  <Badge
                    variant={
                      current.flightCategory === "VFR"
                        ? "default"
                        : current.flightCategory === "MVFR"
                        ? "warning"
                        : "destructive"
                    }
                  >
                    {current.flightCategory} CONDITIONS
                  </Badge>
                </div>
                <CardTitle className="text-base font-semibold">{current.name}</CardTitle>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-mono font-bold text-foreground">{current.tempC}°C</div>
              <span className="text-xs text-muted-foreground">Dewpoint: {current.dewPointC}°C</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Raw METAR String */}
          <div className="p-3 rounded bg-muted/60 border border-border font-mono text-xs text-foreground select-all">
            {current.metar}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-lg border border-border/50 bg-background/50 space-y-1">
              <span className="text-muted-foreground uppercase flex items-center gap-1.5 text-[11px]">
                <Wind className="h-3.5 w-3.5 text-primary" /> Surface Wind
              </span>
              <div className="font-mono font-bold text-base text-foreground">
                {current.windDir}° at {current.windSpeedKts} kts
                {current.gustKts ? ` (G${current.gustKts})` : ""}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-border/50 bg-background/50 space-y-1">
              <span className="text-muted-foreground uppercase flex items-center gap-1.5 text-[11px]">
                <Eye className="h-3.5 w-3.5 text-primary" /> Surface Visibility
              </span>
              <div className="font-mono font-bold text-base text-foreground">
                {current.visibilitySm}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-border/50 bg-background/50 space-y-1">
              <span className="text-muted-foreground uppercase flex items-center gap-1.5 text-[11px]">
                <Gauge className="h-3.5 w-3.5 text-primary" /> Barometric Altimeter
              </span>
              <div className="font-mono font-bold text-base text-foreground">
                QNH {current.qnhHpa} hPa ({current.altimeterInHg})
              </div>
            </div>

            <div className="p-3 rounded-lg border border-border/50 bg-background/50 space-y-1">
              <span className="text-muted-foreground uppercase flex items-center gap-1.5 text-[11px]">
                <Cloud className="h-3.5 w-3.5 text-primary" /> Cloud Ceiling
              </span>
              <div className="font-semibold text-xs text-foreground line-clamp-1">
                {current.clouds}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weather Stations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((item) => (
          <Card
            key={item.station}
            onClick={() => setSelectedStation(item.station)}
            className={`cursor-pointer transition-all border ${
              selectedStation === item.station
                ? "border-primary bg-primary/5"
                : "border-border/60 bg-card/70 hover:bg-card"
            }`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-base text-foreground">
                    {item.station}
                  </span>
                  <Badge
                    variant={item.flightCategory === "VFR" ? "default" : "destructive"}
                    className="text-[10px] px-1 py-0"
                  >
                    {item.flightCategory}
                  </Badge>
                </div>
                <span className="text-xs font-mono text-muted-foreground">{item.tempC}°C</span>
              </div>
              <CardDescription className="text-xs line-clamp-1">{item.name}</CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <div>Wind: {item.windDir}° / {item.windSpeedKts}kt</div>
              <div>Vis: {item.visibilitySm}</div>
              <div>QNH: {item.qnhHpa} hPa</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
