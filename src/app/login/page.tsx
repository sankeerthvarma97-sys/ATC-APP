"use client";

import { FormEvent, useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSession, signIn } from "next-auth/react";
import {
  Plane,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  ArrowRight,
  Radio,
  Ticket,
  Luggage,
  Key,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const PRESET_ACCOUNTS = [
  {
    role: "SUPER_ADMIN",
    label: "Super Admin",
    email: "admin@gmail.com",
    pass: "Sankeerth@80",
    desc: "Permanent System Owner",
    target: "/admin",
    badge: "Full Access",
    badgeColor: "border-amber-500/50 bg-amber-950/40 text-amber-300",
  },
  {
    role: "ATC",
    label: "ATC Controller",
    email: "atc@aocc.test",
    pass: "AoccDemo!2026",
    desc: "Tower & Radar Control",
    target: "/staff/atc",
    badge: "/staff/atc",
    badgeColor: "border-cyan-500/40 bg-cyan-950/30 text-cyan-300",
  },
  {
    role: "TICKETING_AGENT",
    label: "Ticketing Agent",
    email: "ticket@aocc.test",
    pass: "AoccDemo!2026",
    desc: "Booking & Check-in",
    target: "/staff/ticketing",
    badge: "/staff/ticketing",
    badgeColor: "border-purple-500/40 bg-purple-950/30 text-purple-300",
  },
  {
    role: "GROUND",
    label: "Ground Operator",
    email: "ground@aocc.test",
    pass: "AoccDemo!2026",
    desc: "Apron & Ramp Servicing",
    target: "/staff/ground",
    badge: "/staff/ground",
    badgeColor: "border-amber-500/40 bg-amber-950/30 text-amber-300",
  },
  {
    role: "GATE_AGENT",
    label: "Gate Agent",
    email: "gate@aocc.test",
    pass: "AoccDemo!2026",
    desc: "Boarding Pass Scanner",
    target: "/staff/gate",
    badge: "/staff/gate",
    badgeColor: "border-blue-500/40 bg-blue-950/30 text-blue-300",
  },
  {
    role: "ADMIN",
    label: "Airport Admin",
    email: "admin@aocc.test",
    pass: "AoccDemo!2026",
    desc: "Operations Director",
    target: "/admin",
    badge: "/admin",
    badgeColor: "border-slate-600 bg-slate-800 text-slate-300",
  },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const [email, setEmail] = useState("admin@gmail.com");
  const [password, setPassword] = useState("Sankeerth@80");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function determineTargetRoute(role?: string, emailInput?: string): string {
    if (callbackUrl && (callbackUrl.startsWith("/admin") || callbackUrl.startsWith("/staff"))) {
      return callbackUrl;
    }

    if (emailInput?.toLowerCase() === "admin@gmail.com") {
      return "/admin";
    }

    switch (role) {
      case "SUPER_ADMIN":
      case "ADMIN":
      case "AIRPORT_ADMIN":
      case "OPERATIONS_MANAGER":
        return "/admin";
      case "ATC":
      case "ATC_CONTROLLER":
      case "SENIOR_ATC_CONTROLLER":
      case "SIMULATOR_OPERATOR":
        return "/staff/atc";
      case "TICKETING_AGENT":
        return "/staff/ticketing";
      case "GROUND":
      case "GROUND_OPERATOR":
        return "/staff/ground";
      case "GATE_AGENT":
        return "/staff/gate";
      case "SECURITY_OFFICER":
        return "/staff/security";
      case "AIRLINE_OPERATOR":
      case "FLIGHT_DISPATCHER":
        return "/staff/airline";
      case "BAGGAGE_STAFF":
        return "/staff/baggage";
      case "MAINTENANCE_STAFF":
        return "/staff/maintenance";
      case "PILOT":
        return "/staff/pilot";
      default:
        return "/staff";
    }
  }

  function handlePresetSelect(preset: typeof PRESET_ACCOUNTS[number]) {
    setEmail(preset.email);
    setPassword(preset.pass);
    setError(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await signIn("credentials", {
          email: email.trim().toLowerCase(),
          password,
          redirect: false,
        });

        if (result?.error) {
          setError("Invalid credentials or unauthorized account status.");
          return;
        }

        // Fetch user session to determine authoritative role
        const session = await getSession();
        const role = (session?.user as { role?: string } | undefined)?.role;
        const targetRoute = determineTargetRoute(role, email);

        router.push(targetRoute);
        router.refresh();
      } catch {
        setError("Authentication service unavailable.");
      }
    });
  }

  return (
    <Card className="w-full max-w-xl border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl">
      <CardHeader className="border-b border-slate-800/80 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-600/10 border border-cyan-500/30 text-cyan-400">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-white tracking-tight">
                Airport Operations Control Center
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 font-mono">
                Multi-Portal Aviation Authority Access Gateway
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="border-emerald-500/40 bg-emerald-950/20 text-emerald-400 font-mono text-[10px]">
            ONLINE
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Credentials Form */}
        <form className="space-y-4" onSubmit={submit}>
          <div>
            <label className="text-xs font-mono text-slate-400 block mb-1.5">
              Aviation Identity / Email Address
            </label>
            <Input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="e.g. admin@gmail.com"
              className="bg-slate-950/70 border-slate-700 text-slate-100 font-mono text-sm"
              aria-label="Email"
            />
          </div>

          <div>
            <label className="text-xs font-mono text-slate-400 block mb-1.5">
              Secure Password
            </label>
            <Input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="bg-slate-950/70 border-slate-700 text-slate-100 font-mono text-sm"
              aria-label="Password"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs font-mono text-red-200 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <Button
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-cyan-600/20 transition flex items-center justify-center gap-2"
            type="submit"
            disabled={isPending}
          >
            <ShieldCheck className="h-4 w-4" />
            {isPending ? "Verifying Credentials..." : "Authenticate & Enter Portal"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        {/* Quick-Access Operational Identity Presets */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Quick Role Provisioning Profiles
            </span>
            <span className="text-[10px] font-mono text-slate-500">Auto-routes to authorized portal</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRESET_ACCOUNTS.map((preset) => {
              const isSelected = email.toLowerCase() === preset.email.toLowerCase();
              return (
                <button
                  key={preset.email}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    isSelected
                      ? "border-cyan-500/60 bg-cyan-950/30 ring-1 ring-cyan-500/50"
                      : "border-slate-800 bg-slate-950/40 hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-bold text-xs text-white flex items-center gap-1.5">
                      {preset.role === "SUPER_ADMIN" && <Lock className="h-3 w-3 text-amber-400" />}
                      {preset.label}
                    </span>
                    <Badge variant="outline" className={`text-[9px] font-mono py-0 px-1.5 ${preset.badgeColor}`}>
                      {preset.badge}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono truncate">{preset.email}</div>
                  <div className="text-[10px] text-slate-500 mt-1">{preset.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen grid place-items-center bg-[#070b13] p-4 text-slate-100 selection:bg-cyan-500 selection:text-slate-950">
      <Suspense fallback={<div className="text-slate-400 font-mono text-sm">Initializing portal...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
