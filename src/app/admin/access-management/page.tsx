"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  Plus,
  RefreshCw,
  MoreVertical,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  ArrowRight,
  UserCheck,
  UserX,
  History,
  KeyRound,
  Edit,
  Eye,
  Building,
  Plane,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { DepartmentType, EmployeeDTO, Role, VerificationStatus } from "@/lib/domain";

const DEPARTMENTS: DepartmentType[] = [
  "ADMINISTRATION",
  "AIR_TRAFFIC_CONTROL",
  "AIRPORT_OPERATIONS",
  "GROUND_OPERATIONS",
  "AIRLINE_OPERATIONS",
  "TICKETING",
  "PASSENGER_SERVICES",
  "SECURITY",
  "BAGGAGE",
  "MAINTENANCE",
  "EMERGENCY_RESPONSE",
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

export default function AccessManagementPage() {
  const [employees, setEmployees] = useState<EmployeeDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals
  const [selectedEmp, setSelectedEmp] = useState<EmployeeDTO | null>(null);
  const [viewModal, setViewModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [roleModal, setRoleModal] = useState(false);
  const [permsModal, setPermsModal] = useState(false);
  const [activityModal, setActivityModal] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [editForm, setEditForm] = useState<Partial<EmployeeDTO>>({});
  const [selectedRole, setSelectedRole] = useState<Role>("OPERATIONS_MANAGER");
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    employeeId: "EMP-2001",
    fullName: "",
    email: "",
    phone: "+91 98000 00000",
    department: "AIRPORT_OPERATIONS" as DepartmentType,
    jobTitle: "Operations Specialist",
    role: "OPERATIONS_MANAGER" as Role,
    airportCode: "HYD",
    terminal: "T1",
    gateArea: "Main Concourse",
    shift: "MORNING",
    status: "PENDING",
    verificationStatus: "PENDING" as VerificationStatus,
    joinDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const fetchEmployees = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/employees");
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch {
      setErrorMsg("Failed to connect to personnel directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch("/api/employees")
      .then((res) => res.json())
      .then((data) => {
        if (active) {
          setEmployees(data.employees || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setErrorMsg("Failed to connect to personnel directory.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const showNotification = (success?: string, error?: string) => {
    if (success) {
      setSuccessMsg(success);
      setTimeout(() => setSuccessMsg(null), 5000);
    }
    if (error) {
      setErrorMsg(error);
      setTimeout(() => setErrorMsg(null), 7000);
    }
  };

  const isProtected = (emp: EmployeeDTO) => {
    return (
      emp.email.toLowerCase() === "admin@gmail.com" ||
      emp.employeeId === "EMP-0001" ||
      emp.role === "SUPER_ADMIN"
    );
  };

  // Status mutation (Activate, Deactivate, Suspend)
  const handleStatusChange = async (
    emp: EmployeeDTO,
    newStatus: "ACTIVE" | "DEACTIVATED" | "SUSPENDED",
    newVerification?: "VERIFIED" | "PENDING" | "REJECTED",
  ) => {
    if (isProtected(emp)) {
      showNotification(undefined, "Protected system owner account cannot be modified or removed.");
      return;
    }

    try {
      const payload: Record<string, unknown> = { status: newStatus };
      if (newVerification) payload.verificationStatus = newVerification;

      const res = await fetch(`/api/employees/${emp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        showNotification(undefined, data.error || "Action failed.");
        return;
      }

      showNotification(`Staff record updated to ${newStatus}.`);
      fetchEmployees();
    } catch {
      showNotification(undefined, "Network error updating staff status.");
    }
  };

  // Reset Access action
  const handleResetAccess = async (emp: EmployeeDTO) => {
    if (isProtected(emp)) {
      showNotification(undefined, "Protected system owner account cannot be modified or removed.");
      return;
    }

    try {
      const res = await fetch(`/api/employees/${emp.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset-access" }),
      });

      const data = await res.json();
      if (!res.ok) {
        showNotification(undefined, data.error || "Failed to reset access.");
        return;
      }

      showNotification(data.message || `Access sessions revoked for ${emp.fullName}.`);
      fetchEmployees();
    } catch {
      showNotification(undefined, "Network error resetting access.");
    }
  };

  // Update employee details
  const handleSaveEdit = async () => {
    if (!selectedEmp) return;

    if (isProtected(selectedEmp)) {
      if (editForm.role && editForm.role !== "SUPER_ADMIN") {
        showNotification(undefined, "Protected system owner account cannot be modified or removed.");
        return;
      }
    }

    try {
      const res = await fetch(`/api/employees/${selectedEmp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (!res.ok) {
        showNotification(undefined, data.error || "Failed to update employee.");
        return;
      }

      showNotification("Employee profile updated successfully.");
      setEditModal(false);
      fetchEmployees();
    } catch {
      showNotification(undefined, "Failed to update profile.");
    }
  };

  // Assign Role
  const handleAssignRole = async () => {
    if (!selectedEmp) return;

    if (isProtected(selectedEmp) && selectedRole !== "SUPER_ADMIN") {
      showNotification(undefined, "Protected system owner account cannot be modified or removed.");
      return;
    }

    try {
      const res = await fetch(`/api/employees/${selectedEmp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        showNotification(undefined, data.error || "Failed to reassign role.");
        return;
      }

      showNotification(`Role successfully assigned: ${selectedRole}`);
      setRoleModal(false);
      fetchEmployees();
    } catch {
      showNotification(undefined, "Failed to reassign role.");
    }
  };

  // Manage Direct Permissions
  const handleSavePermissions = async () => {
    if (!selectedEmp) return;

    try {
      const res = await fetch(`/api/employees/${selectedEmp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: userPermissions }),
      });

      const data = await res.json();
      if (!res.ok) {
        showNotification(undefined, data.error || "Failed to update permissions.");
        return;
      }

      showNotification("Direct permissions updated successfully.");
      setPermsModal(false);
      fetchEmployees();
    } catch {
      showNotification(undefined, "Failed to update permissions.");
    }
  };

  // Create Staff
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      const data = await res.json();
      if (!res.ok) {
        showNotification(undefined, data.error || "Failed to create staff record.");
        return;
      }

      showNotification(`Employee ${data.employee.fullName} provisioned with status PENDING.`);
      setCreateModal(false);
      fetchEmployees();
    } catch {
      showNotification(undefined, "Network error during employee provisioning.");
    }
  };

  // Filtered employees list
  const filteredEmployees = employees.filter((emp) => {
    const q = search.toLowerCase();
    const matchesSearch =
      emp.fullName.toLowerCase().includes(q) ||
      emp.email.toLowerCase().includes(q) ||
      emp.employeeId.toLowerCase().includes(q);

    const matchesDept = deptFilter === "ALL" || emp.department === deptFilter;
    const matchesRole = roleFilter === "ALL" || emp.role === roleFilter;
    const matchesStatus = statusFilter === "ALL" || emp.status === statusFilter;

    return matchesSearch && matchesDept && matchesRole && matchesStatus;
  });

  const totalCount = employees.length;
  const activeCount = employees.filter((e) => e.status === "ACTIVE" && e.verificationStatus === "VERIFIED").length;
  const pendingCount = employees.filter((e) => e.status === "PENDING" || e.verificationStatus === "PENDING").length;
  const suspendedCount = employees.filter((e) => e.status === "SUSPENDED" || e.status === "DEACTIVATED").length;

  return (
    <div className="flex-1 flex flex-col bg-[#070b13] text-slate-100 p-6 space-y-6">
      {/* Notifications */}
      {errorMsg && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-mono text-red-300 flex items-center justify-between shadow-lg shadow-red-950/40">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-mono text-emerald-300 flex items-center justify-between shadow-lg shadow-emerald-950/40">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="border-cyan-500/40 text-cyan-400 bg-cyan-950/30 font-mono text-xs">
              AIRPORT AUTHORITY GOVERNANCE
            </Badge>
            <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-950/30 font-mono text-xs">
              SERVER ENFORCED RBAC
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-cyan-400" />
            Staff Access & Credentials Management
          </h1>
          <p className="text-sm text-slate-400">
            Authoritative directory for airport personnel, security verification status, role assignment, and session control.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/access-management/permissions"
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-950/20 hover:bg-cyan-900/30 px-4 py-2.5 text-sm font-medium text-cyan-300 transition"
          >
            <KeyRound className="h-4 w-4 text-cyan-400" />
            Permission Matrix
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Button
            onClick={() => setCreateModal(true)}
            className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-lg shadow-cyan-600/20 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Provision Staff
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchEmployees}
            disabled={loading}
            className="border-slate-700 bg-slate-800 text-slate-300 hover:text-white rounded-xl"
            title="Refresh personnel"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs font-mono">TOTAL ACCREDITED STAFF</CardDescription>
            <CardTitle className="text-2xl font-bold text-white flex items-center justify-between">
              {totalCount}
              <ShieldCheck className="h-5 w-5 text-slate-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">Across 11 operational airport sectors</CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs font-mono">ACTIVE & VERIFIED</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-400 flex items-center justify-between">
              {activeCount}
              <UserCheck className="h-5 w-5 text-emerald-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">Full clearance for airside operations</CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs font-mono">PENDING CLEARANCE</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-400 flex items-center justify-between">
              {pendingCount}
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">Awaiting background check / admin verification</CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs font-mono">RESTRICTED / SUSPENDED</CardDescription>
            <CardTitle className="text-2xl font-bold text-red-400 flex items-center justify-between">
              {suspendedCount}
              <UserX className="h-5 w-5 text-red-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">Airside access revoked by security command</CardContent>
        </Card>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-slate-800 bg-slate-900/40">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search by Employee ID, Name, or Email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-950/60 border-slate-700 text-sm text-slate-200 placeholder:text-slate-500 rounded-lg"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="bg-slate-950/80 border border-slate-700 text-xs text-slate-300 rounded-lg px-3 py-2"
          >
            <option value="ALL">All Departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d.replace(/_/g, " ")}</option>
            ))}
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-950/80 border border-slate-700 text-xs text-slate-300 rounded-lg px-3 py-2"
          >
            <option value="ALL">All Roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950/80 border border-slate-700 text-xs text-slate-300 rounded-lg px-3 py-2"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_DUTY">On Duty</option>
            <option value="PENDING">Pending</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="DEACTIVATED">Deactivated</option>
          </select>
        </div>
      </div>

      {/* Staff Access Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs uppercase font-mono text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Employee ID</th>
                <th className="px-4 py-3.5">Name</th>
                <th className="px-4 py-3.5">Email</th>
                <th className="px-4 py-3.5">Department</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Airport</th>
                <th className="px-4 py-3.5">Terminal</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Verification</th>
                <th className="px-4 py-3.5">Last Login</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-slate-500 font-mono text-sm">
                    {loading ? "Accessing secure authority directory..." : "No personnel records match the specified filters."}
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const protectedAccount = isProtected(emp);
                  return (
                    <tr
                      key={emp.id}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        protectedAccount ? "bg-amber-950/10 border-l-2 border-l-amber-500" : ""
                      }`}
                    >
                      {/* Employee ID */}
                      <td className="px-4 py-3.5 font-mono text-xs font-semibold text-cyan-300">
                        <div className="flex items-center gap-1.5">
                          {emp.employeeId}
                          {protectedAccount && (
                            <span title="Permanent System Owner (Protected)">
                              <Lock className="h-3.5 w-3.5 text-amber-400" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Name */}
                      <td className="px-4 py-3.5 font-medium text-white">
                        <div>
                          <div>{emp.fullName}</div>
                          <div className="text-[11px] text-slate-500">{emp.jobTitle}</div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3.5 text-xs text-slate-300 font-mono">
                        {emp.email}
                      </td>

                      {/* Department */}
                      <td className="px-4 py-3.5 text-xs text-slate-400 font-mono">
                        {emp.department.replace(/_/g, " ")}
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3.5">
                        <Badge
                          variant="outline"
                          className={`text-xs font-mono ${
                            emp.role === "SUPER_ADMIN"
                              ? "border-amber-500/50 bg-amber-950/40 text-amber-300 font-bold"
                              : emp.role === "ADMIN" || emp.role === "AIRPORT_ADMIN"
                              ? "border-cyan-500/50 bg-cyan-950/30 text-cyan-300"
                              : "border-slate-700 bg-slate-800/40 text-slate-300"
                          }`}
                        >
                          {emp.role}
                        </Badge>
                      </td>

                      {/* Airport */}
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-300">
                        {emp.airportCode || "HYD"}
                      </td>

                      {/* Terminal */}
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-300">
                        {emp.terminal || "T1"}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <Badge
                          variant="outline"
                          className={`text-[11px] font-mono ${
                            emp.status === "ACTIVE" || emp.status === "ON_DUTY"
                              ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-400"
                              : emp.status === "SUSPENDED" || emp.status === "DEACTIVATED"
                              ? "border-red-500/40 bg-red-950/30 text-red-400"
                              : "border-amber-500/40 bg-amber-950/30 text-amber-400"
                          }`}
                        >
                          {emp.status}
                        </Badge>
                      </td>

                      {/* Verification */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 text-xs">
                          {emp.verificationStatus === "VERIFIED" ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-mono">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              VERIFIED
                            </span>
                          ) : emp.verificationStatus === "REJECTED" ? (
                            <span className="inline-flex items-center gap-1 text-red-400 font-mono">
                              <XCircle className="h-3.5 w-3.5" />
                              REJECTED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-400 font-mono">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              PENDING
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Last Login */}
                      <td className="px-4 py-3.5 text-xs text-slate-400 font-mono">
                        {emp.lastLogin ? new Date(emp.lastLogin).toLocaleString() : "Never"}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* View */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedEmp(emp);
                              setViewModal(true);
                            }}
                            className="h-7 px-2 text-xs text-slate-300 hover:text-white"
                            title="View Record"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          {/* Edit */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedEmp(emp);
                              setEditForm({
                                fullName: emp.fullName,
                                phone: emp.phone,
                                department: emp.department,
                                jobTitle: emp.jobTitle,
                                terminal: emp.terminal,
                                shift: emp.shift,
                              });
                              setEditModal(true);
                            }}
                            className="h-7 px-2 text-xs text-slate-300 hover:text-white"
                            title="Edit Staff"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>

                          {/* Assign Role */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (protectedAccount) {
                                showNotification(undefined, "Protected system owner account cannot be modified or removed.");
                                return;
                              }
                              setSelectedEmp(emp);
                              setSelectedRole(emp.role);
                              setRoleModal(true);
                            }}
                            disabled={protectedAccount}
                            className={`h-7 px-2 text-xs ${
                              protectedAccount
                                ? "text-slate-600 cursor-not-allowed"
                                : "text-cyan-400 hover:text-cyan-300"
                            }`}
                            title={protectedAccount ? "Protected System Owner" : "Assign Role"}
                          >
                            <Shield className="h-3.5 w-3.5" />
                          </Button>

                          {/* Manage Permissions */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedEmp(emp);
                              setUserPermissions(emp.permissions || []);
                              setPermsModal(true);
                            }}
                            className="h-7 px-2 text-xs text-amber-400 hover:text-amber-300"
                            title="Manage Permissions"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </Button>

                          {/* Status Actions */}
                          {emp.status !== "ACTIVE" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusChange(emp, "ACTIVE", "VERIFIED")}
                              className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300"
                              title="Activate & Verify"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusChange(emp, "SUSPENDED")}
                              disabled={protectedAccount}
                              className={`h-7 px-2 text-xs ${
                                protectedAccount
                                  ? "text-slate-600 cursor-not-allowed"
                                  : "text-red-400 hover:text-red-300"
                              }`}
                              title={protectedAccount ? "Protected Account" : "Suspend Staff"}
                            >
                              <UserX className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          {/* Reset Access */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResetAccess(emp)}
                            disabled={protectedAccount}
                            className={`h-7 px-2 text-xs ${
                              protectedAccount
                                ? "text-slate-600 cursor-not-allowed"
                                : "text-purple-400 hover:text-purple-300"
                            }`}
                            title={protectedAccount ? "Protected Account" : "Reset Access & Revoke Sessions"}
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>

                          {/* View Activity */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedEmp(emp);
                              setActivityModal(true);
                            }}
                            className="h-7 px-2 text-xs text-slate-400 hover:text-white"
                            title="View Audit Activity"
                          >
                            <History className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW DETAILS MODAL */}
      {viewModal && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="max-w-lg w-full rounded-2xl border border-slate-700 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-cyan-400" />
                <h3 className="font-bold text-white text-lg">{selectedEmp.fullName}</h3>
              </div>
              <button type="button" onClick={() => setViewModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm font-mono">
              <div>
                <span className="text-xs text-slate-500 block">Employee ID</span>
                <span className="text-cyan-300">{selectedEmp.employeeId}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Email</span>
                <span className="text-slate-200">{selectedEmp.email}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Department</span>
                <span className="text-slate-200">{selectedEmp.department}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Job Title</span>
                <span className="text-slate-200">{selectedEmp.jobTitle}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Role</span>
                <span className="text-amber-300">{selectedEmp.role}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Shift</span>
                <span className="text-slate-200">{selectedEmp.shift}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Airport / Terminal</span>
                <span className="text-slate-200">{selectedEmp.airportCode} / {selectedEmp.terminal || "T1"}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Gate Assignment</span>
                <span className="text-slate-200">{selectedEmp.gateArea || "General Concourse"}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Status</span>
                <span className="text-emerald-400">{selectedEmp.status}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Verification</span>
                <span className="text-emerald-400">{selectedEmp.verificationStatus}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Join Date</span>
                <span className="text-slate-200">{new Date(selectedEmp.joinDate).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Last Active</span>
                <span className="text-slate-200">{selectedEmp.lastLogin ? new Date(selectedEmp.lastLogin).toLocaleString() : "Never"}</span>
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-500 block mb-1 font-mono">Bound Permissions</span>
              <div className="flex flex-wrap gap-1">
                {selectedEmp.permissions && selectedEmp.permissions.length > 0 ? (
                  selectedEmp.permissions.map((p) => (
                    <Badge key={p} variant="outline" className="border-cyan-500/30 bg-cyan-950/20 text-cyan-300 text-[10px] font-mono">
                      {p}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 italic">Default role-inherited permissions</span>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <Button onClick={() => setViewModal(false)} className="bg-slate-800 hover:bg-slate-700 text-white rounded-xl">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editModal && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="max-w-md w-full rounded-2xl border border-slate-700 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-lg">Edit Employee: {selectedEmp.employeeId}</h3>
              <button type="button" onClick={() => setEditModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Full Name</label>
                <Input
                  value={editForm.fullName || ""}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="bg-slate-950 border-slate-700"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Phone</label>
                <Input
                  value={editForm.phone || ""}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="bg-slate-950 border-slate-700"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Job Title</label>
                <Input
                  value={editForm.jobTitle || ""}
                  onChange={(e) => setEditForm({ ...editForm, jobTitle: e.target.value })}
                  className="bg-slate-950 border-slate-700"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Terminal</label>
                <Input
                  value={editForm.terminal || ""}
                  onChange={(e) => setEditForm({ ...editForm, terminal: e.target.value })}
                  className="bg-slate-950 border-slate-700"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Shift</label>
                <select
                  value={editForm.shift || "MORNING"}
                  onChange={(e) => setEditForm({ ...editForm, shift: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg p-2 text-sm"
                >
                  <option value="MORNING">Morning (06:00 - 14:00)</option>
                  <option value="EVENING">Evening (14:00 - 22:00)</option>
                  <option value="NIGHT">Night (22:00 - 06:00)</option>
                  <option value="OPS-A">Operations Shift A</option>
                  <option value="ALL">24/7 All Access</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditModal(false)} className="text-slate-400">Cancel</Button>
              <Button onClick={handleSaveEdit} className="bg-cyan-600 hover:bg-cyan-500 text-white">Save Changes</Button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN ROLE MODAL */}
      {roleModal && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="max-w-md w-full rounded-2xl border border-slate-700 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-lg">Assign Role: {selectedEmp.fullName}</h3>
              <button type="button" onClick={() => setRoleModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Selecting a new role updates the employee&apos;s default permission matrix and determines their operational portal access.
              </p>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as Role)}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg p-2.5 text-sm font-mono"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRoleModal(false)} className="text-slate-400">Cancel</Button>
              <Button onClick={handleAssignRole} className="bg-cyan-600 hover:bg-cyan-500 text-white">Apply Role</Button>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE PERMISSIONS MODAL */}
      {permsModal && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="max-w-xl w-full rounded-2xl border border-slate-700 bg-slate-900 p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-lg">Direct Permissions</h3>
                <p className="text-xs text-slate-400">{selectedEmp.fullName} ({selectedEmp.role})</p>
              </div>
              <button type="button" onClick={() => setPermsModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {[
                "VIEW_DASHBOARD",
                "VIEW_FLIGHTS",
                "CREATE_FLIGHT",
                "EDIT_FLIGHT",
                "CANCEL_FLIGHT",
                "CONTROL_ATC",
                "SEND_ATC_COMMAND",
                "VIEW_TRAFFIC",
                "MANAGE_GATES",
                "MANAGE_RUNWAYS",
                "CREATE_BOOKING",
                "MODIFY_BOOKING",
                "CANCEL_BOOKING",
                "VERIFY_TICKET",
                "CHECK_IN_PASSENGER",
                "BOARD_PASSENGER",
                "MANAGE_GROUND_OPERATIONS",
                "MANAGE_STAFF",
                "VERIFY_STAFF",
                "MANAGE_ROLES",
                "MANAGE_PERMISSIONS",
                "VIEW_ANALYTICS",
                "VIEW_AUDIT_LOGS",
                "MANAGE_EMERGENCIES",
                "MANAGE_SYSTEM_SETTINGS",
                "MANAGE_SIMULATOR",
              ].map((perm) => {
                const checked = userPermissions.includes(perm);
                return (
                  <label
                    key={perm}
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-800 hover:bg-slate-800/40 cursor-pointer text-xs font-mono"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        if (checked) {
                          setUserPermissions(userPermissions.filter((p) => p !== perm));
                        } else {
                          setUserPermissions([...userPermissions, perm]);
                        }
                      }}
                      className="rounded border-slate-700 bg-slate-950 text-cyan-500"
                    />
                    <span className={checked ? "text-cyan-300 font-semibold" : "text-slate-400"}>
                      {perm}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPermsModal(false)} className="text-slate-400">Cancel</Button>
              <Button onClick={handleSavePermissions} className="bg-cyan-600 hover:bg-cyan-500 text-white">Save Permissions</Button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW ACTIVITY MODAL */}
      {activityModal && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="max-w-lg w-full rounded-2xl border border-slate-700 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-purple-400" />
                <h3 className="font-bold text-white text-lg">Activity & Audit Trail: {selectedEmp.fullName}</h3>
              </div>
              <button type="button" onClick={() => setActivityModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span>RECORD_CREATED</span>
                  <span>{new Date(selectedEmp.joinDate).toLocaleString()}</span>
                </div>
                <p className="text-slate-300">Staff account established in {selectedEmp.department} sector.</p>
              </div>

              {selectedEmp.lastLogin && (
                <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>AUTHENTICATION_SUCCESS</span>
                    <span>{new Date(selectedEmp.lastLogin).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-300">Signed into Airport Authority Control Center from authorized station.</p>
                </div>
              )}

              <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span>CLEARANCE_CHECK</span>
                  <span>CURRENT</span>
                </div>
                <p className="text-slate-300">Verification Status: {selectedEmp.verificationStatus} | Status: {selectedEmp.status}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <Button onClick={() => setActivityModal(false)} className="bg-slate-800 hover:bg-slate-700 text-white rounded-xl">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE STAFF MODAL */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="max-w-xl w-full rounded-2xl border border-slate-700 bg-slate-900 p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-cyan-400" />
                <h3 className="font-bold text-white text-lg">Provision New Airport Staff Member</h3>
              </div>
              <button type="button" onClick={() => setCreateModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Employee ID *</label>
                  <Input
                    required
                    value={createForm.employeeId}
                    onChange={(e) => setCreateForm({ ...createForm, employeeId: e.target.value })}
                    className="bg-slate-950 border-slate-700 text-cyan-300 font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Full Legal Name *</label>
                  <Input
                    required
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                    className="bg-slate-950 border-slate-700 text-slate-200"
                    placeholder="e.g. Maya Rao"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Email Address *</label>
                  <Input
                    required
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="bg-slate-950 border-slate-700 text-slate-200"
                    placeholder="e.g. staff@airport.test"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Phone *</label>
                  <Input
                    required
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="bg-slate-950 border-slate-700 text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Department *</label>
                  <select
                    value={createForm.department}
                    onChange={(e) => setCreateForm({ ...createForm, department: e.target.value as DepartmentType })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg p-2"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Job Title *</label>
                  <Input
                    required
                    value={createForm.jobTitle}
                    onChange={(e) => setCreateForm({ ...createForm, jobTitle: e.target.value })}
                    className="bg-slate-950 border-slate-700 text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Role *</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as Role })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg p-2"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Airport *</label>
                  <Input
                    required
                    value={createForm.airportCode}
                    onChange={(e) => setCreateForm({ ...createForm, airportCode: e.target.value })}
                    className="bg-slate-950 border-slate-700 text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Terminal</label>
                  <Input
                    value={createForm.terminal}
                    onChange={(e) => setCreateForm({ ...createForm, terminal: e.target.value })}
                    className="bg-slate-950 border-slate-700 text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Shift *</label>
                  <select
                    value={createForm.shift}
                    onChange={(e) => setCreateForm({ ...createForm, shift: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg p-2"
                  >
                    <option value="MORNING">Morning (06:00 - 14:00)</option>
                    <option value="EVENING">Evening (14:00 - 22:00)</option>
                    <option value="NIGHT">Night (22:00 - 06:00)</option>
                    <option value="OPS-A">Operations Shift A</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Initial Status</label>
                  <Badge variant="outline" className="border-amber-500/40 bg-amber-950/20 text-amber-300 py-2 w-full justify-center">
                    PENDING
                  </Badge>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Verification Status</label>
                  <Badge variant="outline" className="border-amber-500/40 bg-amber-950/20 text-amber-300 py-2 w-full justify-center">
                    PENDING
                  </Badge>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Notes / Security Assessment</label>
                <textarea
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  placeholder="Security badge issuance notes, airside driving permit status..."
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <Button variant="ghost" type="button" onClick={() => setCreateModal(false)} className="text-slate-400">
                  Cancel
                </Button>
                <Button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white">
                  Provision Record
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
