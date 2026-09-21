"use client";

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Clock,
  DollarSign,
  Luggage,
  Plane,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const THROUGHPUT_DATA = [
  { hour: "06:00", departures: 14, arrivals: 12, passengers: 3420 },
  { hour: "08:00", departures: 28, arrivals: 22, passengers: 6840 },
  { hour: "10:00", departures: 34, arrivals: 30, passengers: 8910 },
  { hour: "12:00", departures: 24, arrivals: 28, passengers: 7120 },
  { hour: "14:00", departures: 32, arrivals: 34, passengers: 9450 },
  { hour: "16:00", departures: 38, arrivals: 36, passengers: 10240 },
  { hour: "18:00", departures: 30, arrivals: 32, passengers: 8640 },
  { hour: "20:00", departures: 20, arrivals: 24, passengers: 5980 },
];

const DELAY_BREAKDOWN = [
  { category: "Weather / Convective", pct: 42 },
  { category: "ATC En Route Spacing", pct: 28 },
  { category: "Late Inbound Aircraft", pct: 18 },
  { category: "Ground Service / Turnaround", pct: 8 },
  { category: "Technical / Maintenance", pct: 4 },
];

export function AnalyticsSection() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Airport Operational Intelligence & Telemetry
          </h2>
          <p className="text-sm text-muted-foreground">
            Real-time analytics on runway throughput, passenger load factor, slot compliance, and revenue performance.
          </p>
        </div>
        <Badge variant="outline" className="text-xs bg-primary/10 border-primary/40 text-primary">
          Live Telemetry Active
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground uppercase flex items-center justify-between">
              On-Time Performance (OTP)
              <ArrowUpRight className="h-4 w-4 text-emerald-400" />
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-400">89.4%</div>
            <div className="text-[11px] text-muted-foreground">+2.1% vs previous 24h</div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground uppercase flex items-center justify-between">
              Avg Passenger Load Factor
              <ArrowUpRight className="h-4 w-4 text-primary" />
            </span>
            <div className="text-2xl font-bold font-mono text-foreground">84.8%</div>
            <div className="text-[11px] text-muted-foreground">8,450 seats filled today</div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground uppercase flex items-center justify-between">
              Airfield Movements / Hr
              <ArrowUpRight className="h-4 w-4 text-primary" />
            </span>
            <div className="text-2xl font-bold font-mono text-foreground">68 MVTS</div>
            <div className="text-[11px] text-muted-foreground">Near peak CAT III capacity</div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground uppercase flex items-center justify-between">
              Ticketing Revenue (Sim)
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-400">$1,420,800</div>
            <div className="text-[11px] text-muted-foreground">3,840 simulated bookings</div>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Flight Throughput Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-border/60 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Hourly Runway Movements (Departures vs Arrivals)
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time aircraft movement count categorized by phase of operation.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={THROUGHPUT_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="departures" fill="#38bdf8" name="Departures" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="arrivals" fill="#22c55e" name="Arrivals" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Delay Reason Breakdown */}
        <div>
          <Card className="border-border/60 bg-card/80 h-full flex flex-col justify-between">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-400" />
                Root Cause Delay Breakdown
              </CardTitle>
              <CardDescription className="text-xs">
                Analysis of 28 cumulative operational delay minutes today.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {DELAY_BREAKDOWN.map((item, idx) => (
                <div key={idx} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{item.category}</span>
                    <span className="font-mono font-bold text-foreground">{item.pct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        idx === 0
                          ? "bg-amber-400"
                          : idx === 1
                          ? "bg-sky-400"
                          : idx === 2
                          ? "bg-purple-400"
                          : "bg-zinc-400"
                      }`}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
