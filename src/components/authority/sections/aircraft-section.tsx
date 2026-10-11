"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Compass,
  Filter,
  MapPin,
  Plane,
  Plus,
  RefreshCw,
  Search,
  Users,
  Wrench,
  AlertOctagon,
  CheckCircle2,
  Building,
  X,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AircraftDTO, AirlineDTO } from "@/lib/domain";

export function AircraftSection() {
  const [aircraft, setAircraft] = useState<AircraftDTO[]>([]);
  const [airlines, setAirlines] = useState<AirlineDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [airlineFilter, setAirlineFilter] = useState("ALL");
  const [updatingTail, setUpdatingTail] = useState<string | null>(null);

  // Register New Aircraft Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newReg, setNewReg] = useState("");
  const [newModel, setNewModel] = useState("Airbus A320neo");
  const [newManufacturer, setNewManufacturer] = useState("Airbus");
  const [newAirlineId, setNewAirlineId] = useState("");
  const [newEconomy, setNewEconomy] = useState(150);
  const [newBusiness, setNewBusiness] = useState(20);
  const [newFirst, setNewFirst] = useState(0);
  const [newAirport, setNewAirport] = useState("HYD");
  const [newGate, setNewGate] = useState("B12");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const fetchAircraft = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/aircraft");
      if (res.ok) {
        const data = await res.json();
        setAircraft(data.aircraft || []);
      }
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  const fetchAirlines = async () => {
    try {
      const res = await fetch("/api/airlines");
      if (res.ok) {
        const data = await res.json();
        setAirlines(data.airlines || []);
        if (data.airlines && data.airlines.length > 0 && !newAirlineId) {
          setNewAirlineId(data.airlines[0].id);
        }
      }
    } catch {
      //
    }
  };

  useEffect(() => {
    fetchAircraft();
    fetchAirlines();
  }, []);

  const handleUpdateStatus = async (tail: string, newStatus: string) => {
    setUpdatingTail(tail);
    try {
      const res = await fetch("/api/aircraft", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration: tail, status: newStatus }),
      });

      if (res.ok) {
        setAircraft((prev) =>
          prev.map((ac) => (ac.registration === tail ? { ...ac, status: newStatus } : ac))
        );
      }
    } catch {
      //
    } finally {
      setUpdatingTail(null);
    }
  };

  const handleCreateAircraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    const matchedAirline = airlines.find((a) => a.id === newAirlineId);
    const totalCapacity = Number(newEconomy) + Number(newBusiness) + Number(newFirst);

    try {
      const res = await fetch("/api/aircraft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registration: newReg.trim().toUpperCase(),
          model: newModel.trim(),
          manufacturer: newManufacturer.trim(),
          airlineId: newAirlineId,
          airlineName: matchedAirline ? matchedAirline.name : undefined,
          economyCapacity: Number(newEconomy),
          businessCapacity: Number(newBusiness),
          firstClassCapacity: Number(newFirst),
          totalCapacity,
          status: "IN_SERVICE",
          currentAirport: newAirport.trim().toUpperCase(),
          currentGate: newGate.trim().toUpperCase(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Failed to register aircraft");
        return;
      }

      setSubmitSuccess(`Aircraft ${newReg.toUpperCase()} registered successfully!`);
      fetchAircraft();
      setTimeout(() => {
        setCreateModalOpen(false);
        setSubmitSuccess(null);
        setNewReg("");
      }, 1200);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error creating aircraft");
    } finally {
      setSubmitting(false);
    }
  };

  // KPI Calculations
  const inServiceCount = useMemo(() => aircraft.filter((a) => a.status === "IN_SERVICE").length, [aircraft]);
  const maintCount = useMemo(() => aircraft.filter((a) => a.status === "MAINTENANCE").length, [aircraft]);
  const aogCount = useMemo(() => aircraft.filter((a) => a.status === "AOG").length, [aircraft]);
  const totalFleetSeats = useMemo(
    () => aircraft.reduce((acc, a) => acc + (a.totalCapacity || 0), 0),
    [aircraft]
  );

  const filtered = useMemo(() => {
    return aircraft.filter((ac) => {
      const matchesSearch =
        ac.registration.toLowerCase().includes(search.toLowerCase()) ||
        ac.model.toLowerCase().includes(search.toLowerCase()) ||
        (ac.airlineName || "").toLowerCase().includes(search.toLowerCase()) ||
        (ac.currentAirport || "").toLowerCase().includes(search.toLowerCase()) ||
        (ac.currentGate || "").toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "ALL" || ac.status === statusFilter;
      const matchesAirline = airlineFilter === "ALL" || ac.airlineId === airlineFilter;

      return matchesSearch && matchesStatus && matchesAirline;
    });
  }, [aircraft, search, statusFilter, airlineFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Plane className="h-6 w-6 text-primary" />
            Aircraft Fleet & Airframe Register
          </h2>
          <p className="text-sm text-muted-foreground">
            Authoritative registry of commercial airframes, passenger cabin configurations, and active maintenance statuses.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAircraft} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Fleet
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Register Airframe
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Total Fleet</p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{aircraft.length}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Active airframes</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Plane className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">In Service</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-400">{inServiceCount}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Flight ready</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Maintenance</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-400">{maintCount}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Hangar service</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Wrench className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">AOG Grounded</p>
              <h3 className="text-2xl font-bold mt-1 text-rose-400">{aogCount}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Critical work</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400">
              <AlertOctagon className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur col-span-2 sm:col-span-1">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Total Seats</p>
              <h3 className="text-2xl font-bold mt-1 text-sky-400">{totalFleetSeats.toLocaleString()}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Passenger capacity</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-400">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-border/60 bg-card/80">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tail (VT-...), model, carrier, airport..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs bg-background h-9"
              />
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 h-9 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">All Operational Statuses</option>
                <option value="IN_SERVICE">In Service</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="AOG">Aircraft on Ground (AOG)</option>
              </select>
            </div>

            <div>
              <select
                value={airlineFilter}
                onChange={(e) => setAirlineFilter(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 h-9 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">All Operating Carriers</option>
                {airlines.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.iata})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid of Aircraft */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((ac) => {
          const isUpdating = updatingTail === ac.registration;
          return (
            <Card
              key={ac.id}
              className="border-border/60 bg-card/80 hover:bg-card transition-colors flex flex-col justify-between"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-mono font-bold text-foreground">
                        {ac.registration}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {ac.manufacturer}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-semibold mt-1">{ac.model}</CardTitle>
                    <CardDescription className="text-xs">{ac.airlineName || "Carrier Assigned"}</CardDescription>
                  </div>
                  <Badge
                    variant={
                      ac.status === "IN_SERVICE"
                        ? "default"
                        : ac.status === "MAINTENANCE"
                        ? "secondary"
                        : "destructive"
                    }
                    className="text-[10px] px-1.5 py-0 shrink-0"
                  >
                    {ac.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="p-2.5 rounded bg-background/60 border border-border/40 space-y-1.5 text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-primary" />
                      Total Capacity:
                    </span>
                    <span className="font-mono font-bold text-foreground">
                      {ac.totalCapacity} Seats
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span>Cabin Layout:</span>
                    <span className="font-mono">
                      {ac.firstClassCapacity ? `${ac.firstClassCapacity}F / ` : ""}
                      {ac.businessCapacity}J / {ac.economyCapacity}Y
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-border/40">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-primary" />
                      Position:
                    </span>
                    <span className="font-semibold text-foreground">
                      {ac.currentAirport || "HYD"} &bull; Stand {ac.currentGate || "B12"}
                    </span>
                  </div>
                </div>

                {/* Status action toggle buttons */}
                <div className="pt-1 flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">Status:</span>
                  <select
                    value={ac.status}
                    disabled={isUpdating}
                    onChange={(e) => handleUpdateStatus(ac.registration, e.target.value)}
                    className="flex-1 rounded border border-border/60 bg-background px-2 py-1 text-[11px] font-medium text-foreground focus:outline-none"
                  >
                    <option value="IN_SERVICE">In Service</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="AOG">Aircraft on Ground (AOG)</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* REGISTER NEW AIRFRAME MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <Card className="w-full max-w-md border-primary/40 shadow-2xl bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Plane className="h-4 w-4 text-primary" />
                  Register New Airframe
                </CardTitle>
                <CardDescription>
                  Enrol a new aircraft into the carrier fleet and operational simulation register.
                </CardDescription>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setCreateModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateAircraft} className="space-y-3 text-xs">
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
                    <label className="text-muted-foreground block mb-1 font-medium">Tail Registration *</label>
                    <Input
                      type="text"
                      placeholder="e.g. VT-SC3"
                      value={newReg}
                      onChange={(e) => setNewReg(e.target.value.toUpperCase())}
                      required
                      className="h-8 text-xs font-mono uppercase bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">Manufacturer *</label>
                    <select
                      value={newManufacturer}
                      onChange={(e) => setNewManufacturer(e.target.value)}
                      className="w-full rounded border border-input bg-background px-2.5 h-8 text-xs"
                    >
                      <option value="Airbus">Airbus</option>
                      <option value="Boeing">Boeing</option>
                      <option value="Embraer">Embraer</option>
                      <option value="ATR">ATR</option>
                      <option value="Bombardier">Bombardier</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">Model *</label>
                    <Input
                      type="text"
                      placeholder="e.g. Airbus A320neo"
                      value={newModel}
                      onChange={(e) => setNewModel(e.target.value)}
                      required
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">Operating Carrier *</label>
                    <select
                      value={newAirlineId}
                      onChange={(e) => setNewAirlineId(e.target.value)}
                      className="w-full rounded border border-input bg-background px-2.5 h-8 text-xs"
                      required
                    >
                      {airlines.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.iata})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Seating configuration */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">Economy (Y)</label>
                    <Input
                      type="number"
                      min={10}
                      max={500}
                      value={newEconomy}
                      onChange={(e) => setNewEconomy(parseInt(e.target.value, 10) || 0)}
                      className="h-8 text-xs font-mono bg-background"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">Business (J)</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={newBusiness}
                      onChange={(e) => setNewBusiness(parseInt(e.target.value, 10) || 0)}
                      className="h-8 text-xs font-mono bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">First (F)</label>
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      value={newFirst}
                      onChange={(e) => setNewFirst(parseInt(e.target.value, 10) || 0)}
                      className="h-8 text-xs font-mono bg-background"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  Total Seat Capacity:{" "}
                  <strong className="text-foreground font-mono">
                    {Number(newEconomy) + Number(newBusiness) + Number(newFirst)} Seats
                  </strong>
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">Home Station</label>
                    <Input
                      type="text"
                      maxLength={3}
                      placeholder="HYD"
                      value={newAirport}
                      onChange={(e) => setNewAirport(e.target.value.toUpperCase())}
                      className="h-8 text-xs font-mono uppercase bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">Assigned Stand / Gate</label>
                    <Input
                      type="text"
                      placeholder="B12"
                      value={newGate}
                      onChange={(e) => setNewGate(e.target.value.toUpperCase())}
                      className="h-8 text-xs font-mono uppercase bg-background"
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
                    disabled={submitting}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                    size="sm"
                  >
                    {submitting ? "Registering..." : "Confirm Airframe Registration"}
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
