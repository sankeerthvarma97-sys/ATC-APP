"use client";

import { FormEvent, useState, useEffect, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSession, signIn } from "next-auth/react";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Radio,
  Clock,
  Server,
  KeyRound,
  Mail,
  Info,
  ChevronDown,
  ChevronUp,
  Building2,
  Users,
  Gauge,
  Key,
  Ticket,
  Luggage,
  Wrench,
  Shield,
  Warehouse,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AoccLogo } from "@/components/brand/aocc-logo";
import { Aerospace3dBackground } from "@/components/brand/aerospace-3d-background";

type PortalMode = "ADMIN" | "STAFF";

const STAFF_STATIONS = [
  { role: "Air Traffic Control (ATC)", station: "Tower Radar & TRACON", icon: Radio, route: "/staff/atc", color: "text-sky-400" },
  { role: "Flight Deck & Pilot", station: "PFD HUD & Cockpit Telemetry", icon: Gauge, route: "/staff/pilot", color: "text-cyan-400" },
  { role: "Gate & Turnstile", station: "Boarding Pass Scanner HUD", icon: Key, route: "/staff/gate", color: "text-emerald-400" },
  { role: "Passenger Check-in", station: "Ticketing & Bag Tagging", icon: Ticket, route: "/staff/ticketing", color: "text-purple-400" },
  { role: "Apron & Ramp Ground", station: "Ground Turnaround Dispatch", icon: Warehouse, route: "/staff/ground", color: "text-amber-400" },
  { role: "Baggage System (BHS)", station: "3D CT Screening & Belt Routing", icon: Luggage, route: "/staff/baggage", color: "text-indigo-400" },
  { role: "Security Checkpoint", station: "Pax Screening & Biometrics", icon: Shield, route: "/staff/security", color: "text-rose-400" },
  { role: "MRO Maintenance", station: "Aircraft Health & Tech Logs", icon: Wrench, route: "/staff/maintenance", color: "text-teal-400" },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const initialPortalParam = searchParams.get("portal");

  // Determine active portal mode: ADMIN vs STAFF
  const [portalMode, setPortalMode] = useState<PortalMode>(() => {
    if (initialPortalParam === "staff" || (callbackUrl && callbackUrl.startsWith("/staff"))) {
      return "STAFF";
    }
    return "ADMIN";
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [zuluTime, setZuluTime] = useState("");
  const [showStationGuide, setShowStationGuide] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  // Live Zulu Time ticker for 24/7 operational situational awareness
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setZuluTime(`${now.toISOString().slice(11, 19)}Z`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

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
        return portalMode === "STAFF" ? "/staff" : "/admin";
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Please enter your registered aviation identity and security key.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await signIn("credentials", {
          email: email.trim().toLowerCase(),
          password,
          redirect: false,
        });

        if (result?.error) {
          setError("Access Denied: Invalid credentials or account unauthorized for this portal.");
          return;
        }

        // Authoritative role lookup from database session
        const session = await getSession();
        const role = (session?.user as { role?: string } | undefined)?.role;
        const targetRoute = determineTargetRoute(role, email);

        window.location.href = targetRoute;
      } catch {
        setError("AOCC Authentication service is temporarily unreachable. Check database connection.");
      }
    });
  }

  return (
    <div className="relative z-10 w-full max-w-lg px-4 py-8">
      <Card className="border border-slate-700/60 bg-slate-900/90 backdrop-blur-2xl shadow-2xl shadow-sky-950/50 text-slate-100 overflow-hidden">
        {/* Dynamic portal mode top accent illumination */}
        <div
          className={`h-1.5 w-full transition-colors duration-500 ${
            portalMode === "ADMIN"
              ? "bg-gradient-to-r from-amber-500 via-sky-400 to-indigo-500"
              : "bg-gradient-to-r from-cyan-400 via-emerald-400 to-sky-500"
          }`}
        />

        <CardHeader className="border-b border-slate-800/80 pb-5 pt-6 text-center">
          <div className="flex flex-col items-center">
            {/* Custom 100% Copyright-Free AOCC Emblem Logo */}
            <div className="mb-3 relative group">
              <div className="absolute -inset-2.5 rounded-full bg-sky-500/25 blur-lg group-hover:bg-sky-500/35 transition duration-500" />
              <div className="relative">
                <AoccLogo size={56} />
              </div>
            </div>

            <CardTitle className="text-xl font-bold tracking-tight text-white font-mono">
              AOCC OPERATIONS GATEWAY
            </CardTitle>
            <CardDescription className="text-xs text-slate-400 font-mono mt-1">
              Airport Operations Control Center · Authoritative Access Portal
            </CardDescription>

            {/* Real-Time Telemetry Bar */}
            <div className="flex items-center justify-center gap-3 mt-3.5 pt-2.5 border-t border-slate-800/60 w-full text-[11px] font-mono">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                24/7 ONLINE
              </span>
              <span className="text-slate-700">|</span>
              <span className="flex items-center gap-1 text-sky-400">
                <Clock className="h-3 w-3" />
                {zuluTime || "00:00:00Z"}
              </span>
              <span className="text-slate-700">|</span>
              <span className="flex items-center gap-1 text-slate-400">
                <Server className="h-3 w-3 text-cyan-400" />
                POSTGRESQL AUTH
              </span>
            </div>
          </div>

          {/* Clean, Non-Clumsy Portal Selector Tabs */}
          <div className="mt-5 grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setPortalMode("ADMIN");
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-mono font-semibold transition-all ${
                portalMode === "ADMIN"
                  ? "bg-slate-800 text-sky-300 shadow-md border border-slate-700/80"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
              }`}
            >
              <Building2 className="h-4 w-4 text-amber-400" />
              <span>Authority & Command</span>
              {portalMode === "ADMIN" && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setPortalMode("STAFF");
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-mono font-semibold transition-all ${
                portalMode === "STAFF"
                  ? "bg-slate-800 text-emerald-300 shadow-md border border-slate-700/80"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
              }`}
            >
              <Users className="h-4 w-4 text-emerald-400" />
              <span>Operations Staff</span>
              {portalMode === "STAFF" && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 ml-0.5" />
              )}
            </button>
          </div>

          {/* Portal Context Banner */}
          <div className="mt-3 text-left px-3 py-2 rounded-lg bg-slate-950/50 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {portalMode === "ADMIN" ? (
                <>
                  <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0" />
                  <div className="text-[11px] font-mono leading-tight">
                    <span className="text-white font-semibold">National Command Portal</span>
                    <span className="text-slate-400 block text-[10px]">
                      Super Admin · Airport Directors · Operations Managers
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <Radio className="h-4 w-4 text-emerald-400 shrink-0" />
                  <div className="text-[11px] font-mono leading-tight">
                    <span className="text-white font-semibold">Staff Operations Console</span>
                    <span className="text-slate-400 block text-[10px]">
                      ATC Tower · Cockpit · Gate HUD · Ramp Apron · BHS
                    </span>
                  </div>
                </>
              )}
            </div>
            <Badge
              variant="outline"
              className={`text-[9px] font-mono shrink-0 ${
                portalMode === "ADMIN"
                  ? "border-amber-500/40 text-amber-300 bg-amber-950/20"
                  : "border-emerald-500/40 text-emerald-300 bg-emerald-950/20"
              }`}
            >
              {portalMode === "ADMIN" ? "/admin route" : "/staff console"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-5 space-y-5">
          {/* Authentic Database Login Form */}
          <form className="space-y-4" onSubmit={submit}>
            {/* Identity / Email Field */}
            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-sky-400" />
                  {portalMode === "ADMIN"
                    ? "Authority Identity / Admin Email"
                    : "Staff Crew Identity / Station Email"}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">DB Verified</span>
              </label>
              <div className="relative">
                <Input
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={
                    portalMode === "ADMIN"
                      ? "admin@gmail.com / ops@aocc.test"
                      : "atc@aocc.test / pilot@aocc.test"
                  }
                  className="bg-slate-950/80 border-slate-700/80 focus:border-sky-500 text-slate-100 font-mono text-sm placeholder:text-slate-600 pr-9"
                  aria-label="Email"
                />
                <KeyRound className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>

            {/* Security Key / Password Field */}
            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-sky-400" />
                  Security Key / Password
                </span>
                <button
                  type="button"
                  onClick={() => setShowSupportModal(true)}
                  className="text-[10px] text-sky-400 hover:text-sky-300 transition"
                >
                  Forgot Key?
                </button>
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••••••"
                  className="bg-slate-950/80 border-slate-700/80 focus:border-sky-500 text-slate-100 font-mono text-sm pr-10"
                  aria-label="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 transition"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Session Persistence & Encryption */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-sky-500/30 h-3.5 w-3.5"
                />
                <span className="text-xs text-slate-400 font-mono">Persist Session Token</span>
              </label>
              <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                TLS 1.3 256-Bit
              </span>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-950/30 px-3.5 py-2.5 text-xs font-mono text-red-300 flex items-center gap-2 animate-in fade-in duration-200">
                <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <Button
              className={`w-full text-white font-semibold py-2.5 rounded-xl shadow-lg transition flex items-center justify-center gap-2 font-mono text-xs ${
                portalMode === "ADMIN"
                  ? "bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 shadow-indigo-600/20"
                  : "bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-emerald-600/20"
              }`}
              type="submit"
              disabled={isPending}
            >
              <ShieldCheck className="h-4 w-4" />
              {isPending
                ? "Authenticating with Database..."
                : portalMode === "ADMIN"
                ? "Authenticate & Enter Command Authority"
                : "Authenticate & Enter Staff Operations Console"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Option Down of Login: "Who Is Logging In?" Staff Station Directory */}
          <div className="pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setShowStationGuide(!showStationGuide)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-950/40 hover:bg-slate-800/40 border border-slate-800 text-slate-300 text-xs font-mono transition"
            >
              <span className="flex items-center gap-2">
                <Info className="h-3.5 w-3.5 text-sky-400" />
                <span>Who Is Logging In? Operational Stations Directory</span>
              </span>
              {showStationGuide ? (
                <ChevronUp className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              )}
            </button>

            {/* Expandable Clean Station Guide without any clutter or clumsy elements */}
            {showStationGuide && (
              <div className="mt-2.5 p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2 animate-in fade-in duration-200">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                  AOCC Department Clearances & Assigned Stations:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {STAFF_STATIONS.map((stn) => {
                    const Icon = stn.icon;
                    return (
                      <div
                        key={stn.role}
                        className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center gap-2 text-left"
                      >
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${stn.color}`} />
                        <div className="overflow-hidden leading-tight">
                          <div className="text-[11px] font-bold text-white truncate">
                            {stn.role}
                          </div>
                          <div className="text-[9px] text-slate-400 font-mono truncate">
                            {stn.station}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-[10px] text-slate-500 font-mono pt-1 text-center">
                  Your registered database role automatically routes you to your authorized station.
                </div>
              </div>
            )}

            {/* Quick Portal Switcher at the bottom */}
            <div className="mt-3 flex items-center justify-between text-[11px] font-mono px-1">
              <span className="text-slate-500">
                {portalMode === "ADMIN" ? "Operational Staff member?" : "Airport Authority Director?"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setPortalMode(portalMode === "ADMIN" ? "STAFF" : "ADMIN");
                  setError(null);
                }}
                className="text-sky-400 hover:text-sky-300 font-semibold transition underline underline-offset-2"
              >
                {portalMode === "ADMIN"
                  ? "Switch to Staff Operations Portal →"
                  : "Switch to Authority & Command Portal →"}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Support / Credential Help Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2.5 text-sky-400 mb-3">
              <KeyRound className="h-5 w-5" />
              <h3 className="font-bold text-sm text-white font-mono">Credential Provisioning</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              All staff credentials, security keys, and station clearances are authoritatively verified against the PostgreSQL database.
            </p>
            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 text-xs font-mono text-slate-300 space-y-1 mb-4">
              <div className="text-slate-500 text-[10px] uppercase font-bold">
                AOCC System Administrator:
              </div>
              <div className="text-sky-300 font-semibold">admin@gmail.com</div>
              <div className="text-[10px] text-slate-400">
                Department: Airport Authority & Operational IT
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-mono"
              onClick={() => setShowSupportModal(false)}
            >
              Return to Login
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="relative min-h-screen w-screen flex items-center justify-center overflow-hidden bg-[#050810] selection:bg-sky-500 selection:text-slate-950">
      {/* 24/7 Smooth 3D Aerospace Radar Background Animation */}
      <Aerospace3dBackground />

      <Suspense
        fallback={
          <div className="relative z-10 text-slate-400 font-mono text-sm">
            Initializing AOCC Gateway...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
