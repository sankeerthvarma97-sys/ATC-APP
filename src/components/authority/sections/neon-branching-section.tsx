"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Database,
  Flame,
  GitBranch,
  HardDrive,
  History,
  Layers,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  DisasterRecoveryStatusDTO,
  NeonBranchDTO,
  NeonSnapshotDTO,
} from "@/lib/domain";

export function NeonBranchingSection() {
  const [branches, setBranches] = useState<NeonBranchDTO[]>([]);
  const [snapshots, setSnapshots] = useState<NeonSnapshotDTO[]>([]);
  const [drStatus, setDrStatus] = useState<DisasterRecoveryStatusDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  // New branch input state
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchRole, setNewBranchRole] = useState<NeonBranchDTO["role"]>("SIMULATION_ISOLATED");

  // Snapshot input state
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/database/branches");
      if (!res.ok) return;
      const data = await res.json();
      setBranches(data.branches || []);
      setSnapshots(data.snapshots || []);
      setDrStatus(data.drStatus || null);
      if (data.branches?.length > 0 && !selectedBranchId) {
        setSelectedBranchId(data.branches[0].id);
      }
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const res = await fetch("/api/admin/database/branches");
        const data = await res.json();
        if (!ignore) {
          setBranches(data.branches || []);
          setSnapshots(data.snapshots || []);
          setDrStatus(data.drStatus || null);
          if (data.branches?.length > 0 && !selectedBranchId) {
            setSelectedBranchId(data.branches[0].id);
          }
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
  }, [selectedBranchId]);

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;
    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/database/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_BRANCH",
          name: newBranchName,
          role: newBranchRole,
        }),
      });

      if (!res.ok) throw new Error("Failed to create branch.");
      const data = await res.json();
      setFeedback(`Branch '${data.branch.name}' created with isolated copy-on-write storage.`);
      setNewBranchName("");
      fetchData();
    } catch {
      setFeedback("Failed to create isolated simulation branch.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBranch = async (branchId: string, branchName: string) => {
    if (!confirm(`Delete simulation branch '${branchName}'?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/database/branches?branchId=${branchId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete branch.");
      setFeedback(`Branch '${branchName}' removed.`);
      fetchData();
    } catch {
      setFeedback("Failed to delete branch.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSnapshot = async () => {
    if (!selectedBranchId || !snapshotLabel.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/database/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_SNAPSHOT",
          branchId: selectedBranchId,
          label: snapshotLabel,
        }),
      });
      if (!res.ok) throw new Error("Failed to capture snapshot.");
      const data = await res.json();
      setFeedback(`Snapshot '${data.snapshot.label}' captured at LSN ${data.snapshot.lsn}.`);
      setSnapshotLabel("");
      fetchData();
    } catch {
      setFeedback("Failed to capture point-in-time snapshot.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreSnapshot = async (branchId: string, snapshotId: string, label: string) => {
    if (!confirm(`Restore branch to snapshot '${label}'?`)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/database/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RESTORE_SNAPSHOT",
          branchId,
          snapshotId,
        }),
      });
      if (!res.ok) throw new Error("Failed to restore snapshot.");
      const data = await res.json();
      setFeedback(data.message || "Branch successfully restored.");
      fetchData();
    } catch {
      setFeedback("Failed to restore branch state.");
    } finally {
      setLoading(false);
    }
  };

  const handleRunDrDrill = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/database/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DR_DRILL" }),
      });
      if (!res.ok) throw new Error("DR Drill failed.");
      const data = await res.json();
      setFeedback(
        `Disaster Recovery Drill Completed! RTO: ${data.rtoSeconds}s | Checksum: ${data.verifiedChecksum}`,
      );
      fetchData();
    } catch {
      setFeedback("Disaster Recovery Drill failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Refresh */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-primary" />
            Neon Postgres Cloud Branching & Disaster Recovery
          </h2>
          <p className="text-sm text-muted-foreground">
            Lakebase Postgres decoupled storage architecture with copy-on-write simulation environments and sub-second instant restore.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunDrDrill}
            disabled={loading}
            className="border-primary/40 text-primary hover:bg-primary/10"
          >
            <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
            Trigger DR Drill
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 rounded bg-emerald-950/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          {feedback}
        </div>
      )}

      {/* DR Status KPI Cards */}
      {drStatus && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/60 bg-card/80">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Cloud Infrastructure
                </span>
                <span className="text-sm font-bold text-foreground">{drStatus.region}</span>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40">
                ACTIVE
              </Badge>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/80">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Recovery Point (RPO)
                </span>
                <span className="text-sm font-mono font-bold text-foreground">
                  &lt; {drStatus.rpoMinutes} Min
                </span>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                WAL Synced
              </Badge>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/80">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Recovery Time (RTO)
                </span>
                <span className="text-sm font-mono font-bold text-foreground">
                  ~{drStatus.rtoMinutes} Min (Instant)
                </span>
              </div>
              <Zap className="h-4 w-4 text-amber-400" />
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/80">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Decoupled Storage
                </span>
                <span className="text-sm font-bold text-foreground">Scale-to-Zero ON</span>
              </div>
              <HardDrive className="h-4 w-4 text-primary" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Branch Hierarchy & Creation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border/60 bg-card/90">
            <CardHeader className="py-3 px-4 border-b border-border/50">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  Neon Copy-on-Write Database Branches
                </span>
                <Badge variant="outline" className="text-xs font-mono">
                  {branches.length} Total Branches
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Isolated sandbox branches share historical storage pages with main until modified, incurring zero storage duplication overhead.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-muted/60 text-[11px] text-muted-foreground uppercase border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3">Branch Name</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Current LSN</th>
                      <th className="py-2.5 px-3">Size (MB)</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {branches.map((b) => (
                      <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-foreground flex items-center gap-2">
                          <GitBranch
                            className={`h-3.5 w-3.5 ${b.primary ? "text-emerald-400" : "text-primary"}`}
                          />
                          {b.name}
                          {b.primary && (
                            <Badge className="text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                              PRIMARY
                            </Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant="outline" className="text-[10px]">
                            {b.role}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-primary">{b.currentLsn || "0/18F9A420"}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{b.logicalSizeMb} MB</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-semibold">{b.status}</td>
                        <td className="py-2.5 px-3 text-right">
                          {!b.primary && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-red-400"
                              onClick={() => handleDeleteBranch(b.id, b.name)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create Branch Card */}
        <div>
          <Card className="border-border/60 bg-card/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                Spawn Isolated Simulation Branch
              </CardTitle>
              <CardDescription className="text-xs">
                Creates an instant isolated branch for running stress tests and disaster drills without risking production.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Branch Identifier</label>
                <Input
                  placeholder="e.g. sim-high-density-arrival-drill"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className="font-mono text-xs bg-background"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Branch Role</label>
                <select
                  value={newBranchRole}
                  onChange={(e) => setNewBranchRole(e.target.value as NeonBranchDTO["role"])}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-mono shadow-sm"
                >
                  <option value="SIMULATION_ISOLATED">SIMULATION_ISOLATED (Sandbox)</option>
                  <option value="DISASTER_RECOVERY_STANDBY">DISASTER_RECOVERY_STANDBY</option>
                  <option value="SCHEMA_MIGRATION_TEST">SCHEMA_MIGRATION_TEST</option>
                </select>
              </div>

              <Button
                className="w-full text-xs font-semibold mt-2"
                onClick={handleCreateBranch}
                disabled={loading || !newBranchName.trim()}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Create Branch (Instant)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Snapshots & Instant Restore */}
      <Card className="border-border/60 bg-card/90">
        <CardHeader className="py-3 px-4 border-b border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Point-in-Time Checkpoints & Instant Disaster Recovery Restore
            </CardTitle>
            <CardDescription className="text-xs">
              Every snapshot verifies table record counts (flights, users, ledgers, audit logs) and computes an integrity checksum.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Input
              placeholder="Snapshot label (e.g. Pre-Drill Checkpoint)..."
              value={snapshotLabel}
              onChange={(e) => setSnapshotLabel(e.target.value)}
              className="text-xs font-mono h-8 w-64 bg-background"
            />
            <Button
              size="sm"
              className="h-8 text-xs font-semibold shrink-0"
              onClick={handleCreateSnapshot}
              disabled={loading || !snapshotLabel.trim()}
            >
              <ShieldCheck className="h-3.5 w-3.5 mr-1" />
              Capture Snapshot
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-muted/60 text-[11px] text-muted-foreground uppercase border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Snapshot Label</th>
                  <th className="py-2.5 px-3">Captured At</th>
                  <th className="py-2.5 px-3">Checkpoint LSN</th>
                  <th className="py-2.5 px-3">State Records</th>
                  <th className="py-2.5 px-3">Integrity Checksum</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Instant Restore</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {snapshots.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-foreground">{s.label}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">
                      {new Date(s.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-primary">{s.lsn}</td>
                    <td className="py-2.5 px-3 text-foreground">
                      Flt:{s.recordCounts.flights} | Usr:{s.recordCounts.users} | Tx:{s.recordCounts.transactions} | Log:{s.recordCounts.auditLogs}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground text-[10px]">{s.checksum}</td>
                    <td className="py-2.5 px-3">
                      <Badge
                        variant={s.status === "RESTORED" ? "default" : "outline"}
                        className="text-[10px]"
                      >
                        {s.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[10px] border-primary/40 text-primary hover:bg-primary/10"
                        onClick={() => handleRestoreSnapshot(s.branchId, s.id, s.label)}
                        disabled={loading}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Rollback
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
