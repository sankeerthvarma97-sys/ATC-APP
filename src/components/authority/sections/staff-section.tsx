"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  Building,
  CheckCircle2,
  Clock,
  Filter,
  Key,
  Mail,
  MoreVertical,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Trash2,
  UserCheck,
  Users,
  UserX,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { DepartmentType, EmployeeDTO, Role, VerificationStatus } from "@/lib/domain";

const DEPARTMENTS: DepartmentType[] = [
  "AIRPORT_OPERATIONS",
  "AIR_TRAFFIC_CONTROL",
  "GROUND_OPERATIONS",
  "AIRLINE_OPERATIONS",
  "TICKETING",
  "PASSENGER_SERVICES",
  "SECURITY",
  "BAGGAGE",
  "MAINTENANCE",
  "EMERGENCY_RESPONSE",
  "ADMINISTRATION",
];

const ROLES: Role[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "AIRPORT_ADMIN",
  "OPERATIONS_MANAGER",
  "SUPERVISOR",
  "ATC",
  "ATC_CONTROLLER",
  "SENIOR_ATC_CONTROLLER",
  "GROUND",
  "GROUND_OPERATOR",
  "AIRLINE_OPERATOR",
  "TICKETING_AGENT",
  "GATE_AGENT",
  "SECURITY_OFFICER",
  "BAGGAGE_STAFF",
  "MAINTENANCE_STAFF",
  "FLIGHT_DISPATCHER",
  "SIMULATOR_OPERATOR",
  "PILOT",
  "ANALYST",
  "VIEWER",
];

export function StaffSection() {
  const [employees, setEmployees] = useState<EmployeeDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("ALL");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [showAddModal, setShowAddModal] = useState(false);

  // New employee form state
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "+1 555-0199",
    department: "AIRPORT_OPERATIONS" as DepartmentType,
    jobTitle: "Operations Officer",
    role: "OPERATIONS_MANAGER" as Role,
    airportCode: "JFK",
    terminal: "T4",
    shift: "MORNING",
  });

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/employees");
      if (!res.ok) return;
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/employees");
        if (!res.ok || !active) return;
        const data = await res.json();
        setEmployees(data.employees || []);
      } catch {
        // Fallback
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowAddModal(false);
        fetchEmployees();
      }
    } catch {
      //
    }
  };

  const handleVerify = async (empId: string) => {
    try {
      await fetch(`/api/employees/${empId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationStatus: "VERIFIED" }),
      });
      fetchEmployees();
    } catch {
      //
    }
  };

  const handleToggleStatus = async (emp: EmployeeDTO) => {
    const newStatus = emp.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      await fetch(`/api/employees/${emp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchEmployees();
    } catch {
      //
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.fullName.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      emp.employeeId?.toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter === "ALL" || emp.department === deptFilter;
    const matchesRole = roleFilter === "ALL" || emp.role === roleFilter;
    return matchesSearch && matchesDept && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Airport Staff & Personnel Directory
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage authority personnel, credential verifications, role-based access control, and shift assignments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchEmployees}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground uppercase font-medium">Total Roster</span>
            <div className="text-2xl font-bold font-mono text-foreground">{employees.length}</div>
            <div className="text-xs text-muted-foreground">Across 11 Departments</div>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground uppercase font-medium">Active Duty</span>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {employees.filter((e) => e.status === "ACTIVE").length}
            </div>
            <div className="text-xs text-muted-foreground">Currently on-station</div>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground uppercase font-medium">Verified Badges</span>
            <div className="text-2xl font-bold font-mono text-primary">
              {employees.filter((e) => e.verificationStatus === "VERIFIED").length}
            </div>
            <div className="text-xs text-muted-foreground">Security Cleared</div>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground uppercase font-medium">Pending Verification</span>
            <div className="text-2xl font-bold font-mono text-amber-400">
              {employees.filter((e) => e.verificationStatus === "PENDING").length}
            </div>
            <div className="text-xs text-muted-foreground">Action Required</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Controls */}
      <Card className="border-border/60 bg-card/80">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-sm bg-background"
              />
            </div>
            <div>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">All Departments ({DEPARTMENTS.length})</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">All Roles ({ROLES.length})</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Directory Table */}
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground uppercase border-b border-border">
              <tr>
                <th className="py-2.5 px-3">Employee</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Role & Title</th>
                <th className="py-2.5 px-3">Station / Shift</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Clearance</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-muted/30">
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-foreground">{emp.fullName}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {emp.employeeId || emp.id} &bull; {emp.email}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-medium text-foreground">
                      {emp.department.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 space-y-0.5">
                    <div className="font-mono font-bold text-primary">
                      {emp.role.replace(/_/g, " ")}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{emp.jobTitle}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-foreground">
                      {emp.airportCode} {emp.terminal ? `(${emp.terminal})` : ""}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{emp.shift}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <Badge
                      variant={emp.status === "ACTIVE" ? "default" : "destructive"}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {emp.status}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3">
                    {emp.verificationStatus === "VERIFIED" ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        VERIFIED
                      </span>
                    ) : (
                      <span className="text-amber-400 font-medium flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        PENDING
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {emp.verificationStatus !== "VERIFIED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-[11px] text-emerald-400 border-emerald-500/40 hover:bg-emerald-950/30"
                          onClick={() => handleVerify(emp.id)}
                        >
                          Verify
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={emp.status === "ACTIVE" ? "ghost" : "secondary"}
                        className="h-6 px-2 text-[11px]"
                        onClick={() => handleToggleStatus(emp)}
                      >
                        {emp.status === "ACTIVE" ? "Suspend" : "Activate"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    No employees matching filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-card border border-border rounded-lg max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Register New Airport Authority Staff
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setShowAddModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Full Name</label>
                  <Input
                    required
                    placeholder="e.g. Maya Lin"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Email Address</label>
                  <Input
                    required
                    type="email"
                    placeholder="staff@aocc.simulation"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value as DepartmentType })
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Assigned Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value as Role })
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Station Code</label>
                  <Input
                    required
                    placeholder="JFK"
                    value={formData.airportCode}
                    onChange={(e) =>
                      setFormData({ ...formData, airportCode: e.target.value.toUpperCase() })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Terminal</label>
                  <Input
                    placeholder="T1 / T4"
                    value={formData.terminal}
                    onChange={(e) => setFormData({ ...formData, terminal: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Shift Schedule</label>
                  <select
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="MORNING">MORNING (06-14Z)</option>
                    <option value="EVENING">EVENING (14-22Z)</option>
                    <option value="NIGHT">NIGHT (22-06Z)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Register Employee
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
