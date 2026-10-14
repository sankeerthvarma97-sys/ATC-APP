"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  Download,
  FileCode,
  FileText,
  Filter,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AuditLogDTO } from "@/lib/domain";

const DEFAULT_FALLBACK_LOGS: AuditLogDTO[] = [
  {
    id: "audit-evt-006",
    actorId: "usr-admin",
    actorName: "Maya Rao",
    actorRole: "SUPER_ADMIN",
    action: "CLEAR_RUNWAY_TAKEOFF",
    entity: "FLIGHT",
    entityId: "SKY-402",
    details: { runway: "04L", squawk: "4201", wind: "270/12KT", clearanceLimit: "FL240" },
    after: { status: "DEPARTING", assignedRunway: "04L" },
    createdAt: new Date(Date.now() - 120_000).toISOString(),
  },
  {
    id: "audit-evt-005",
    actorId: "usr-atc",
    actorName: "Ground Controller 02",
    actorRole: "ATC_CONTROLLER",
    action: "ASSIGN_GATE",
    entity: "GATE",
    entityId: "GATE-A1",
    details: { flightNumber: "BHA-101", gate: "A1", terminal: "T1", tugAssigned: "TUG-04" },
    after: { status: "OCCUPIED", currentFlight: "BHA-101" },
    createdAt: new Date(Date.now() - 480_000).toISOString(),
  },
  {
    id: "audit-evt-004",
    actorId: "usr-staff-1",
    actorName: "Ananya Deshmukh",
    actorRole: "SECURITY_OFFICER",
    action: "PASSENGER_SECURITY_VERIFIED",
    entity: "PASSENGER",
    entityId: "PAX-9821411",
    details: { pnr: "SC7K92P", passenger: "Capt. Eleanor Vance", gate: "A1", seat: "4A", biometricMatch: true },
    after: { securityStatus: "CLEARED", verifiedAt: new Date().toISOString() },
    createdAt: new Date(Date.now() - 900_000).toISOString(),
  },
  {
    id: "audit-evt-003",
    actorId: "usr-atc",
    actorName: "Tower Controller 01",
    actorRole: "ATC_CONTROLLER",
    action: "ACKNOWLEDGE_EMERGENCY",
    entity: "FLIGHT",
    entityId: "AVS-205",
    details: { code: "7700", nature: "HYDRAULIC_SYS_WARN", priorityVector: "ILS 22R DIRECT", fireCrewsDispatched: true },
    after: { status: "EMERGENCY", emergencyHandled: true },
    createdAt: new Date(Date.now() - 1800_000).toISOString(),
  },
  {
    id: "audit-evt-002",
    actorId: "usr-dispatch",
    actorName: "Karan Johar",
    actorRole: "DISPATCHER",
    action: "DISPATCH_CREW_ASSIGNMENT",
    entity: "FLIGHT",
    entityId: "ISK-303",
    details: { captain: "Capt. S. Verma", firstOfficer: "FO N. Gupta", cabinCrewCount: 4 },
    after: { crewReady: true, briefingSigned: true },
    createdAt: new Date(Date.now() - 2700_000).toISOString(),
  },
  {
    id: "audit-evt-001",
    actorId: "usr-admin",
    actorName: "Maya Rao",
    actorRole: "SUPER_ADMIN",
    action: "SYSTEM_INITIALIZED",
    entity: "SYSTEM",
    entityId: "AOCC-SIM-1",
    after: { status: "OPERATIONAL", mode: "FULL_AUTHORITY" },
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
  },
];

export function AuditLogsSection() {
  const [logs, setLogs] = useState<AuditLogDTO[]>(DEFAULT_FALLBACK_LOGS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [selectedLog, setSelectedLog] = useState<AuditLogDTO | null>(DEFAULT_FALLBACK_LOGS[0] || null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/audit-logs");
      if (res.ok) {
        const data = await res.json();
        if (data.logs && data.logs.length > 0) {
          setLogs(data.logs);
          if (!selectedLog) setSelectedLog(data.logs[0]);
          return;
        }
      }
      setLogs(DEFAULT_FALLBACK_LOGS);
    } catch {
      setLogs(DEFAULT_FALLBACK_LOGS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/audit-logs");
        if (res.ok && active) {
          const data = await res.json();
          if (data.logs && data.logs.length > 0) {
            setLogs(data.logs);
            setSelectedLog((prev) => prev || data.logs[0]);
            return;
          }
        }
      } catch {
        //
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const handleExportLogs = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `aocc-audit-trail-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filtered = logs.filter((l) => {
    const matchesSearch =
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      (l.entity || l.entityType || "").toLowerCase().includes(search.toLowerCase()) ||
      l.actorName?.toLowerCase().includes(search.toLowerCase()) ||
      l.entityId?.toLowerCase().includes(search.toLowerCase());
    const matchesAction = actionFilter === "ALL" || l.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const actions = Array.from(new Set(logs.map((l) => l.action)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Security & Operational Audit Trail
          </h2>
          <p className="text-sm text-muted-foreground">
            Immutable log of all authority interventions, flight dispatch clearances, ticket validations, and RBAC actions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportLogs}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export Trail
          </Button>
          <Button variant="outline" size="sm" onClick={fetchLogs}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Trail
          </Button>
        </div>
      </div>

      <Card className="border-border/60 bg-card/80">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search audit trail by actor, action or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-sm bg-background"
              />
            </div>
            <div>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">All Actions ({actions.length})</option>
                {actions.map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="rounded-md border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/60 text-xs text-muted-foreground uppercase border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Entity</th>
                    <th className="py-2.5 px-3">Actor</th>
                    <th className="py-2.5 px-3 text-right">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {filtered.map((log) => {
                    const isSelected = selectedLog?.id === log.id;
                    return (
                      <tr
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? "bg-primary/15" : "hover:bg-muted/30"
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-primary">
                          {log.action}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-foreground">{log.entity || log.entityType}</span>
                          {log.entityId && (
                            <span className="font-mono text-[11px] text-muted-foreground ml-1">
                              ({log.entityId})
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3 text-primary" />
                          {log.actorName || "SYSTEM"}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Button
                            size="sm"
                            variant={isSelected ? "default" : "ghost"}
                            className="h-6 px-2 text-[10px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLog(log);
                            }}
                          >
                            Inspect
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        No audit events recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Payload Inspector Drawer */}
        <div>
          <Card className="border-border/60 bg-card/80 backdrop-blur sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileCode className="h-4 w-4 text-primary" />
                Audit Record Inspector
              </CardTitle>
              <CardDescription className="text-xs">
                Detailed cryptographic payload and state diff.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {selectedLog ? (
                <>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase">Event ID</span>
                    <div className="font-mono text-foreground font-semibold">{selectedLog.id}</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase">Action Triggered</span>
                    <div className="font-mono text-primary font-bold">{selectedLog.action}</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase">Actor & Role</span>
                    <div className="text-foreground">
                      {selectedLog.actorName || "Automated Dispatch System"} (
                      {selectedLog.actorRole || "SYSTEM"})
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase">Logged Payload</span>
                    <pre className="p-3 rounded bg-background border border-border/60 font-mono text-[11px] text-muted-foreground overflow-x-auto max-h-56">
                      {JSON.stringify(selectedLog.details || selectedLog.after || selectedLog.before || {}, null, 2)}
                    </pre>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Select an audit record to inspect details.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
