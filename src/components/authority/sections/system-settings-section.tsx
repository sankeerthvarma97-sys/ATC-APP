"use client";

import { useState } from "react";
import {
  Bell,
  CheckCircle2,
  Clock,
  Database,
  Gauge,
  HardDrive,
  RefreshCw,
  RotateCcw,
  Save,
  Server,
  Settings,
  Volume2,
  Wifi,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SystemSettingsSection() {
  const [simSpeed, setSimSpeed] = useState<"1x" | "2x" | "5x" | "10x">("1x");
  const [autoBookingGen, setAutoBookingGen] = useState(true);
  const [realisticWeather, setRealisticWeather] = useState(true);
  const [radioAudioEffects, setRadioAudioEffects] = useState(true);
  const [collisionWarning, setCollisionWarning] = useState(true);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            AOCC Simulation Engine & Environment Configuration
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure simulation physics speed, automated passenger demand generation, audio synthesis, and database sync.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savedNotice && (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              Settings Saved
            </span>
          )}
          <Button size="sm" onClick={handleSave}>
            <Save className="h-3.5 w-3.5 mr-1.5" />
            Save Configuration
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Simulation Timing & Speed */}
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" />
              Simulation Clock & Speed Multiplier
            </CardTitle>
            <CardDescription className="text-xs">
              Accelerate flight trajectories, turnaround intervals, and boarding queues.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="flex items-center gap-2">
              {(["1x", "2x", "5x", "10x"] as const).map((spd) => (
                <Button
                  key={spd}
                  variant={simSpeed === spd ? "default" : "outline"}
                  onClick={() => setSimSpeed(spd)}
                  className="flex-1 font-mono font-bold text-xs"
                >
                  {spd}
                </Button>
              ))}
            </div>
            <p className="text-muted-foreground">
              Current physics tick: <strong>{simSpeed === "1x" ? "1000ms" : simSpeed === "2x" ? "500ms" : simSpeed === "5x" ? "200ms" : "100ms"}</strong> per frame.
            </p>
          </CardContent>
        </Card>

        {/* Database & State Persistence */}
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Data Persistence Architecture
            </CardTitle>
            <CardDescription className="text-xs">
              Neon Postgres Pooler + In-Memory Fallback State
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded bg-muted/40 border border-border/40">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-emerald-400" />
                <span className="font-semibold text-foreground">Postgres Database:</span>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40">
                CONNECTED
              </Badge>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded bg-muted/40 border border-border/40">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">In-Memory Dual Mode:</span>
              </div>
              <Badge variant="outline">HOT STANDBY</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Automation Features */}
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-primary" />
              Autonomous Passenger & Traffic Generation
            </CardTitle>
            <CardDescription className="text-xs">
              Simulates real-world passenger booking demand and ATC sector traffic.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-foreground block">Auto Passenger Demand</span>
                <span className="text-muted-foreground">Automatically books simulated seats on upcoming flights</span>
              </div>
              <input
                type="checkbox"
                checked={autoBookingGen}
                onChange={(e) => setAutoBookingGen(e.target.checked)}
                className="h-4 w-4 rounded accent-primary cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <div>
                <span className="font-semibold text-foreground block">Dynamic METAR Weather Shift</span>
                <span className="text-muted-foreground">Simulate thunderstorm cells and visibility drops</span>
              </div>
              <input
                type="checkbox"
                checked={realisticWeather}
                onChange={(e) => setRealisticWeather(e.target.checked)}
                className="h-4 w-4 rounded accent-primary cursor-pointer"
              />
            </div>
          </CardContent>
        </Card>

        {/* Safety & Audio Controls */}
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-primary" />
              Audio Synthesis & Tactical Safety Alerts
            </CardTitle>
            <CardDescription className="text-xs">
              Audio feedback and conflict detection thresholds.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-foreground block">VHF Radio Static & Chimes</span>
                <span className="text-muted-foreground">Realistic aviation radio squelch & tones</span>
              </div>
              <input
                type="checkbox"
                checked={radioAudioEffects}
                onChange={(e) => setRadioAudioEffects(e.target.checked)}
                className="h-4 w-4 rounded accent-primary cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <div>
                <span className="font-semibold text-foreground block">STCA Conflict Alerting</span>
                <span className="text-muted-foreground">Alert when aircraft violate 3 NM / 1,000 FT separation</span>
              </div>
              <input
                type="checkbox"
                checked={collisionWarning}
                onChange={(e) => setCollisionWarning(e.target.checked)}
                className="h-4 w-4 rounded accent-primary cursor-pointer"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
