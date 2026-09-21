"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Droplets,
  Fuel,
  HardHat,
  Luggage,
  Plane,
  RefreshCw,
  Truck,
  Utensils,
  Wind,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface GroundTask {
  id: string;
  gate: string;
  flight: string;
  aircraft: string;
  fuelPct: number;
  baggagePct: number;
  cateringPct: number;
  tugStatus: "ASSIGNED" | "EN_ROUTE" | "CONNECTED" | "IDLE";
  overallProgress: number;
  readyForPushback: boolean;
}

const INITIAL_GROUND_TASKS: GroundTask[] = [
  {
    id: "gt-1",
    gate: "GATE A1",
    flight: "SKY-402",
    aircraft: "B738 (VT-SC1)",
    fuelPct: 100,
    baggagePct: 100,
    cateringPct: 100,
    tugStatus: "CONNECTED",
    overallProgress: 100,
    readyForPushback: true,
  },
  {
    id: "gt-2",
    gate: "GATE B3",
    flight: "BHA-101",
    aircraft: "A320 (VT-BH1)",
    fuelPct: 85,
    baggagePct: 60,
    cateringPct: 90,
    tugStatus: "EN_ROUTE",
    overallProgress: 78,
    readyForPushback: false,
  },
  {
    id: "gt-3",
    gate: "GATE C2",
    flight: "AVS-205",
    aircraft: "B789 (VT-AV2)",
    fuelPct: 45,
    baggagePct: 30,
    cateringPct: 50,
    tugStatus: "ASSIGNED",
    overallProgress: 41,
    readyForPushback: false,
  },
  {
    id: "gt-4",
    gate: "GATE B12",
    flight: "ISK-303",
    aircraft: "B772 (VT-IS1)",
    fuelPct: 10,
    baggagePct: 0,
    cateringPct: 20,
    tugStatus: "IDLE",
    overallProgress: 10,
    readyForPushback: false,
  },
];

export function GroundOpsSection({
  onNavigateTo,
}: {
  onNavigateTo?: (section: string) => void;
}) {
  const [tasks, setTasks] = useState<GroundTask[]>(INITIAL_GROUND_TASKS);

  const handleAuthorizePushback = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, readyForPushback: true, overallProgress: 100 } : t))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <HardHat className="h-6 w-6 text-primary" />
            Ground Handling & Ramp Operations Center
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage aircraft turnaround services: fueling, baggage reconciliation, catering, and pushback tugs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10">
            4 Turnarounds Active
          </Badge>
        </div>
      </div>

      {/* Fleet Resource Availability Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground uppercase flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-primary" />
              Towbarless Tugs
            </span>
            <div className="text-2xl font-bold font-mono text-foreground">8 / 10</div>
            <div className="text-xs text-muted-foreground">2 Deployed on Apron</div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground uppercase flex items-center gap-1.5">
              <Fuel className="h-3.5 w-3.5 text-primary" />
              Hydrant Dispensers
            </span>
            <div className="text-2xl font-bold font-mono text-foreground">12 / 12</div>
            <div className="text-xs text-muted-foreground">Jet A-1 Pressure 120 PSI</div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground uppercase flex items-center gap-1.5">
              <Luggage className="h-3.5 w-3.5 text-primary" />
              Belt Loaders
            </span>
            <div className="text-2xl font-bold font-mono text-foreground">14 / 16</div>
            <div className="text-xs text-muted-foreground">BHS Conveyors Normal</div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground uppercase flex items-center gap-1.5">
              <Droplets className="h-3.5 w-3.5 text-primary" />
              De-Icing Trucks
            </span>
            <div className="text-2xl font-bold font-mono text-foreground">6 / 6</div>
            <div className="text-xs text-muted-foreground">Type IV Fluid Standby</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Turnaround Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tasks.map((task) => (
          <Card key={task.id} className="border-border/60 bg-card/80">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-lg font-bold text-foreground">
                    {task.flight}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="font-mono text-xs">
                      {task.gate}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{task.aircraft}</span>
                  </div>
                </div>
                {task.readyForPushback ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40">
                    READY FOR PUSHBACK
                  </Badge>
                ) : (
                  <Badge variant="warning">SERVICING ({task.overallProgress}%)</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Fuel className="h-3 w-3 text-primary" /> Fueling Status
                    </span>
                    <span className="font-mono">{task.fuelPct}%</span>
                  </div>
                  <Progress value={task.fuelPct} className="h-1.5" />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Luggage className="h-3 w-3 text-primary" /> Baggage Reconciliation & Loading
                    </span>
                    <span className="font-mono">{task.baggagePct}%</span>
                  </div>
                  <Progress value={task.baggagePct} className="h-1.5" />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Utensils className="h-3 w-3 text-primary" /> Catering & Cabin Prep
                    </span>
                    <span className="font-mono">{task.cateringPct}%</span>
                  </div>
                  <Progress value={task.cateringPct} className="h-1.5" />
                </div>
              </div>

              <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Truck className="h-3.5 w-3.5 text-primary" />
                  <span>Pushback Tug:</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {task.tugStatus}
                  </Badge>
                </div>

                {task.readyForPushback ? (
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500"
                    onClick={() => onNavigateTo?.("atc")}
                  >
                    Clear for Pushback &rarr;
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => handleAuthorizePushback(task.id)}
                  >
                    Fast Complete Service
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
