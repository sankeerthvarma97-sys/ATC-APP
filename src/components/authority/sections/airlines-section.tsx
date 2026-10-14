"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Building,
  CheckCircle2,
  Globe,
  Mail,
  Phone,
  Plane,
  Plus,
  RefreshCw,
  Search,
  Shield,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AircraftDTO, AirlineDTO, FlightDTO } from "@/lib/domain";

export function AirlinesSection() {
  const [airlines, setAirlines] = useState<AirlineDTO[]>([]);
  const [aircraft, setAircraft] = useState<AircraftDTO[]>([]);
  const [flights, setFlights] = useState<FlightDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [newAirline, setNewAirline] = useState({
    name: "",
    iata: "",
    icao: "",
    logo: "✈️",
    country: "India",
    contactEmail: "",
    contactPhone: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resAir, resAc, resFlt] = await Promise.all([
        fetch("/api/airlines").catch(() => null),
        fetch("/api/aircraft").catch(() => null),
        fetch("/api/flights").catch(() => null),
      ]);

      if (resAir && resAir.ok) {
        const d = await resAir.json();
        setAirlines(d.airlines || []);
      }
      if (resAc && resAc.ok) {
        const d = await resAc.json();
        setAircraft(d.aircraft || []);
      }
      if (resFlt && resFlt.ok) {
        const d = await resFlt.json();
        setFlights(d.flights || []);
      }
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const [resAir, resAc, resFlt] = await Promise.all([
          fetch("/api/airlines").catch(() => null),
          fetch("/api/aircraft").catch(() => null),
          fetch("/api/flights").catch(() => null),
        ]);

        if (resAir && resAir.ok && !ignore) {
          const d = await resAir.json();
          setAirlines(d.airlines || []);
        }
        if (resAc && resAc.ok && !ignore) {
          const d = await resAc.json();
          setAircraft(d.aircraft || []);
        }
        if (resFlt && resFlt.ok && !ignore) {
          const d = await resFlt.json();
          setFlights(d.flights || []);
        }
      } catch {
        // Non-blocking
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

  const handleCreateAirline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAirline.name.trim() || !newAirline.iata.trim() || !newAirline.icao.trim()) {
      setAddError("Name, IATA (2-letters), and ICAO (3-letters) are required.");
      return;
    }

    setAddLoading(true);
    setAddError(null);
    try {
      const res = await fetch("/api/airlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newAirline,
          iata: newAirline.iata.trim().toUpperCase(),
          icao: newAirline.icao.trim().toUpperCase(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.airline) {
        setIsAddModalOpen(false);
        setNewAirline({
          name: "",
          iata: "",
          icao: "",
          logo: "✈️",
          country: "India",
          contactEmail: "",
          contactPhone: "",
        });
        await fetchData();
      } else {
        setAddError(data.error || "Failed to register new carrier.");
      }
    } catch {
      setAddError("Network error while registering airline.");
    } finally {
      setAddLoading(false);
    }
  };

  const filtered = airlines.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.iata.toLowerCase().includes(search.toLowerCase()) ||
      a.icao.toLowerCase().includes(search.toLowerCase()) ||
      a.country.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building className="h-6 w-6 text-primary" />
            Airline Operators & Air Carrier Registry
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage scheduled, charter, and cargo air carriers operating within the simulation authority airspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Register New Carrier
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Carriers
          </Button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Registered Carriers</p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{airlines.length}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Active operators</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Building className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Commercial Fleet</p>
              <h3 className="text-2xl font-bold mt-1 text-sky-400">{aircraft.length}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Registered airframes</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-400">
              <Plane className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Active Flights</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-400">{flights.length}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Scheduled & airborne</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Globe className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Domestic Registry</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-400">
                {airlines.filter((a) => a.country === "India").length}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">DGCA / India operators</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Shield className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Input */}
      <Card className="border-border/60 bg-card/80">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search airline by name, IATA (SC, AV, BH), ICAO, or country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm bg-background"
            />
          </div>
        </CardContent>
      </Card>

      {/* Grid of Airline Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((airline) => {
          // Count aircraft belonging to this airline
          const fleetCount = aircraft.filter(
            (ac) => ac.airlineId === airline.id || (ac.airlineName && ac.airlineName.includes(airline.name))
          ).length;

          // Count active flights for this airline
          const flightCount = flights.filter(
            (flt) =>
              flt.airline.toLowerCase().includes(airline.name.toLowerCase()) ||
              flt.callsign.startsWith(airline.iata) ||
              flt.callsign.startsWith(airline.icao)
          ).length;

          return (
            <Card key={airline.id} className="border-border/60 bg-card/80 hover:bg-card transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl p-1.5 rounded-lg bg-background border border-border">
                      {airline.logo || "✈️"}
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">{airline.name}</CardTitle>
                      <div className="flex items-center gap-1.5 mt-1 font-mono">
                        <Badge variant="outline" className="text-xs font-semibold border-primary/40 text-primary">
                          {airline.iata}
                        </Badge>
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          {airline.icao}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Badge variant={airline.status === "ACTIVE" ? "default" : "secondary"}>
                    {airline.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {/* Fleet & Flights Stats */}
                <div className="grid grid-cols-2 gap-2 p-2 rounded bg-background/60 border border-border/50 text-center">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Airframes</span>
                    <p className="text-sm font-bold text-sky-400 font-mono mt-0.5">{fleetCount}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Active Flights</span>
                    <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">{flightCount}</p>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-muted/40 border border-border/40 space-y-1.5 text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Registry:</span>
                    <span className="font-semibold text-foreground">{airline.country}</span>
                  </div>
                  {airline.contactEmail && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        Ops Dispatch:
                      </span>
                      <span className="font-mono text-foreground truncate max-w-[140px]">{airline.contactEmail}</span>
                    </div>
                  )}
                  {airline.contactPhone && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        Hotline:
                      </span>
                      <span className="font-mono text-foreground">{airline.contactPhone}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* REGISTER NEW AIRLINE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <Card className="w-full max-w-md border-primary/40 shadow-2xl bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Building className="h-5 w-5 text-primary" />
                  Register New Air Carrier
                </CardTitle>
                <CardDescription>
                  Add a certified airline operator to the AOCC dispatch database.
                </CardDescription>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {addError && (
                <div className="mb-3 p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}

              <form onSubmit={handleCreateAirline} className="space-y-3 text-xs">
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Airline Name *</label>
                  <Input
                    type="text"
                    placeholder="e.g. Akasa Air"
                    value={newAirline.name}
                    onChange={(e) => setNewAirline({ ...newAirline, name: e.target.value })}
                    required
                    className="h-8 text-xs bg-background"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">IATA Code (2 Chars) *</label>
                    <Input
                      type="text"
                      placeholder="e.g. QP"
                      maxLength={2}
                      value={newAirline.iata}
                      onChange={(e) => setNewAirline({ ...newAirline, iata: e.target.value.toUpperCase() })}
                      required
                      className="h-8 text-xs font-mono uppercase bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">ICAO Code (3 Chars) *</label>
                    <Input
                      type="text"
                      placeholder="e.g. AKJ"
                      maxLength={3}
                      value={newAirline.icao}
                      onChange={(e) => setNewAirline({ ...newAirline, icao: e.target.value.toUpperCase() })}
                      required
                      className="h-8 text-xs font-mono uppercase bg-background"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">Logo Icon</label>
                    <Input
                      type="text"
                      placeholder="✈️"
                      value={newAirline.logo}
                      onChange={(e) => setNewAirline({ ...newAirline, logo: e.target.value })}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">Country of Registry</label>
                    <Input
                      type="text"
                      value={newAirline.country}
                      onChange={(e) => setNewAirline({ ...newAirline, country: e.target.value })}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Ops Dispatch Email</label>
                  <Input
                    type="email"
                    placeholder="dispatch@airline.sim"
                    value={newAirline.contactEmail}
                    onChange={(e) => setNewAirline({ ...newAirline, contactEmail: e.target.value })}
                    className="h-8 text-xs bg-background"
                  />
                </div>

                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Hotline Phone</label>
                  <Input
                    type="text"
                    placeholder="+91 800 200 3000"
                    value={newAirline.contactPhone}
                    onChange={(e) => setNewAirline({ ...newAirline, contactPhone: e.target.value })}
                    className="h-8 text-xs bg-background"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsAddModalOpen(false)}
                    disabled={addLoading}
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={addLoading}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                    size="sm"
                  >
                    {addLoading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    )}
                    Register Carrier
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
