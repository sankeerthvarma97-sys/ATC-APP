"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AircraftDTO } from "@/lib/domain";

export function AircraftSection() {
  const [aircraft, setAircraft] = useState<AircraftDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

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

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const res = await fetch("/api/aircraft");
        if (res.ok && active) {
          const data = await res.json();
          setAircraft(data.aircraft || []);
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

  const filtered = aircraft.filter((ac) => {
    const matchesSearch =
      ac.registration.toLowerCase().includes(search.toLowerCase()) ||
      ac.model.toLowerCase().includes(search.toLowerCase()) ||
      (ac.airlineName || "").toLowerCase().includes(search.toLowerCase()) ||
      (ac.currentAirport || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || ac.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Plane className="h-6 w-6 text-primary" />
            Aircraft Fleet & Airframe Register
          </h2>
          <p className="text-sm text-muted-foreground">
            Track active commercial aircraft registrations, passenger cabin layouts, and maintenance status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAircraft}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Fleet
          </Button>
        </div>
      </div>

      <Card className="border-border/60 bg-card/80">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by tail number (VT-...), model, or airline..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-sm bg-background"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">All Statuses</option>
                <option value="IN_SERVICE">In Service</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="AOG">Aircraft on Ground (AOG)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((ac) => (
          <Card key={ac.id} className="border-border/60 bg-card/80">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-lg font-mono font-bold text-foreground">
                    {ac.registration}
                  </span>
                  <CardTitle className="text-sm font-semibold">{ac.model}</CardTitle>
                  <CardDescription className="text-xs">{ac.airlineName}</CardDescription>
                </div>
                <Badge
                  variant={
                    ac.status === "IN_SERVICE"
                      ? "default"
                      : ac.status === "MAINTENANCE"
                      ? "warning"
                      : "destructive"
                  }
                  className="text-[10px] px-1.5 py-0"
                >
                  {ac.status.replace(/_/g, " ")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="p-2.5 rounded bg-muted/40 border border-border/40 space-y-1 text-muted-foreground">
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
                  <span>Cabin Config:</span>
                  <span>
                    {ac.firstClassCapacity ? `${ac.firstClassCapacity}F / ` : ""}
                    {ac.businessCapacity}J / {ac.economyCapacity}Y
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-border/40">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-primary" />
                    Location:
                  </span>
                  <span className="font-semibold text-foreground">
                    {ac.currentAirport} &bull; Stand {ac.currentGate}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
