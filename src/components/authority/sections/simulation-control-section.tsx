"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Activity,
  Play,
  Pause,
  Square,
  RotateCcw,
  FastForward,
  Users,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Plane,
  RefreshCw,
  Sliders,
  DollarSign,
  Ticket,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SimulationConfigDTO, SimulationMetricsDTO } from "@/lib/domain";

export function SimulationControlSection({
  onNavigateTo,
}: {
  onNavigateTo?: (section: string) => void;
}) {
  const [config, setConfig] = useState<SimulationConfigDTO | null>(null);
  const [metrics, setMetrics] = useState<SimulationMetricsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/simulation/status");
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        setMetrics(data.metrics);
      }
    } catch (err) {
      console.warn("Failed to fetch simulation status", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Poll metrics every 3 seconds
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleAction = async (action: string, payload?: Record<string, unknown>) => {
    setActionInProgress(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/simulation/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (res.ok) {
        setConfig(data.config);
        setMetrics(data.metrics);
        setStatusMessage(data.message || "Operation successful.");
      } else {
        setStatusMessage(data.error || "Operation failed.");
      }
    } catch {
      setStatusMessage("Network error communicating with simulation engine.");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleStepTick = async (steps = 1) => {
    setActionInProgress(true);
    try {
      const res = await fetch("/api/simulation/tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps }),
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
        setConfig(data.config);
        setStatusMessage(
          `Executed ${steps} tick(s): +${data.stepResults?.bookingsGenerated || 0} bookings, +${data.stepResults?.tasksProcessed || 0} tasks.`
        );
      }
    } catch {
      setStatusMessage("Failed to execute simulation tick.");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleSpeedChange = (speed: number) => {
    handleAction("update_config", { config: { speedMultiplier: speed } });
  };

  const handleStaffCountChange = (count: number) => {
    handleAction("update_config", { config: { staffCount: count } });
  };

  const handleToggleAutoBooking = () => {
    if (!config) return;
    handleAction("update_config", {
      config: { autoBookingEnabled: !config.autoBookingEnabled },
    });
  };

  const handleToggleAutoFlight = () => {
    if (!config) return;
    handleAction("update_config", {
      config: { autoFlightEnabled: !config.autoFlightEnabled },
    });
  };

  const isRunning = config?.status === "RUNNING";
  const isPaused = config?.status === "PAUSED";
  const isStopped = config?.status === "STOPPED";

  return (
    <div className="space-y-6">
      {/* Top Banner & Control HUD */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-xl shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Activity className="h-6 w-6 text-sky-400 animate-pulse" />
              24/7 Operations & Simulation Control Center
            </h1>
            <Badge
              variant={
                isRunning ? "success" : isPaused ? "warning" : "destructive"
              }
              className="text-xs px-2.5 py-0.5 uppercase font-mono tracking-wider"
            >
              {config?.status || "INITIALIZING"}
            </Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Autonomous multi-agent airport simulator scaling up to 2,000 virtual staff, automated credit transactions, and live operational task rotation.
          </p>
        </div>

        {/* Master Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {isRunning ? (
            <button
              onClick={() => handleAction("pause")}
              disabled={actionInProgress}
              className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-sm font-semibold flex items-center gap-2 transition disabled:opacity-50"
            >
              <Pause className="h-4 w-4" /> Pause Ops
            </button>
          ) : (
            <button
              onClick={() => handleAction("start")}
              disabled={actionInProgress}
              className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-sm font-semibold flex items-center gap-2 transition disabled:opacity-50"
            >
              <Play className="h-4 w-4" /> Start Simulation
            </button>
          )}

          <button
            onClick={() => handleAction("stop")}
            disabled={actionInProgress || isStopped}
            className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition disabled:opacity-40"
          >
            <Square className="h-4 w-4" /> Stop
          </button>

          <button
            onClick={() => handleStepTick(1)}
            disabled={actionInProgress}
            className="px-3.5 py-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
            title="Step simulation forward by 1 tick"
          >
            <FastForward className="h-4 w-4" /> Step 1 Tick
          </button>

          <button
            onClick={() => setResetModalOpen(true)}
            disabled={actionInProgress}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-sm font-medium flex items-center gap-1.5 transition"
            title="Safe reset: restore nominal virtual staff & clean simulation tasks"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="bg-sky-950/40 border border-sky-800/60 text-sky-200 px-4 py-2.5 rounded-lg text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-sky-400" />
            {statusMessage}
          </span>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs text-sky-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI HUD Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>TOTAL STAFF</span>
            <Users className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1">
            {metrics?.totalStaff ?? config?.staffCount ?? 500}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Capacity up to 2,000
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>ON DUTY</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {metrics?.activeStaff ?? Math.round((config?.staffCount || 500) * 0.65)}
          </div>
          <div className="text-[11px] text-emerald-500/80 mt-1">
            {metrics?.workingStaff || 0} working · {metrics?.onBreakStaff || 0} break
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>OFF SHIFT</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300 mt-1">
            {metrics?.offShiftStaff ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Rotating 3 daily shifts
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>GROUND TASKS</span>
            <CheckCircle2 className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-300 mt-1">
            {metrics?.completedTasks ?? config?.totalTasksProcessed ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {metrics?.pendingTasks ?? 0} pending in queue
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>ACTIVE BOOKINGS</span>
            <Ticket className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-300 mt-1">
            {metrics?.activeBookings ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Auto passenger generation
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>CREDITS USED</span>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-300 mt-1">
            ₹{((metrics?.totalCreditsUsed || 0) / 1000).toFixed(1)}k
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Atomic ledger entries
          </div>
        </div>
      </div>

      {/* Main Simulation Tuning Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel: Virtual Staff Roster Scaler & Shift Distribution */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-400" />
                Virtual Staff Pool Scaling (100 to 2,000)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulate realistic workforce across 11 departments and 3 rotating shifts.
              </p>
            </div>
            <span className="text-sm font-bold text-blue-400 font-mono">
              {config?.staffCount ?? 500} Staff Members
            </span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="100"
                max="2000"
                step="50"
                value={config?.staffCount ?? 500}
                onChange={(e) => handleStaffCountChange(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Quick scale presets */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Presets:</span>
              {[100, 250, 500, 1000, 2000].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleStaffCountChange(preset)}
                  className={`px-2.5 py-1 text-xs rounded border transition ${
                    config?.staffCount === preset
                      ? "bg-blue-600 border-blue-500 text-white font-bold"
                      : "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Shift Breakdown Display */}
            <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800 space-y-3">
              <div className="text-xs font-semibold text-slate-300">
                24/7 Shift Coverage Model:
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                  <div className="text-sky-400 font-bold font-mono">Shift A</div>
                  <div className="text-[10px] text-slate-400">00:00 - 08:00</div>
                  <div className="text-sm font-semibold text-white mt-1">
                    ~{Math.round((config?.staffCount || 500) * 0.25)}
                  </div>
                  <div className="text-[9px] text-slate-500">Night & Dawn</div>
                </div>

                <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                  <div className="text-emerald-400 font-bold font-mono">Shift B</div>
                  <div className="text-[10px] text-slate-400">08:00 - 16:00</div>
                  <div className="text-sm font-semibold text-white mt-1">
                    ~{Math.round((config?.staffCount || 500) * 0.45)}
                  </div>
                  <div className="text-[9px] text-slate-500">Peak Daylight</div>
                </div>

                <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                  <div className="text-purple-400 font-bold font-mono">Shift C</div>
                  <div className="text-[10px] text-slate-400">16:00 - 00:00</div>
                  <div className="text-sm font-semibold text-white mt-1">
                    ~{Math.round((config?.staffCount || 500) * 0.30)}
                  </div>
                  <div className="text-[9px] text-slate-500">Evening Rush</div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-slate-400">
                Server-side paged directory with zero browser lag.
              </span>
              {onNavigateTo && (
                <button
                  onClick={() => onNavigateTo("virtual-staff")}
                  className="text-xs text-sky-400 hover:text-sky-300 font-medium underline flex items-center gap-1"
                >
                  Inspect 2,000 Virtual Staff Directory &rarr;
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Simulation Speed & Operational Automation */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Sliders className="h-4 w-4 text-sky-400" />
              Simulation Speed Multiplier & Auto-Pilot
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Control time acceleration and toggle automated flight and booking engines.
            </p>
          </div>

          {/* Speed selector */}
          <div className="space-y-2">
            <label className="text-xs text-slate-300 font-medium">
              Simulation Clock Acceleration:
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { label: "0.5x Slow", val: 0.5 },
                { label: "1.0x Real", val: 1.0 },
                { label: "2.0x Fast", val: 2.0 },
                { label: "5.0x Rapid", val: 5.0 },
                { label: "10.0x Warp", val: 10.0 },
              ].map((s) => (
                <button
                  key={s.val}
                  onClick={() => handleSpeedChange(s.val)}
                  className={`py-2 px-1 text-xs rounded-lg border font-medium transition ${
                    config?.speedMultiplier === s.val
                      ? "bg-sky-600 border-sky-400 text-white font-bold shadow-md shadow-sky-600/30"
                      : "bg-slate-800/70 border-slate-700 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Automated Subsystem Toggles */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-3">
                <Ticket className="h-5 w-5 text-emerald-400" />
                <div>
                  <div className="text-sm font-medium text-white">
                    Automated Passenger Bookings
                  </div>
                  <div className="text-xs text-slate-400">
                    Auto-books open seats and debits virtual credit ledger atomically.
                  </div>
                </div>
              </div>
              <button
                onClick={handleToggleAutoBooking}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-300 cursor-pointer ${
                  config?.autoBookingEnabled ? "bg-emerald-600" : "bg-slate-700"
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-300 ${
                    config?.autoBookingEnabled ? "translate-x-6" : ""
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-3">
                <Plane className="h-5 w-5 text-sky-400" />
                <div>
                  <div className="text-sm font-medium text-white">
                    Automated Flight Life-Cycle Transitions
                  </div>
                  <div className="text-xs text-slate-400">
                    Advances scheduled flights through pushback, taxi, takeoff, cruise & landing.
                  </div>
                </div>
              </div>
              <button
                onClick={handleToggleAutoFlight}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-300 cursor-pointer ${
                  config?.autoFlightEnabled ? "bg-sky-600" : "bg-slate-700"
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-300 ${
                    config?.autoFlightEnabled ? "translate-x-6" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-xs text-slate-400">
              Max bookings per tick: {config?.maxBookingsPerInterval ?? 5}
            </span>
            {onNavigateTo && (
              <button
                onClick={() => onNavigateTo("analytics")}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium underline flex items-center gap-1"
              >
                View Credit Ledger & Financial KPIs &rarr;
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Safe Reset Confirmation Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertCircle className="h-6 w-6" />
              <h3 className="text-lg font-bold text-white">
                Reset Simulation State
              </h3>
            </div>
            <p className="text-sm text-slate-300">
              This will restore virtual staff performance scores, clear simulated task queues, and reset operational counters.
            </p>
            <div className="p-3 bg-slate-950 rounded-lg text-xs text-slate-400 border border-slate-800 space-y-1">
              <div className="font-semibold text-emerald-400">Safe Reset Guarantee:</div>
              <div>- Real user accounts are NEVER touched or deleted.</div>
              <div>- Real admin-created flights are preserved.</div>
              <div>- Restores virtual staff pool to standard nominal roster.</div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setResetModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setResetModalOpen(false);
                  handleAction("reset");
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-semibold"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
