"use client";

import { useEffect, useState } from "react";
import {
  Compass,
  Globe,
  MapPin,
  Mountain,
  Navigation,
  Plane,
  RefreshCw,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AirportDTO } from "@/lib/domain";

export function AirportsSection({
  onSelectStation,
}: {
  onSelectStation?: (iata: string) => void;
}) {
  const [airports, setAirports] = useState<AirportDTO[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchAirports = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/airports");
      if (res.ok) {
        const data = await res.json();
        setAirports(data.airports || []);
      }
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const res = await fetch("/api/airports");
        if (res.ok && active) {
          const data = await res.json();
          setAirports(data.airports || []);
        }
      } catch {
        //
      }
    }
    init();
    return () => {
      active = false;
    };
  }, []);

  const filtered = airports.filter(
    (a) =>
      a.iata.toLowerCase().includes(search.toLowerCase()) ||
      a.icao.toLowerCase().includes(search.toLowerCase()) ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.city.toLowerCase().includes(search.toLowerCase()) ||
      a.country.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Compass className="h-6 w-6 text-primary" />
            Aerodrome & Simulation Airfield Network
          </h2>
          <p className="text-sm text-muted-foreground">
            Authoritative registry of 14 international and domestic aerodromes configured in the simulation grid.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAirports}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Stations
          </Button>
        </div>
      </div>

      {/* Search Input */}
      <Card className="border-border/60 bg-card/80">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search airport by IATA (JFK, LHR, HYD), ICAO, city or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm bg-background"
            />
          </div>
        </CardContent>
      </Card>

      {/* Grid of Airports */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((apt) => (
          <Card
            key={apt.id}
            className="border-border/60 bg-card/70 hover:bg-card transition-colors flex flex-col justify-between"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-mono font-bold text-foreground">
                      {apt.iata}
                    </span>
                    <Badge variant="outline" className="font-mono text-[11px]">
                      {apt.icao}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-semibold mt-1 line-clamp-1">
                    {apt.name}
                  </CardTitle>
                  <CardDescription className="text-xs flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 text-primary" />
                    {apt.city}, {apt.country}
                  </CardDescription>
                </div>
                <Badge
                  variant={apt.status === "ACTIVE" ? "default" : "secondary"}
                  className="text-[10px] px-1.5 py-0"
                >
                  {apt.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Mountain className="h-3.5 w-3.5 text-primary" />
                  <span>Elev: {apt.elevationFt} FT</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono">
                  <Navigation className="h-3.5 w-3.5 text-primary" />
                  <span>
                    {apt.latitude.toFixed(2)}°, {apt.longitude.toFixed(2)}°
                  </span>
                </div>
              </div>

              {onSelectStation && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-8 text-xs font-semibold"
                  onClick={() => onSelectStation(apt.iata)}
                >
                  Set as Active Station
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
