"use client";

import { useState } from "react";
import {
  Compass,
  Gauge,
  Navigation,
  RefreshCw,
  Wind,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RunwayDTO } from "@/lib/domain";

const INITIAL_RUNWAYS: RunwayDTO[] = [
  { id: "rwy-04l-jfk", airportId: "JFK", code: "04L/22R", headingDeg: 44, lengthMeters: 3682, status: "OCCUPIED", wind: "040/12kt", approachType: "CAT IIIb ILS" },
  { id: "rwy-04r-jfk", airportId: "JFK", code: "04R/22L", headingDeg: 44, lengthMeters: 2560, status: "AVAILABLE", wind: "040/12kt", approachType: "CAT I ILS" },
  { id: "rwy-13l-jfk", airportId: "JFK", code: "13L/31R", headingDeg: 134, lengthMeters: 4423, status: "AVAILABLE", wind: "040/12kt", approachType: "CAT II ILS" },
  { id: "rwy-13r-jfk", airportId: "JFK", code: "13R/31L", headingDeg: 134, lengthMeters: 3048, status: "RESERVED", wind: "040/12kt", approachType: "RNAV (GPS)" },
  { id: "rwy-09l-hyd", airportId: "HYD", code: "09L/27R", headingDeg: 92, lengthMeters: 4260, status: "AVAILABLE", wind: "090/08kt", approachType: "CAT I ILS" },
  { id: "rwy-09r-hyd", airportId: "HYD", code: "09R/27L", headingDeg: 92, lengthMeters: 3800, status: "OCCUPIED", wind: "090/08kt", approachType: "CAT II ILS" },
  { id: "rwy-27-bom", airportId: "BOM", code: "09/27", headingDeg: 274, lengthMeters: 3489, status: "AVAILABLE", wind: "260/14kt", approachType: "CAT II ILS" },
  { id: "rwy-14-bom", airportId: "BOM", code: "14/32", headingDeg: 142, lengthMeters: 2925, status: "AVAILABLE", wind: "260/14kt", approachType: "VOR/DME" },
  { id: "rwy-28-del", airportId: "DEL", code: "10/28", headingDeg: 281, lengthMeters: 3810, status: "OCCUPIED", wind: "290/06kt", approachType: "CAT IIIb ILS" },
  { id: "rwy-29-del", airportId: "DEL", code: "11/29", headingDeg: 291, lengthMeters: 4430, status: "AVAILABLE", wind: "290/06kt", approachType: "CAT IIIb ILS" },
];

export function RunwaysSection({ activeStation = "JFK" }: { activeStation?: string }) {
  const [runways, setRunways] = useState<RunwayDTO[]>(INITIAL_RUNWAYS);
  const [stationFilter, setStationFilter] = useState<string>("ALL");

  const toggleRunwayStatus = (id: string) => {
    setRunways((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const nextStatus =
            r.status === "AVAILABLE"
              ? "OCCUPIED"
              : r.status === "OCCUPIED"
              ? "CLOSED"
              : "AVAILABLE";
          return { ...r, status: nextStatus };
        }
        return r;
      })
    );
  };

  const filtered = runways.filter((r) =>
    stationFilter === "ALL" ? true : r.airportId === stationFilter
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Navigation className="h-6 w-6 text-primary" />
            Runway Infrastructure & Approach Navigation
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage active landing and departure configurations, instrument landing system (ILS) categories, and friction.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={stationFilter}
            onChange={(e) => setStationFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold"
          >
            <option value="ALL">All Stations</option>
            <option value="JFK">KJFK (New York)</option>
            <option value="HYD">VOHS (Hyderabad)</option>
            <option value="BOM">VABB (Mumbai)</option>
            <option value="DEL">VIDP (Delhi)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((rwy) => {
          const isAvail = rwy.status === "AVAILABLE";
          const isOcc = rwy.status === "OCCUPIED";
          return (
            <Card key={rwy.id} className="border-border/60 bg-card/80">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-mono font-bold text-foreground">
                      RWY {rwy.code}
                    </span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {rwy.airportId}
                    </Badge>
                  </div>
                  <Badge
                    variant={isAvail ? "default" : isOcc ? "warning" : "destructive"}
                    className="text-xs"
                  >
                    {rwy.status}
                  </Badge>
                </div>
                <CardDescription className="text-xs">{rwy.approachType}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Compass className="h-3.5 w-3.5 text-primary" />
                    <span>Heading: {rwy.headingDeg}° MAG</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Gauge className="h-3.5 w-3.5 text-primary" />
                    <span>Length: {rwy.lengthMeters} M</span>
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2">
                    <Wind className="h-3.5 w-3.5 text-primary" />
                    <span>Surface Wind: {rwy.wind}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                  <span className="text-muted-foreground text-[11px]">Toggle Operational State:</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => toggleRunwayStatus(rwy.id)}
                  >
                    Change Status
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
