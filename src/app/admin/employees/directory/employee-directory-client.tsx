"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Search,
  Plus,
  Download,
  ShieldCheck,
  Building,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  Mail,
  Phone,
  Clock,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Lock,
  UserX,
  UserCheck,
  Bot,
  ShieldAlert,
  Calendar,
  MapPin,
  Briefcase,
  Copy,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { PasswordChangeCard } from "@/components/employee/password-change-card";
import type {
  SafeEmployeeDirectoryRecord,
  EmployeeDirectorySummary,
} from "@/server/employees/employee-data";
import type { UserDTO } from "@/lib/domain";

const DEPARTMENTS = [
  "ALL",
  "AIR_TRAFFIC_CONTROL",
  "AIRPORT_OPERATIONS",
  "GROUND_OPERATIONS",
  "AIRLINE_OPERATIONS",
  "TICKETING",
  "PASSENGER_SERVICES",
  "SECURITY",
  "BAGGAGE",
  "MAINTENANCE",
  "ADMINISTRATION",
];

const ROLES = [
  "ALL",
  "SUPER_ADMIN",
  "AIRPORT_ADMIN",
  "OPERATIONS_MANAGER",
  "ATC_CONTROLLER",
  "SENIOR_ATC_CONTROLLER",
  "GROUND_OPERATOR",
  "AIRLINE_OPERATOR",
  "TICKETING_AGENT",
  "GATE_AGENT",
  "SECURITY_OFFICER",
  "BAGGAGE_STAFF",
  "MAINTENANCE_STAFF",
  "FLIGHT_DISPATCHER",
  "SIMULATOR_OPERATOR",
];

const ACCOUNT_STATUS_OPTIONS = [
  { value: "ALL", label: "All Account Statuses" },
  { value: "ACTIVE", label: "Active Accounts" },
  { value: "SUSPENDED", label: "Suspended / Locked" },
  { value: "MUST_CHANGE_PASSWORD", label: "Password Reset Required" },
  { value: "INVITATION_PENDING", label: "Invitation Pending" },
];

export function EmployeeDirectoryClient({
  currentUser,
}: {
  currentUser: UserDTO;
}) {
  const [records, setRecords] = useState<SafeEmployeeDirectoryRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("ALL");
  const [role, setRole] = useState("ALL");
  const [airport, setAirport] = useState("ALL");
  const [accountStatus, setAccountStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [summary, setSummary] = useState<EmployeeDirectorySummary>({
    total: 0,
    active: 0,
    suspended: 0,
    virtual: 0,
    pendingVerification: 0,
    mustChangePassword: 0,
  });

  // Modals
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [inspectingRecord, setInspectingRecord] = useState<SafeEmployeeDirectoryRecord | null>(null);
  const [resetTarget, setResetTarget] = useState<SafeEmployeeDirectoryRecord | null>(null);
  const [showMyPasswordModal, setShowMyPasswordModal] = useState(false);
  const [generatedTempCredential, setGeneratedTempCredential] = useState<{
    employeeId: string;
    fullName: string;
    password: string;
  } | null>(null);

  // Provision Form
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "+91 90000 00000",
    department: "AIRPORT_OPERATIONS",
    jobTitle: "",
    role: "OPERATIONS_MANAGER",
    assignedAirport: "HYD",
    terminal: "T1",
    gateArea: "CONCOURSE_A",
    shift: "MORNING",
    initialPassword: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDirectory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (department !== "ALL") params.set("department", department);
      if (role !== "ALL") params.set("role", role);
      if (airport !== "ALL") params.set("airport", airport);
      if (accountStatus !== "ALL") params.set("accountStatus", accountStatus);
      params.set("page", String(page));
      params.set("limit", "15");

      const res = await fetch(`/api/employees/directory?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load employee directory");
      }
      const data = await res.json();
      setRecords(data.records || []);
      setTotalCount(data.totalCount || 0);
      setTotalPages(data.totalPages || 1);
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading directory");
    } finally {
      setLoading(false);
    }
  }, [search, department, role, airport, accountStatus, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDirectory();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchDirectory]);

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.jobTitle) {
      setError("Please complete all required fields.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/employees/directory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Provisioning failed");

      setSuccess(data.message || "Employee successfully provisioned!");
      setShowProvisionModal(false);

      if (data.temporaryPassword && data.record) {
        setGeneratedTempCredential({
          employeeId: data.record.employeeId,
          fullName: data.record.fullName,
          password: data.temporaryPassword,
        });
      }

      setForm({
        fullName: "",
        email: "",
        phone: "+91 90000 00000",
        department: "AIRPORT_OPERATIONS",
        jobTitle: "",
        role: "OPERATIONS_MANAGER",
        assignedAirport: "HYD",
        terminal: "T1",
        gateArea: "CONCOURSE_A",
        shift: "MORNING",
        initialPassword: "",
      });
      fetchDirectory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to provision employee");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/employees/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: resetTarget.employeeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password reset failed");

      setSuccess(data.message);
      if (data.temporaryPassword) {
        setGeneratedTempCredential({
          employeeId: resetTarget.employeeId,
          fullName: resetTarget.fullName,
          password: data.temporaryPassword,
        });
      }
      setResetTarget(null);
      fetchDirectory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (record: SafeEmployeeDirectoryRecord) => {
    const nextStatus = record.employmentStatus === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/employees/directory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: record.employeeId,
          action: "TOGGLE_STATUS",
          status: nextStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Status update failed");

      setSuccess(data.message);
      if (inspectingRecord && inspectingRecord.employeeId === record.employeeId) {
        setInspectingRecord({
          ...inspectingRecord,
          employmentStatus: nextStatus as any,
          accountStatus: nextStatus === "SUSPENDED" ? "SUSPENDED" : "ACTIVE",
        });
      }
      fetchDirectory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (records.length === 0) return;
    const headers = [
      "Employee ID",
      "Full Name",
      "Work Email",
      "Department",
      "Job Title",
      "Role",
      "Salary Grade",
      "Assigned Airport",
      "Shift",
      "Employment Status",
      "Account Status",
      "Verification Status",
      "Virtual Employee",
    ];
    const rows = records.map((r) => [
      r.employeeId,
      r.fullName,
      r.email,
      r.department,
      r.jobTitle,
      r.role,
      r.jobGrade,
      r.assignedAirport,
      r.shift,
      r.employmentStatus,
      r.accountStatus,
      r.verificationStatus,
      r.isVirtual ? "YES" : "NO",
    ]);
    const csvContent = [headers.join(","), ...rows.map((row) => row.map((f) => `"${f}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `aocc-employee-directory-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to AOCC Operations
            </Link>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Users className="h-6 w-6 text-cyan-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white font-mono">
              AOCC Employee Directory & Credentials
            </h1>
            <Badge className="bg-cyan-950/60 border-cyan-500/40 text-cyan-300 text-xs">
              {totalCount} Total Employees
            </Badge>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            24/7 Authoritative directory, collision-resistant IDs, secure temporary credentials, and zero secret leakage.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowMyPasswordModal(true)}
            className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-mono"
          >
            <KeyRound className="mr-1.5 h-3.5 w-3.5 text-amber-400" /> Change My Password
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-mono"
          >
            <Download className="mr-1.5 h-3.5 w-3.5 text-cyan-400" /> Export CSV
          </Button>

          <Button
            size="sm"
            onClick={() => setShowProvisionModal(true)}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-semibold shadow-lg shadow-cyan-950/50"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Provision Employee
          </Button>
        </div>
      </div>

      {/* Summary KPI Status Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-slate-800 bg-[#090e17]/80 p-3">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Total Accounts</div>
          <div className="text-xl font-bold font-mono text-white mt-1">{summary.total}</div>
        </Card>
        <Card className="border-emerald-950/60 bg-emerald-950/20 p-3 border">
          <div className="text-[10px] font-mono text-emerald-400 uppercase">Active Accounts</div>
          <div className="text-xl font-bold font-mono text-emerald-300 mt-1">{summary.active}</div>
        </Card>
        <Card className="border-rose-950/60 bg-rose-950/20 p-3 border">
          <div className="text-[10px] font-mono text-rose-400 uppercase">Suspended / Locked</div>
          <div className="text-xl font-bold font-mono text-rose-300 mt-1">{summary.suspended}</div>
        </Card>
        <Card className="border-purple-950/60 bg-purple-950/20 p-3 border">
          <div className="text-[10px] font-mono text-purple-400 uppercase">Virtual Staff</div>
          <div className="text-xl font-bold font-mono text-purple-300 mt-1">{summary.virtual}</div>
        </Card>
        <Card className="border-amber-950/60 bg-amber-950/20 p-3 border">
          <div className="text-[10px] font-mono text-amber-400 uppercase">Pending Verification</div>
          <div className="text-xl font-bold font-mono text-amber-300 mt-1">{summary.pendingVerification}</div>
        </Card>
        <Card className="border-sky-950/60 bg-sky-950/20 p-3 border">
          <div className="text-[10px] font-mono text-sky-400 uppercase">Password Reset Due</div>
          <div className="text-xl font-bold font-mono text-sky-300 mt-1">{summary.mustChangePassword}</div>
        </Card>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-950/30 p-3.5 text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3.5 text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Temporary Credential Delivery Banner (Single-View Display) */}
      {generatedTempCredential && (
        <div className="rounded-xl border border-amber-500/50 bg-amber-950/40 p-4 space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between text-amber-300 font-bold">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-amber-400" />
              <span>TEMPORARY CREDENTIAL GENERATED (SINGLE DISPLAY ONLY)</span>
            </div>
            <button
              onClick={() => setGeneratedTempCredential(null)}
              className="text-amber-400 hover:text-amber-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-slate-300 text-[11px]">
            Provide this temporary password to {generatedTempCredential.fullName} (
            <span className="text-cyan-300">{generatedTempCredential.employeeId}</span>). This temporary password will
            not be shown again and cannot be retrieved later. The employee will be required to choose a new permanent
            password upon logging in.
          </p>
          <div className="flex items-center gap-3 bg-slate-950/90 border border-amber-500/40 rounded-lg p-2.5">
            <span className="text-slate-400 text-[10px]">Temporary Password:</span>
            <span className="text-amber-200 font-bold select-all tracking-wider text-sm">
              {generatedTempCredential.password}
            </span>
            <CopyButton value={generatedTempCredential.password} title="Copy Temporary Password" />
          </div>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <Card className="border-slate-800 bg-[#090e17]/90 shadow-xl">
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div className="sm:col-span-1 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search exact ID (AOCC-EMP-000001), name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 h-9 text-xs bg-slate-950 border-slate-700 text-slate-200"
              />
            </div>

            <div>
              <select
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  setPage(1);
                }}
                className="w-full h-9 rounded-md border border-slate-700 bg-slate-950 px-3 text-xs font-mono text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    Dept: {d.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setPage(1);
                }}
                className="w-full h-9 rounded-md border border-slate-700 bg-slate-950 px-3 text-xs font-mono text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    Role: {r.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={airport}
                onChange={(e) => {
                  setAirport(e.target.value);
                  setPage(1);
                }}
                className="w-full h-9 rounded-md border border-slate-700 bg-slate-950 px-3 text-xs font-mono text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="ALL">Station: All Airports</option>
                <option value="HYD">Station: HYD (Hyderabad Default)</option>
                <option value="BOM">Station: BOM (Mumbai)</option>
                <option value="DEL">Station: DEL (Delhi)</option>
                <option value="BLR">Station: BLR (Bengaluru)</option>
              </select>
            </div>

            <div>
              <select
                value={accountStatus}
                onChange={(e) => {
                  setAccountStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full h-9 rounded-md border border-slate-700 bg-slate-950 px-3 text-xs font-mono text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                {ACCOUNT_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Directory Table */}
      <div className="rounded-xl border border-slate-800 bg-[#090e17]/90 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-[10px] text-slate-400 uppercase border-b border-slate-800 sticky top-0">
              <tr>
                <th className="py-3 px-3.5">Employee / ID</th>
                <th className="py-3 px-3.5">Work Email / Contact</th>
                <th className="py-3 px-3.5">Department & Title</th>
                <th className="py-3 px-3.5">Role</th>
                <th className="py-3 px-3.5">Salary Grade</th>
                <th className="py-3 px-3.5">Station & Shift</th>
                <th className="py-3 px-3.5">Status & Tags</th>
                <th className="py-3 px-3.5 text-right">Account Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {records.map((r) => (
                <tr
                  key={r.employeeId}
                  onClick={() => setInspectingRecord(r)}
                  className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-sans font-bold text-white">{r.fullName}</span>
                      {r.isVirtual && (
                        <Badge
                          variant="outline"
                          className="border-purple-500/40 bg-purple-950/30 text-purple-300 text-[9px] py-0 px-1"
                        >
                          <Bot className="h-2.5 w-2.5 mr-0.5 inline" /> SIM
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-cyan-400 mt-0.5 font-bold">
                      <span>{r.employeeId}</span>
                      <CopyButton value={r.employeeId} title="Copy Employee ID" />
                    </div>
                  </td>

                  <td className="py-2.5 px-3.5">
                    <div className="flex items-center gap-1.5 text-slate-200">
                      <span>{r.email}</span>
                      <CopyButton value={r.email} title="Copy Work Email" />
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{r.phone}</div>
                  </td>

                  <td className="py-2.5 px-3.5">
                    <div className="text-white font-semibold">{r.jobTitle}</div>
                    <div className="text-[11px] text-slate-400">{r.department.replace(/_/g, " ")}</div>
                  </td>

                  <td className="py-2.5 px-3.5">
                    <Badge variant="outline" className="border-slate-700 bg-slate-900 text-cyan-300 text-[10px]">
                      {r.role}
                    </Badge>
                  </td>

                  <td className="py-2.5 px-3.5">
                    <Badge
                      variant="outline"
                      className="border-amber-500/40 bg-amber-950/30 text-amber-300 text-[10px] font-semibold"
                    >
                      {r.jobGrade}
                    </Badge>
                    {r.baseSalary !== undefined && (
                      <div className="text-[10px] text-slate-400 mt-0.5">₹{r.baseSalary.toLocaleString("en-IN")}/mo</div>
                    )}
                  </td>

                  <td className="py-2.5 px-3.5">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-emerald-400">{r.assignedAirport}</span>
                      <span className="text-slate-400">· {r.terminal || "T1"}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">{r.shift} Shift</div>
                  </td>

                  <td className="py-2.5 px-3.5">
                    <div className="flex flex-wrap gap-1">
                      {/* Employment Status Badge */}
                      <Badge
                        className={
                          r.employmentStatus === "ACTIVE" || r.employmentStatus === "ON_DUTY"
                            ? "bg-emerald-950 border-emerald-500/40 text-emerald-300 text-[9px]"
                            : r.employmentStatus === "SUSPENDED"
                            ? "bg-rose-950 border-rose-500/40 text-rose-300 text-[9px]"
                            : "bg-slate-900 border-slate-700 text-slate-400 text-[9px]"
                        }
                      >
                        {r.employmentStatus}
                      </Badge>

                      {/* Verification Status Badge */}
                      <Badge
                        variant="outline"
                        className={
                          r.verificationStatus === "VERIFIED"
                            ? "border-emerald-500/30 text-emerald-400 text-[9px]"
                            : "border-amber-500/30 text-amber-400 text-[9px]"
                        }
                      >
                        {r.verificationStatus}
                      </Badge>

                      {/* Account Status Badge */}
                      {r.accountStatus === "MUST_CHANGE_PASSWORD" && (
                        <Badge
                          variant="outline"
                          className="border-amber-500/40 bg-amber-950/20 text-amber-300 text-[9px]"
                        >
                          RESET DUE
                        </Badge>
                      )}
                    </div>
                  </td>

                  <td className="py-2.5 px-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setInspectingRecord(r)}
                        className="h-7 px-2 text-xs text-cyan-400 hover:text-cyan-300"
                        title="View Full Profile"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> View
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setResetTarget(r)}
                        className="h-7 px-2 text-xs border-slate-800 bg-slate-950 text-amber-300 hover:bg-slate-900"
                        title="Reset Employee Password"
                      >
                        <KeyRound className="h-3 w-3 mr-1" /> Reset
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleStatus(r)}
                        disabled={actionLoading}
                        className={
                          r.employmentStatus === "SUSPENDED"
                            ? "h-7 px-2 text-xs border-emerald-800/40 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-950/40"
                            : "h-7 px-2 text-xs border-rose-800/40 bg-rose-950/20 text-rose-300 hover:bg-rose-950/40"
                        }
                        title={r.employmentStatus === "SUSPENDED" ? "Reactivate Account" : "Suspend Account"}
                      >
                        {r.employmentStatus === "SUSPENDED" ? (
                          <>
                            <UserCheck className="h-3 w-3 mr-1" /> Activate
                          </>
                        ) : (
                          <>
                            <UserX className="h-3 w-3 mr-1" /> Suspend
                          </>
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

              {records.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-mono">
                    No employee directory records found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <div>
            Showing {(page - 1) * 15 + 1} to {Math.min(page * 15, totalCount)} of {totalCount} records
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 border-slate-800 bg-slate-950 text-slate-300"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </Button>
            <span className="px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 border-slate-800 bg-slate-950 text-slate-300"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Authorized Password Reset Confirmation Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#0b1320] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-bold text-white font-mono">Reset Employee Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono text-slate-300">
              <p>
                Are you sure you want to reset credentials for{" "}
                <span className="text-white font-bold">{resetTarget.fullName}</span> (
                <span className="text-cyan-400">{resetTarget.employeeId}</span>)?
              </p>

              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 space-y-1.5 text-amber-300 text-[11px]">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5" /> Security Notice
                </div>
                <ul className="list-disc pl-4 space-y-1 text-slate-300">
                  <li>Existing active user sessions will be immediately terminated.</li>
                  <li>A single-use temporary password will be generated for the employee.</li>
                  <li>The employee must set a new permanent password on next login.</li>
                  <li>This action is permanently audited under your administrator account.</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-800 pt-3">
              <Button
                variant="outline"
                onClick={() => setResetTarget(null)}
                className="border-slate-700 text-slate-300 text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleResetPassword}
                disabled={actionLoading}
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
              >
                {actionLoading ? "Resetting..." : "Confirm & Generate Password"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Provision Employee Modal */}
      {showProvisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-[#0b1320] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white font-mono">Provision New Employee Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowProvisionModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleProvision} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Full Name *</label>
                  <Input
                    required
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    className="bg-slate-950 border-slate-700 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Work Email *</label>
                  <Input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="e.g. ramesh@aocc.test"
                    className="bg-slate-950 border-slate-700 text-xs text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Department *</label>
                  <select
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="w-full h-9 rounded-md border border-slate-700 bg-slate-950 px-3 text-xs text-slate-200"
                  >
                    {DEPARTMENTS.filter((d) => d !== "ALL").map((d) => (
                      <option key={d} value={d}>
                        {d.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Role *</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full h-9 rounded-md border border-slate-700 bg-slate-950 px-3 text-xs text-slate-200"
                  >
                    {ROLES.filter((r) => r !== "ALL").map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Job Title *</label>
                  <Input
                    required
                    value={form.jobTitle}
                    onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                    placeholder="e.g. Senior Operations Officer"
                    className="bg-slate-950 border-slate-700 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Assigned Airport</label>
                  <Input
                    value={form.assignedAirport}
                    onChange={(e) => setForm({ ...form, assignedAirport: e.target.value.toUpperCase() })}
                    placeholder="HYD (Default)"
                    className="bg-slate-950 border-slate-700 text-xs text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Terminal</label>
                  <Input
                    value={form.terminal}
                    onChange={(e) => setForm({ ...form, terminal: e.target.value })}
                    placeholder="T1"
                    className="bg-slate-950 border-slate-700 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Gate / Work Area</label>
                  <Input
                    value={form.gateArea}
                    onChange={(e) => setForm({ ...form, gateArea: e.target.value })}
                    placeholder="B12 / Tower"
                    className="bg-slate-950 border-slate-700 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Shift</label>
                  <select
                    value={form.shift}
                    onChange={(e) => setForm({ ...form, shift: e.target.value })}
                    className="w-full h-9 rounded-md border border-slate-700 bg-slate-950 px-3 text-xs text-slate-200"
                  >
                    <option value="MORNING">MORNING (06:00 - 14:00)</option>
                    <option value="AFTERNOON">AFTERNOON (14:00 - 22:00)</option>
                    <option value="NIGHT">NIGHT (22:00 - 06:00)</option>
                    <option value="ROTATING">ROTATING</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Initial Password (Optional / auto-generated)</label>
                <Input
                  type="password"
                  value={form.initialPassword}
                  onChange={(e) => setForm({ ...form, initialPassword: e.target.value })}
                  placeholder="Leave blank for secure auto-generated temporary credential"
                  className="bg-slate-950 border-slate-700 text-xs text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowProvisionModal(false)}
                  className="border-slate-700 text-slate-300 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
                >
                  {submitting ? "Provisioning..." : "Provision & Create Account"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Employee Profile Modal (Complete 16-Attribute Display) */}
      {inspectingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-[#0b1320] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white font-mono">
                  Authorized Employee Profile & Credentials
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingRecord(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Profile Header Card */}
            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-lg font-bold text-white font-sans">{inspectingRecord.fullName}</div>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                  <span>{inspectingRecord.jobTitle}</span>
                  <span>·</span>
                  <span className="text-cyan-400">{inspectingRecord.department.replace(/_/g, " ")}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    inspectingRecord.employmentStatus === "ACTIVE"
                      ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                      : "bg-rose-950 border-rose-500/40 text-rose-300"
                  }
                >
                  {inspectingRecord.employmentStatus}
                </Badge>
                <Badge variant="outline" className="border-cyan-500/40 bg-cyan-950/20 text-cyan-300 font-mono">
                  {inspectingRecord.role}
                </Badge>
              </div>
            </div>

            {/* Complete Attributes Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
              {/* 1. Employee ID */}
              <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-2.5 space-y-0.5">
                <div className="text-[10px] uppercase text-slate-400">1. Permanent Employee ID</div>
                <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                  <span>{inspectingRecord.employeeId}</span>
                  <CopyButton value={inspectingRecord.employeeId} />
                </div>
              </div>

              {/* 2. User Account ID */}
              <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-2.5 space-y-0.5">
                <div className="text-[10px] uppercase text-slate-400">2. Linked User Account ID</div>
                <div className="flex items-center gap-1.5 text-slate-300 font-bold truncate">
                  <span className="truncate">{inspectingRecord.userId || "Not Linked"}</span>
                  {inspectingRecord.userId && <CopyButton value={inspectingRecord.userId} />}
                </div>
              </div>

              {/* 3. Work Email */}
              <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-2.5 space-y-0.5">
                <div className="text-[10px] uppercase text-slate-400">3. Work Email</div>
                <div className="flex items-center gap-1.5 text-slate-200 truncate">
                  <span className="truncate">{inspectingRecord.email}</span>
                  <CopyButton value={inspectingRecord.email} />
                </div>
              </div>

              {/* 4. Phone Number */}
              <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-2.5 space-y-0.5">
                <div className="text-[10px] uppercase text-slate-400">4. Contact Phone</div>
                <div className="text-slate-200 font-semibold">{inspectingRecord.phone}</div>
              </div>

              {/* 5. Salary Grade */}
              <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-2.5 space-y-0.5">
                <div className="text-[10px] uppercase text-slate-400">5. Salary Grade & Base</div>
                <div className="text-amber-300 font-bold">{inspectingRecord.jobGrade}</div>
                {inspectingRecord.baseSalary !== undefined && (
                  <div className="text-[10px] text-slate-400">₹{inspectingRecord.baseSalary.toLocaleString("en-IN")}/mo</div>
                )}
              </div>

              {/* 6. Airport Station & Area */}
              <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-2.5 space-y-0.5">
                <div className="text-[10px] uppercase text-slate-400">6. Station Assignment</div>
                <div className="text-emerald-400 font-bold">
                  {inspectingRecord.assignedAirport} · {inspectingRecord.terminal || "T1"}
                </div>
                <div className="text-[10px] text-slate-400">{inspectingRecord.gateArea || "Concourse"}</div>
              </div>

              {/* 7. Shift Schedule */}
              <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-2.5 space-y-0.5">
                <div className="text-[10px] uppercase text-slate-400">7. Shift Schedule</div>
                <div className="text-slate-200 font-bold">{inspectingRecord.shift}</div>
              </div>

              {/* 8. Account Status */}
              <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-2.5 space-y-0.5">
                <div className="text-[10px] uppercase text-slate-400">8. Account Security Status</div>
                <div className="text-cyan-300 font-bold">{inspectingRecord.accountStatus}</div>
              </div>

              {/* 9. Verification Status */}
              <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-2.5 space-y-0.5">
                <div className="text-[10px] uppercase text-slate-400">9. Identity Verification</div>
                <div className="text-emerald-400 font-bold">{inspectingRecord.verificationStatus}</div>
              </div>

              {/* 10. Training Status */}
              <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-2.5 space-y-0.5">
                <div className="text-[10px] uppercase text-slate-400">10. Training Qualifications</div>
                <div className="text-slate-300">{inspectingRecord.trainingStatus || "COMPLETE"}</div>
              </div>

              {/* 11. Staff Type */}
              <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-2.5 space-y-0.5">
                <div className="text-[10px] uppercase text-slate-400">11. Staff Entity Type</div>
                <div className="text-slate-300">{inspectingRecord.isVirtual ? "Virtual Simulation Staff" : "Direct Airport Employee"}</div>
              </div>

              {/* 12. Join Date */}
              <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-2.5 space-y-0.5">
                <div className="text-[10px] uppercase text-slate-400">12. Employment Join Date</div>
                <div className="text-slate-300">{new Date(inspectingRecord.joinDate).toLocaleDateString()}</div>
              </div>

              {/* 13. Last Login */}
              <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-2.5 space-y-0.5">
                <div className="text-[10px] uppercase text-slate-400">13. Last Authenticated Login</div>
                <div className="text-slate-300">
                  {inspectingRecord.lastLogin ? new Date(inspectingRecord.lastLogin).toLocaleString() : "Never"}
                </div>
              </div>

              {/* 14. Last Activity */}
              <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-2.5 space-y-0.5">
                <div className="text-[10px] uppercase text-slate-400">14. Last Activity Timestamp</div>
                <div className="text-slate-300">
                  {inspectingRecord.lastActivity ? new Date(inspectingRecord.lastActivity).toLocaleString() : "Active Now"}
                </div>
              </div>

              {/* 15. Record Created */}
              <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-2.5 space-y-0.5">
                <div className="text-[10px] uppercase text-slate-400">15. Record Created At</div>
                <div className="text-slate-300">{new Date(inspectingRecord.createdAt).toLocaleString()}</div>
              </div>
            </div>

            {/* Permissions Summary */}
            <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3 space-y-1.5">
              <div className="text-[10px] uppercase text-slate-400">Assigned Permissions Matrix</div>
              <div className="flex flex-wrap gap-1">
                {inspectingRecord.permissions.length > 0 ? (
                  inspectingRecord.permissions.map((p) => (
                    <Badge key={p} variant="outline" className="border-slate-800 text-[10px] text-slate-300">
                      {p}
                    </Badge>
                  ))
                ) : (
                  <span className="text-[11px] text-slate-500">Standard role-inherited permissions</span>
                )}
              </div>
            </div>

            {/* Modal Action Footer */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-3">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setResetTarget(inspectingRecord);
                    setInspectingRecord(null);
                  }}
                  className="border-slate-700 bg-slate-900 text-amber-300 text-xs"
                >
                  <KeyRound className="h-3.5 w-3.5 mr-1" /> Reset Credentials
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggleStatus(inspectingRecord)}
                  className={
                    inspectingRecord.employmentStatus === "SUSPENDED"
                      ? "border-emerald-700 text-emerald-300 text-xs"
                      : "border-rose-700 text-rose-300 text-xs"
                  }
                >
                  {inspectingRecord.employmentStatus === "SUSPENDED" ? "Reactivate Employee" : "Suspend Employee"}
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={() => setInspectingRecord(null)}
                className="border-slate-700 text-slate-300 text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Self-Service Change My Password Modal */}
      {showMyPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-[#0b1320] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-bold text-white font-mono">Administrator: Change My Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMyPasswordModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <PasswordChangeCard />

            <div className="flex items-center justify-end border-t border-slate-800 pt-3">
              <Button
                variant="outline"
                onClick={() => setShowMyPasswordModal(false)}
                className="border-slate-700 text-slate-300 text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
