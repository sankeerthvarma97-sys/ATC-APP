"use client";

import React, { useState } from "react";
import {
  Search,
  ShieldCheck,
  Building,
  User,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Clock,
  Briefcase,
  X,
  Copy,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import type { SafeEmployeeDirectoryRecord } from "@/server/employees/employee-data";

export function EmployeeIdLookupCard() {
  const [searchId, setSearchId] = useState("");
  const [result, setResult] = useState<SafeEmployeeDirectoryRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchId.trim();
    if (!query) {
      setError("Please enter an Employee ID, name, or email.");
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);
    setResult(null);

    try {
      const res = await fetch(`/api/employees/directory?search=${encodeURIComponent(query)}&limit=1`);
      if (!res.ok) {
        throw new Error("Unable to search directory at this time.");
      }
      const data = await res.json();
      if (data.records && data.records.length > 0) {
        setResult(data.records[0]);
      } else {
        setResult(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-slate-800 bg-[#090e17]/90 shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-300">
            <Search className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base text-white font-mono">
              24/7 Employee Directory & ID Search
            </CardTitle>
            <CardDescription className="text-xs text-slate-400 font-mono">
              Verify airport employee credentials by exact Employee ID (e.g. AOCC-EMP-000001, EMP-1001) or email.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Enter exact Employee ID (e.g. AOCC-EMP-000001) or email..."
              className="pl-9 h-9 text-xs bg-slate-950 border-slate-700 text-slate-200 font-mono"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="h-9 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-semibold"
          >
            {loading ? "Searching..." : "Lookup ID"}
          </Button>
        </form>

        {error && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-3 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {searched && !loading && !result && !error && (
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-center text-xs text-slate-400 font-mono">
            No employee found matching <span className="text-cyan-300 font-bold">&quot;{searchId}&quot;</span>. Verify the ID
            format and try again.
          </div>
        )}

        {result && (
          <div className="rounded-xl border border-slate-700 bg-slate-950/90 p-4 space-y-3 font-mono text-xs animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <div className="text-sm font-bold text-white font-sans">{result.fullName}</div>
                <div className="text-[11px] text-slate-400">
                  {result.jobTitle} · <span className="text-cyan-400">{result.department.replace(/_/g, " ")}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge
                  className={
                    result.employmentStatus === "ACTIVE"
                      ? "bg-emerald-950 border-emerald-500/40 text-emerald-300 text-[10px]"
                      : "bg-rose-950 border-rose-500/40 text-rose-300 text-[10px]"
                  }
                >
                  {result.employmentStatus}
                </Badge>
                <Badge variant="outline" className="border-slate-700 text-slate-300 text-[10px]">
                  {result.verificationStatus}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
              <div className="rounded-lg bg-slate-900/60 border border-slate-800/80 p-2">
                <div className="text-[10px] uppercase text-slate-400">Permanent ID</div>
                <div className="flex items-center gap-1.5 text-cyan-300 font-bold mt-0.5">
                  <span>{result.employeeId}</span>
                  <CopyButton value={result.employeeId} />
                </div>
              </div>

              <div className="rounded-lg bg-slate-900/60 border border-slate-800/80 p-2">
                <div className="text-[10px] uppercase text-slate-400">Assigned Station</div>
                <div className="text-emerald-400 font-bold mt-0.5">
                  {result.assignedAirport} · {result.terminal || "T1"}
                </div>
              </div>

              <div className="rounded-lg bg-slate-900/60 border border-slate-800/80 p-2">
                <div className="text-[10px] uppercase text-slate-400">Shift Schedule</div>
                <div className="text-slate-200 font-bold mt-0.5">{result.shift}</div>
              </div>

              <div className="rounded-lg bg-slate-900/60 border border-slate-800/80 p-2">
                <div className="text-[10px] uppercase text-slate-400">Role Grade</div>
                <div className="text-amber-300 font-bold mt-0.5">{result.jobGrade}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
