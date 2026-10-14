"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Compass,
  Globe,
  MapPin,
  Mountain,
  Navigation,
  Plane,
  RefreshCw,
  Search,
  Wind,
  Thermometer,
  Gauge,
  Radio,
  CheckCircle2,
  X,
  Plus,
  Activity,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Warehouse,
  ShieldAlert,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AirportDTO, FlightDTO } from "@/lib/domain";
import type { MetarReport } from "@/lib/services/weather-service";

interface GateSummary {
  total: number;
  occupied: number;
  available: number;
}

export function AirportsSection({
  onSelectStation,
  activeStation = "HYD",
}: {
  onSelectStation?: (iata: string) => void;
  activeStation?: string;
}) {
  const [airports, setAirports] = useState<AirportDTO[]>([]);
  const [flights, setFlights] = useState<FlightDTO[]>([]);
  const [gatesByStation, setGatesByStation] = useState<Record<string, GateSummary>>({});
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState<"ALL" | "DOMESTIC" | "INTERNATIONAL">("ALL");
  const [loading, setLoading] = useState(true);

  // Selected Station Intelligence modal state
  const [selectedAirport, setSelectedAirport] = useState<AirportDTO | null>(null);
  const [metarReport, setMetarReport] = useState<MetarReport | null>(null);
  const [loadingMetar, setLoadingMetar] = useState(false);
  const [metarError, setMetarError] = useState<string | null>(null);

  // Register New Aerodrome Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newIata, setNewIata] = useState("");
  const [newIcao, setNewIcao] = useState("");
  const [newName, setNewName] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newCountry, setNewCountry] = useState("India");
  const [newLat, setNewLat] = useState("");
  const [newLon, setNewLon] = useState("");
  const [newElev, setNewElev] = useState("0");
  const [submittingApt, setSubmittingApt] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

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

  const fetchSupplementalData = async () => {
    try {
      // Fetch flights to compute station traffic
      const fRes = await fetch("/api/flights");
      if (fRes.ok) {
        const fData = await fRes.json();
        setFlights(fData.flights || []);
      }

      // Fetch gates to compute stand capacity
      const gRes = await fetch("/api/resources?type=GATE");
      if (gRes.ok) {
        const gData = await gRes.json();
        const rawGates = gData.gates || [];
        const map: Record<string, GateSummary> = {};
        for (const g of rawGates) {
          const apt = (g.airportCode || "HYD").toUpperCase();
          if (!map[apt]) {
            map[apt] = { total: 0, occupied: 0, available: 0 };
          }
          map[apt].total += 1;
          if (g.status === "OCCUPIED") map[apt].occupied += 1;
          if (g.status === "AVAILABLE") map[apt].available += 1;
        }
        setGatesByStation(map);
      }
    } catch {
      //
    }
  };

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const [aptRes, fRes, gRes] = await Promise.all([
          fetch("/api/airports"),
          fetch("/api/flights"),
          fetch("/api/resources?type=GATE"),
        ]);
        if (aptRes.ok && !ignore) {
          const data = await aptRes.json();
          setAirports(data.airports || []);
        }
        if (fRes.ok && !ignore) {
          const fData = await fRes.json();
          setFlights(fData.flights || []);
        }
        if (gRes.ok && !ignore) {
          const gData = await gRes.json();
          const rawGates = gData.gates || [];
          const map: Record<string, GateSummary> = {};
          for (const g of rawGates) {
            const apt = (g.airportCode || "HYD").toUpperCase();
            if (!map[apt]) {
              map[apt] = { total: 0, occupied: 0, available: 0 };
            }
            map[apt].total += 1;
            if (g.status === "OCCUPIED") map[apt].occupied += 1;
            if (g.status === "AVAILABLE") map[apt].available += 1;
          }
          setGatesByStation(map);
        }
      } catch {
        //
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadData();
    return () => {
      ignore = true;
    };
  }, []);

  // Fetch METAR when Station Intel is opened
  const handleOpenIntel = async (apt: AirportDTO) => {
    setSelectedAirport(apt);
    setLoadingMetar(true);
    setMetarError(null);
    setMetarReport(null);
    try {
      const res = await fetch(`/api/weather/metar?station=${encodeURIComponent(apt.iata)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.metar) {
          setMetarReport(data.metar);
        } else {
          setMetarError(data.error || "Failed to load station METAR");
        }
      } else {
        setMetarError("Failed to fetch station weather");
      }
    } catch (err) {
      setMetarError(err instanceof Error ? err.message : "Network error fetching METAR");
    } finally {
      setLoadingMetar(false);
    }
  };

  const handleCreateAirport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingApt(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const res = await fetch("/api/airports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          iata: newIata.trim().toUpperCase(),
          icao: newIcao.trim().toUpperCase(),
          name: newName.trim(),
          city: newCity.trim(),
          country: newCountry.trim(),
          latitude: parseFloat(newLat),
          longitude: parseFloat(newLon),
          elevationFt: parseInt(newElev, 10) || 0,
          status: "ACTIVE",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Failed to register aerodrome");
        return;
      }

      setSubmitSuccess(`Aerodrome ${newIata.toUpperCase()} successfully registered in simulation grid!`);
      fetchAirports();
      setTimeout(() => {
        setCreateModalOpen(false);
        setSubmitSuccess(null);
        setNewIata("");
        setNewIcao("");
        setNewName("");
        setNewCity("");
        setNewLat("");
        setNewLon("");
        setNewElev("0");
      }, 1200);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error creating aerodrome");
    } finally {
      setSubmittingApt(false);
    }
  };

  const filtered = useMemo(() => {
    return airports.filter((a) => {
      const matchesSearch =
        a.iata.toLowerCase().includes(search.toLowerCase()) ||
        a.icao.toLowerCase().includes(search.toLowerCase()) ||
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.city.toLowerCase().includes(search.toLowerCase()) ||
        a.country.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (regionFilter === "DOMESTIC") return a.country.toLowerCase() === "india";
      if (regionFilter === "INTERNATIONAL") return a.country.toLowerCase() !== "india";
      return true;
    });
  }, [airports, search, regionFilter]);

  // Flights related to selected airport
  const stationFlights = useMemo(() => {
    if (!selectedAirport) return [];
    return flights.filter(
      (f) =>
        f.origin?.toUpperCase() === selectedAirport.iata.toUpperCase() ||
        f.destination?.toUpperCase() === selectedAirport.iata.toUpperCase()
    );
  }, [flights, selectedAirport]);

  const domesticCount = useMemo(() => airports.filter((a) => a.country.toLowerCase() === "india").length, [airports]);
  const intlCount = useMemo(() => airports.filter((a) => a.country.toLowerCase() !== "india").length, [airports]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Compass className="h-6 w-6 text-primary" />
            Aerodrome & Simulation Airfield Network
          </h2>
          <p className="text-sm text-muted-foreground">
            Authoritative registry of {airports.length} international and domestic aerodromes configured in the simulation grid.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAirports} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Stations
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Register Station
          </Button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Monitored Stations</p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{airports.length}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Global grid</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Globe className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Primary AOCC Hub</p>
              <h3 className="text-2xl font-mono font-bold mt-1 text-primary">{activeStation}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Tactical sector active</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Radio className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Domestic Aerodromes</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-400">{domesticCount}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">India network</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">International Hubs</p>
              <h3 className="text-2xl font-bold mt-1 text-sky-400">{intlCount}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Cross-border corridors</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-400">
              <Plane className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Region Filter Bar */}
      <Card className="border-border/60 bg-card/80">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search IATA, ICAO, city, country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs bg-background h-9"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <Button
              size="sm"
              variant={regionFilter === "ALL" ? "default" : "outline"}
              onClick={() => setRegionFilter("ALL")}
              className="text-xs h-8"
            >
              All ({airports.length})
            </Button>
            <Button
              size="sm"
              variant={regionFilter === "DOMESTIC" ? "default" : "outline"}
              onClick={() => setRegionFilter("DOMESTIC")}
              className="text-xs h-8"
            >
              Domestic ({domesticCount})
            </Button>
            <Button
              size="sm"
              variant={regionFilter === "INTERNATIONAL" ? "default" : "outline"}
              onClick={() => setRegionFilter("INTERNATIONAL")}
              className="text-xs h-8"
            >
              International ({intlCount})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grid of Airports */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((apt) => {
          const isPrimary = apt.iata.toUpperCase() === activeStation.toUpperCase();
          const gateInfo = gatesByStation[apt.iata.toUpperCase()];
          const stationMovementCount = flights.filter(
            (f) =>
              f.origin?.toUpperCase() === apt.iata.toUpperCase() ||
              f.destination?.toUpperCase() === apt.iata.toUpperCase()
          ).length;

          return (
            <Card
              key={apt.id}
              className={`border transition-all flex flex-col justify-between ${
                isPrimary
                  ? "border-primary shadow-md shadow-primary/10 bg-card"
                  : "border-border/60 bg-card/70 hover:bg-card"
              }`}
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
                      {isPrimary && (
                        <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] px-1.5 py-0 font-bold">
                          PRIMARY HUB
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-sm font-semibold mt-1 line-clamp-1" title={apt.name}>
                      {apt.name}
                    </CardTitle>
                    <CardDescription className="text-xs flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-primary shrink-0" />
                      <span>{apt.city}, {apt.country}</span>
                    </CardDescription>
                  </div>
                  <Badge
                    variant={apt.status === "ACTIVE" ? "default" : "secondary"}
                    className="text-[10px] px-1.5 py-0 shrink-0"
                  >
                    {apt.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3 text-xs">
                {/* Metrics */}
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

                {/* Operations badge strip */}
                <div className="flex items-center justify-between text-[11px] bg-background/60 p-2 rounded border border-border/40">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Plane className="h-3.5 w-3.5 text-sky-400" />
                    <span>Movements: <strong className="text-foreground">{stationMovementCount}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Warehouse className="h-3.5 w-3.5 text-emerald-400" />
                    <span>
                      Stands: <strong className="text-foreground">{gateInfo ? `${gateInfo.available}/${gateInfo.total}` : "—"}</strong>
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-semibold"
                    onClick={() => handleOpenIntel(apt)}
                  >
                    <Activity className="h-3.5 w-3.5 mr-1 text-primary" />
                    Station Intel
                  </Button>

                  {onSelectStation && (
                    <Button
                      size="sm"
                      variant={isPrimary ? "secondary" : "default"}
                      disabled={isPrimary}
                      className="h-8 text-xs font-semibold"
                      onClick={() => onSelectStation(apt.iata)}
                    >
                      {isPrimary ? "Active Station" : "Set Primary"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* STATION INTELLIGENCE MODAL */}
      {selectedAirport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <Card className="w-full max-w-2xl border-primary/40 shadow-2xl bg-card max-h-[90vh] flex flex-col">
            <CardHeader className="flex flex-row items-start justify-between pb-3 border-b border-border/60">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-mono font-bold text-foreground">
                    {selectedAirport.iata}
                  </span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {selectedAirport.icao}
                  </Badge>
                  <Badge variant="default" className="text-[10px]">
                    {selectedAirport.status}
                  </Badge>
                  {selectedAirport.iata.toUpperCase() === activeStation.toUpperCase() && (
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-bold">
                      ACTIVE AOCC PRIMARY
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-base font-bold mt-1 text-foreground">
                  {selectedAirport.name}
                </CardTitle>
                <CardDescription className="text-xs flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  {selectedAirport.city}, {selectedAirport.country} &bull; Lat: {selectedAirport.latitude.toFixed(4)}°, Lon: {selectedAirport.longitude.toFixed(4)}° &bull; Elev: {selectedAirport.elevationFt} FT
                </CardDescription>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setSelectedAirport(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="space-y-4 pt-4 overflow-y-auto">
              {/* METAR & Weather Decoder */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Wind className="h-4 w-4 text-primary" />
                    Live Aviation Weather & METAR Decoding
                  </h4>
                  {loadingMetar && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin" /> Decoding...
                    </span>
                  )}
                </div>

                {metarError && (
                  <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>{metarError}</span>
                  </div>
                )}

                {metarReport && (
                  <div className="p-3 rounded-lg bg-background/70 border border-border/60 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`text-xs font-mono font-bold ${
                            metarReport.flightCategory === "VFR"
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : metarReport.flightCategory === "MVFR"
                              ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                              : metarReport.flightCategory === "IFR"
                              ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                              : "bg-red-500/20 text-red-400 border-red-500/30"
                          }`}
                        >
                          {metarReport.flightCategory} CONDITIONS
                        </Badge>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          Obs: {metarReport.observationTime}
                        </span>
                      </div>
                    </div>

                    {/* Meteorological metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2 rounded bg-card/60 border border-border/40">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Wind className="h-3 w-3 text-primary" />
                          <span>Wind</span>
                        </div>
                        <p className="font-mono font-bold mt-1 text-foreground">
                          {metarReport.wind.direction}° @ {metarReport.wind.speed} KT
                          {metarReport.wind.gust ? ` G${metarReport.wind.gust}KT` : ""}
                        </p>
                      </div>

                      <div className="p-2 rounded bg-card/60 border border-border/40">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Eye className="h-3 w-3 text-primary" />
                          <span>Visibility</span>
                        </div>
                        <p className="font-mono font-bold mt-1 text-foreground">
                          {metarReport.visibilitySm} SM ({metarReport.visibilityMeters} m)
                        </p>
                      </div>

                      <div className="p-2 rounded bg-card/60 border border-border/40">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Thermometer className="h-3 w-3 text-primary" />
                          <span>Temp / Dew</span>
                        </div>
                        <p className="font-mono font-bold mt-1 text-foreground">
                          {metarReport.temperatureC}°C / {metarReport.dewPointC}°C
                        </p>
                      </div>

                      <div className="p-2 rounded bg-card/60 border border-border/40">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Gauge className="h-3 w-3 text-primary" />
                          <span>QNH Altimeter</span>
                        </div>
                        <p className="font-mono font-bold mt-1 text-foreground">
                          {metarReport.altimeterHpa} hPa ({metarReport.altimeterInHg} inHg)
                        </p>
                      </div>
                    </div>

                    {/* Raw METAR String */}
                    <div className="p-2 rounded bg-background border border-border/40 font-mono text-[11px] text-muted-foreground break-all select-all">
                      <code>{metarReport.raw}</code>
                    </div>

                    {/* Runway Crosswind Breakdown if available */}
                    {metarReport.runwayAnalysis && metarReport.runwayAnalysis.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[11px] font-semibold text-muted-foreground">
                          Runway Crosswind & Headwind Vectors:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {metarReport.runwayAnalysis.map((rwy) => (
                            <div
                              key={rwy.runwayId}
                              className="p-2 rounded bg-background/50 border border-border/40 text-[11px] flex items-center justify-between"
                            >
                              <span className="font-mono font-bold text-foreground">RWY {rwy.runwayId}</span>
                              <span className="text-muted-foreground">
                                Head: <strong className="text-foreground">{rwy.headwindKt}kt</strong> &bull; Cross:{" "}
                                <strong className={rwy.crosswindKt > 15 ? "text-amber-400" : "text-foreground"}>
                                  {rwy.crosswindKt}kt {rwy.crosswindDir}
                                </strong>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Station Resource & Gate Stands Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Warehouse className="h-4 w-4 text-primary" />
                  Terminal Gate & Parking Stands
                </h4>
                {gatesByStation[selectedAirport.iata.toUpperCase()] ? (
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2.5 rounded bg-background/60 border border-border/40">
                      <p className="text-muted-foreground text-[10px] uppercase">Configured Stands</p>
                      <p className="text-lg font-bold text-foreground mt-0.5">
                        {gatesByStation[selectedAirport.iata.toUpperCase()].total}
                      </p>
                    </div>
                    <div className="p-2.5 rounded bg-background/60 border border-border/40">
                      <p className="text-muted-foreground text-[10px] uppercase">Available</p>
                      <p className="text-lg font-bold text-emerald-400 mt-0.5">
                        {gatesByStation[selectedAirport.iata.toUpperCase()].available}
                      </p>
                    </div>
                    <div className="p-2.5 rounded bg-background/60 border border-border/40">
                      <p className="text-muted-foreground text-[10px] uppercase">Occupied</p>
                      <p className="text-lg font-bold text-sky-400 mt-0.5">
                        {gatesByStation[selectedAirport.iata.toUpperCase()].occupied}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground bg-background/50 p-2.5 rounded border border-border/40">
                    Standard aerodrome ramp configuration active. Stands allocated dynamically.
                  </p>
                )}
              </div>

              {/* Station Traffic Movements */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Plane className="h-4 w-4 text-primary" />
                    Active Departures & Arrivals ({stationFlights.length})
                  </span>
                </h4>

                {stationFlights.length === 0 ? (
                  <div className="p-3 text-center text-xs text-muted-foreground bg-background/40 rounded border border-border/40">
                    No active flights currently scheduled or airborne for this aerodrome.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {stationFlights.map((f) => {
                      const isDep = f.origin?.toUpperCase() === selectedAirport.iata.toUpperCase();
                      return (
                        <div
                          key={f.id}
                          className="p-2 rounded bg-background/60 border border-border/40 text-xs flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            {isDep ? (
                              <ArrowUpRight className="h-3.5 w-3.5 text-amber-400" />
                            ) : (
                              <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-400" />
                            )}
                            <span className="font-mono font-bold text-foreground">{f.callsign || f.flightNumber}</span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              {f.origin} &rarr; {f.destination}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground">{f.aircraftType || "A320"}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {f.status}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>

            <div className="p-3 border-t border-border/60 flex items-center justify-between bg-card/80">
              <Button size="sm" variant="ghost" onClick={() => setSelectedAirport(null)}>
                Close
              </Button>
              {onSelectStation && (
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  onClick={() => {
                    onSelectStation(selectedAirport.iata);
                    setSelectedAirport(null);
                  }}
                >
                  <Radio className="h-3.5 w-3.5 mr-1.5" />
                  Set as Active AOCC Primary Station
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* REGISTER NEW AERODROME MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <Card className="w-full max-w-md border-primary/40 shadow-2xl bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Compass className="h-4 w-4 text-primary" />
                  Register Aerodrome in Simulation Grid
                </CardTitle>
                <CardDescription>
                  Configure a new airfield with authoritative geospatial and elevation specs.
                </CardDescription>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setCreateModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateAirport} className="space-y-3 text-xs">
                {submitError && (
                  <div className="p-2.5 rounded bg-red-500/10 border border-red-500/30 text-red-400">
                    {submitError}
                  </div>
                )}
                {submitSuccess && (
                  <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    {submitSuccess}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">IATA Code (3 Letters) *</label>
                    <Input
                      type="text"
                      maxLength={3}
                      placeholder="e.g. LHR"
                      value={newIata}
                      onChange={(e) => setNewIata(e.target.value.toUpperCase())}
                      required
                      className="h-8 text-xs font-mono uppercase bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">ICAO Code (4 Letters) *</label>
                    <Input
                      type="text"
                      maxLength={4}
                      placeholder="e.g. EGLL"
                      value={newIcao}
                      onChange={(e) => setNewIcao(e.target.value.toUpperCase())}
                      required
                      className="h-8 text-xs font-mono uppercase bg-background"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Aerodrome Name *</label>
                  <Input
                    type="text"
                    placeholder="e.g. London Heathrow International Airport"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    className="h-8 text-xs bg-background"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">City *</label>
                    <Input
                      type="text"
                      placeholder="e.g. London"
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      required
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">Country *</label>
                    <Input
                      type="text"
                      placeholder="e.g. United Kingdom"
                      value={newCountry}
                      onChange={(e) => setNewCountry(e.target.value)}
                      required
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">Latitude *</label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="51.4700"
                      value={newLat}
                      onChange={(e) => setNewLat(e.target.value)}
                      required
                      className="h-8 text-xs font-mono bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">Longitude *</label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="-0.4543"
                      value={newLon}
                      onChange={(e) => setNewLon(e.target.value)}
                      required
                      className="h-8 text-xs font-mono bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">Elevation (FT)</label>
                    <Input
                      type="number"
                      placeholder="83"
                      value={newElev}
                      onChange={(e) => setNewElev(e.target.value)}
                      className="h-8 text-xs font-mono bg-background"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setCreateModalOpen(false)}
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submittingApt}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                    size="sm"
                  >
                    {submittingApt ? "Registering..." : "Register Aerodrome"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
