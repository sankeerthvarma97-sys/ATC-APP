"use client";

import { useEffect, useState } from "react";
import {
  Building,
  Mail,
  Phone,
  Plane,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AirlineDTO } from "@/lib/domain";

export function AirlinesSection() {
  const [airlines, setAirlines] = useState<AirlineDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const fetchAirlines = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/airlines");
      if (res.ok) {
        const data = await res.json();
        setAirlines(data.airlines || []);
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
        const res = await fetch("/api/airlines");
        if (res.ok && active) {
          const data = await res.json();
          setAirlines(data.airlines || []);
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

  const filtered = airlines.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.iata.toLowerCase().includes(search.toLowerCase()) ||
      a.icao.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
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
          <Button variant="outline" size="sm" onClick={fetchAirlines}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Carriers
          </Button>
        </div>
      </div>

      <Card className="border-border/60 bg-card/80">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search airline by name, IATA (SC, AV, BH), or ICAO..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm bg-background"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((airline) => (
          <Card key={airline.id} className="border-border/60 bg-card/80">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{airline.logo || "✈️"}</div>
                  <div>
                    <CardTitle className="text-base font-bold">{airline.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="font-mono text-xs font-semibold">
                        IATA: {airline.iata}
                      </Badge>
                      <Badge variant="outline" className="font-mono text-xs">
                        ICAO: {airline.icao}
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
              <div className="p-2.5 rounded bg-muted/40 border border-border/40 space-y-1 text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Country of Registry:</span>
                  <span className="font-semibold text-foreground">{airline.country}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Ops Dispatch:
                  </span>
                  <span className="font-mono text-foreground">{airline.contactEmail}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Hotline:
                  </span>
                  <span className="font-mono text-foreground">{airline.contactPhone}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
