"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Shield,
  Clock,
  MapPin,
  CheckCircle2,
  Briefcase,
  Activity,
  X,
  Award,
  Radio,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { EmployeeDTO } from "@/lib/domain";

const DEPARTMENTS = [
  { value: "ALL", label: "All Departments" },
  { value: "AIR_TRAFFIC_CONTROL", label: "Air Traffic Control" },
  { value: "AIRPORT_OPERATIONS", label: "Airport Operations" },
  { value: "GROUND_OPERATIONS", label: "Ground Operations" },
  { value: "AIRLINE_OPERATIONS", label: "Airline Operations" },
  { value: "TICKETING", label: "Ticketing & Check-in" },
  { value: "PASSENGER_SERVICES", label: "Passenger Services" },
  { value: "SECURITY", label: "Security & Screening" },
  { value: "BAGGAGE", label: "Baggage Handling" },
  { value: "MAINTENANCE", label: "Maintenance & Engineering" },
  { value: "EMERGENCY_RESPONSE", label: "Emergency Response" },
  { value: "ADMINISTRATION", label: "Administration" },
];

const SHIFTS = [
  { value: "ALL", label: "All Shifts" },
  { value: "SHIFT_A", label: "Shift A (00:00 - 08:00)" },
  { value: "SHIFT_B", label: "Shift B (08:00 - 16:00)" },
  { value: "SHIFT_C", label: "Shift C (16:00 - 00:00)" },
];

export function VirtualStaffSection() {
  const [staffList, setStaffList] = useState<EmployeeDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("ALL");
  const [shift, setShift] = useState("ALL");

  // Selected staff for modal
  const [selectedStaff, setSelectedStaff] = useState<EmployeeDTO | null>(null);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });

      if (department !== "ALL") params.append("department", department);
      if (shift !== "ALL") params.append("shift", shift);
      if (search.trim()) params.append("search", search.trim());

      const res = await fetch(`/api/simulation/staff?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setStaffList(data.staff || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.warn("Failed to load virtual staff", err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, department, shift, search]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchStaff();
  };

  const getDepartmentColor = (dept: string) => {
    switch (dept) {
      case "AIR_TRAFFIC_CONTROL":
        return "bg-sky-500/20 text-sky-300 border-sky-500/30";
      case "AIRPORT_OPERATIONS":
        return "bg-indigo-500/20 text-indigo-300 border-indigo-500/30";
      case "GROUND_OPERATIONS":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "SECURITY":
        return "bg-rose-500/20 text-rose-300 border-rose-500/30";
      case "TICKETING":
      case "PASSENGER_SERVICES":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "MAINTENANCE":
        return "bg-orange-500/20 text-orange-300 border-orange-500/30";
      default:
        return "bg-slate-500/20 text-slate-300 border-slate-500/30";
    }
  };

  const getShiftBadge = (s: string) => {
    if (s === "SHIFT_A") {
      return <Badge variant="outline" className="text-sky-400 border-sky-800 bg-sky-950/40">Shift A (Night)</Badge>;
    }
    if (s === "SHIFT_B") {
      return <Badge variant="outline" className="text-emerald-400 border-emerald-800 bg-emerald-950/40">Shift B (Day)</Badge>;
    }
    return <Badge variant="outline" className="text-purple-400 border-purple-800 bg-purple-950/40">Shift C (Eve)</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-400" />
            2,000 Virtual Staff Operations Roster
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Server-side paged directory of simulated airport personnel handling air traffic control, ground turnarounds, ticketing, security, and baggage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-950 px-4 py-2 rounded-lg border border-slate-800 text-center">
            <div className="text-xs text-slate-400 font-mono">TOTAL IN POOL</div>
            <div className="text-lg font-bold text-blue-400 font-mono">
              {total.toLocaleString()} Staff
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, employee ID (VS-0001), or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          {/* Department Filter */}
          <select
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            {DEPARTMENTS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>

          {/* Shift Filter */}
          <select
            value={shift}
            onChange={(e) => {
              setShift(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            {SHIFTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Page Size */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="20">20 / page</option>
            <option value="50">50 / page</option>
            <option value="100">100 / page</option>
          </select>
        </div>
      </div>

      {/* Staff Directory Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Name & Title</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Shift & Station</th>
                <th className="py-3 px-4">Current Task / Activity</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-center">Score</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mb-2" />
                    <div>Loading virtual staff pool...</div>
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No virtual staff found matching criteria.
                  </td>
                </tr>
              ) : (
                staffList.map((member) => (
                  <tr
                    key={member.id}
                    className="hover:bg-slate-800/40 transition group cursor-pointer"
                    onClick={() => setSelectedStaff(member)}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-sky-400">
                      <div className="flex items-center gap-1.5">
                        <span>{member.employeeId}</span>
                        <span className="text-[10px] text-blue-500 border border-blue-500/30 px-1 rounded bg-blue-500/10">
                          VIRTUAL
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">
                        {member.fullName}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Briefcase className="h-3 w-3 text-slate-500" />
                        {member.jobTitle}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${getDepartmentColor(
                          member.department
                        )}`}
                      >
                        {member.department.replace(/_/g, " ")}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        {getShiftBadge(member.shift)}
                        <span className="text-[10px] text-slate-500 font-mono">
                          {member.airportCode} · {member.terminal || "T1"}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Activity className="h-3 w-3 text-emerald-400 shrink-0" />
                        <span className="line-clamp-1">
                          {member.currentTask || "Monitoring active flight feeds"}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Tasks completed: {member.tasksCompleted || 0}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-slate-400 font-mono text-[11px]">
                        <MapPin className="h-3 w-3 text-slate-500 shrink-0" />
                        <span>{member.currentLocation || "Operations Room"}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="font-mono font-bold text-emerald-400">
                        {member.performanceScore ?? 95}%
                      </div>
                      <div className="w-12 bg-slate-800 h-1.5 rounded-full mx-auto mt-1 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{ width: `${member.performanceScore ?? 95}%` }}
                        />
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStaff(member);
                        }}
                        className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Bar */}
        <div className="bg-slate-950/80 border-t border-slate-800 px-4 py-3 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing{" "}
            <span className="text-white font-mono">
              {total === 0 ? 0 : (page - 1) * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="text-white font-mono">
              {Math.min(page * pageSize, total)}
            </span>{" "}
            of <span className="text-white font-mono">{total}</span> virtual staff
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="px-2 font-mono">
              Page {page} of {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Staff Detail Modal */}
      {selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedStaff(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-lg">
                {selectedStaff.fullName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">
                    {selectedStaff.fullName}
                  </h3>
                  <Badge variant="outline" className="text-blue-400 border-blue-700 bg-blue-950/40">
                    VIRTUAL SIMULATED
                  </Badge>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  ID: <span className="font-mono text-sky-400">{selectedStaff.employeeId}</span> · {selectedStaff.jobTitle}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/60 p-4 rounded-lg border border-slate-800 font-sans">
              <div>
                <div className="text-slate-500 font-mono">DEPARTMENT</div>
                <div className="text-slate-200 font-medium mt-0.5">
                  {selectedStaff.department.replace(/_/g, " ")}
                </div>
              </div>
              <div>
                <div className="text-slate-500 font-mono">ASSIGNED SHIFT</div>
                <div className="text-slate-200 font-medium mt-0.5">
                  {selectedStaff.shift}
                </div>
              </div>
              <div>
                <div className="text-slate-500 font-mono">PHYSICAL STATION</div>
                <div className="text-slate-200 font-medium mt-0.5">
                  {selectedStaff.airportCode} ({selectedStaff.terminal || "Terminal 1"})
                </div>
              </div>
              <div>
                <div className="text-slate-500 font-mono">STATUS</div>
                <div className="text-emerald-400 font-medium mt-0.5 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> ACTIVE ON DUTY
                </div>
              </div>
              <div>
                <div className="text-slate-500 font-mono">PERFORMANCE SCORE</div>
                <div className="text-emerald-400 font-bold font-mono mt-0.5">
                  {selectedStaff.performanceScore ?? 95} / 100
                </div>
              </div>
              <div>
                <div className="text-slate-500 font-mono">TASKS COMPLETED</div>
                <div className="text-purple-300 font-bold font-mono mt-0.5">
                  {selectedStaff.tasksCompleted || 0} tasks
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs text-slate-400 font-semibold">Current Live Activity:</div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{selectedStaff.currentTask || "Active shift monitoring"}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs text-slate-400 font-semibold">Location Zone:</div>
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 flex items-center gap-2 font-mono">
                <MapPin className="h-3.5 w-3.5 text-slate-500" />
                <span>{selectedStaff.currentLocation || "Operations Control Station"}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedStaff(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
