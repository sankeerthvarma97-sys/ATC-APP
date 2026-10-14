import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Building,
  CheckCircle2,
  Cpu,
  DollarSign,
  Heart,
  Luggage,
  Navigation,
  Plane,
  Radio,
  Shield,
  Sparkles,
  Ticket,
  Users,
  Wind,
} from "lucide-react";
import { AoccUnifiedView } from "@/components/operations/aocc-unified-view";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { getOperationsSnapshot } from "@/lib/repositories/operations-repository";
import { AoccLogo } from "@/components/brand/aocc-logo";
import { Aerospace3dBackground } from "@/components/brand/aerospace-3d-background";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const user = await getAuthenticatedUser();
  const params = await searchParams;

  // If authenticated user requests unified view
  if (user && params?.view === "unified") {
    const snapshot = await getOperationsSnapshot(user);
    return <AoccUnifiedView user={user} initialSnapshot={snapshot} />;
  }

  // If authenticated and no specific landing view requested, route directly to portal
  if (user && params?.view !== "landing") {
    if (
      user.role === "SUPER_ADMIN" ||
      user.role === "ADMIN" ||
      user.role === "AIRPORT_ADMIN" ||
      user.role === "OPERATIONS_MANAGER"
    ) {
      redirect("/admin");
    }
    redirect("/staff");
  }

  // If unauthenticated and requested direct login
  if (!user && params?.view === "login") {
    redirect("/login");
  }

  // If unauthenticated or explicit landing view: Render the Master AOCC Operations Showcase
  return (
    <div className="relative min-h-screen bg-[#070b13] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden">
      {/* Dynamic 3D Aerospace Background Layer */}
      <Aerospace3dBackground />

      {/* Top Application Bar */}
      <header className="relative z-30 border-b border-slate-800/80 bg-[#090d16]/80 backdrop-blur-md px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AoccLogo size="md" withText={true} />
            <Badge
              variant="outline"
              className="hidden md:inline-flex border-cyan-500/40 text-cyan-400 bg-cyan-950/30 text-[10px] font-mono tracking-wider"
            >
              24/7 AIRPORT SIMULATOR v2.0
            </Badge>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/love-messages">
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-rose-500/40 text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 h-8"
              >
                <Heart className="w-3.5 h-3.5 mr-1.5 fill-rose-500/40 text-rose-400" />
                AI Love Studio
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="sm"
                className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-semibold h-8 shadow-md shadow-cyan-950/50"
              >
                <Shield className="w-3.5 h-3.5 mr-1.5" />
                Operations Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Showcase Section */}
      <main className="relative z-20 max-w-7xl mx-auto px-4 sm:px-8 py-10 sm:py-16 space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <Badge
            variant="outline"
            className="border-sky-500/40 text-sky-400 bg-sky-950/30 px-3 py-1 text-xs font-mono"
          >
            AOCC FULL FEATURE RECOVERY &amp; AVIATION SUITE
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Airport Operations Control Center &amp; ATC Simulator
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            A real-time educational aerodrome command platform featuring 4D radar traffic simulation,
            10,000 virtual staff dispatch, primary flight display HUDs, atomic payroll treasury,
            and contextual AI love notes via secure n8n integration.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href="/login?portal=admin">
              <Button
                size="lg"
                className="bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white font-semibold shadow-lg shadow-sky-950/50 text-sm h-11 px-6"
              >
                <Shield className="w-4 h-4 mr-2 text-cyan-200" />
                Launch Authority Center
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/login?portal=staff">
              <Button
                variant="outline"
                size="lg"
                className="border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-sm h-11 px-6"
              >
                <Radio className="w-4 h-4 mr-2 text-sky-400" />
                Staff Workstations (ATC/Pilot/Ramp)
              </Button>
            </Link>
            <Link href="/love-messages">
              <Button
                variant="outline"
                size="lg"
                className="border-rose-500/30 bg-rose-950/20 hover:bg-rose-950/40 text-rose-300 text-sm h-11 px-6"
              >
                <Sparkles className="w-4 h-4 mr-2 text-rose-400" />
                AI Love Messages
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Modules Grid - 100% Feature Exposure */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1: 4D Radar & ATC */}
          <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md hover:border-sky-500/50 transition-all duration-300 group">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  <Radio className="w-5 h-5" />
                </div>
                <Badge variant="outline" className="text-[10px] border-sky-500/30 text-sky-300">
                  ADS-B 4D TRAFFIC
                </Badge>
              </div>
              <CardTitle className="text-base text-slate-100 group-hover:text-sky-300 transition-colors mt-2">
                ATC Tower &amp; Radar Sim
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Vectoring, altitude clearance, runway assignment, and collision avoidance alerts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login?portal=staff">
                <span className="text-xs text-sky-400 flex items-center gap-1 group-hover:underline">
                  Enter ATC Console <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </CardContent>
          </Card>

          {/* Card 2: Flight Deck Avionics HUD */}
          <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md hover:border-cyan-500/50 transition-all duration-300 group">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Plane className="w-5 h-5" />
                </div>
                <Badge variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-300">
                  PFD AVIONICS HUD
                </Badge>
              </div>
              <CardTitle className="text-base text-slate-100 group-hover:text-cyan-300 transition-colors mt-2">
                Cockpit Telemetry &amp; HUD
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Artificial horizon, speed/altitude tapes, ILS glideslope localizer, and heading compass.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/staff/pilot">
                <span className="text-xs text-cyan-400 flex items-center gap-1 group-hover:underline">
                  Launch Cockpit HUD <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </CardContent>
          </Card>

          {/* Card 3: AI Love Messages */}
          <Card className="border-rose-500/30 bg-slate-900/70 backdrop-blur-md hover:border-rose-500/60 transition-all duration-300 group shadow-lg shadow-rose-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <Heart className="w-5 h-5 fill-rose-500/40 text-rose-400" />
                </div>
                <Badge className="bg-rose-950/80 text-rose-300 border-rose-500/40 text-[10px]">
                  n8n AI Engine
                </Badge>
              </div>
              <CardTitle className="text-base text-slate-100 group-hover:text-rose-300 transition-colors mt-2">
                AI Love Messages Studio
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Generate context-tailored romantic notes, apologies, and poetry across 8 languages via secure n8n webhooks.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/love-messages">
                <span className="text-xs text-rose-400 flex items-center gap-1 group-hover:underline">
                  Open Studio <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </CardContent>
          </Card>

          {/* Card 4: Passenger Portal & Gate Passes */}
          <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md hover:border-emerald-500/50 transition-all duration-300 group">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Ticket className="w-5 h-5" />
                </div>
                <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-300">
                  AIRSIDE PASS
                </Badge>
              </div>
              <CardTitle className="text-base text-slate-100 group-hover:text-emerald-300 transition-colors mt-2">
                Passenger Check-in &amp; Wallet
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Instant digital boarding passes, baggage tags, seat selection, and turnstile verification.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/passenger/wallet">
                <span className="text-xs text-emerald-400 flex items-center gap-1 group-hover:underline">
                  Passenger Portal <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </CardContent>
          </Card>

          {/* Card 5: Accounts, Payroll & Treasury */}
          <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md hover:border-amber-500/50 transition-all duration-300 group">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <DollarSign className="w-5 h-5" />
                </div>
                <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-300">
                  ₹1,000B TREASURY
                </Badge>
              </div>
              <CardTitle className="text-base text-slate-100 group-hover:text-amber-300 transition-colors mt-2">
                Payroll &amp; Treasury Engine
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Atomic salary disbursements, simulated bank accounts, durable ledger, and 10,000 employee payroll.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login?portal=admin">
                <span className="text-xs text-amber-400 flex items-center gap-1 group-hover:underline">
                  Access Finance Section <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </CardContent>
          </Card>

          {/* Card 6: 24/7 Virtual Staff Roster */}
          <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md hover:border-purple-500/50 transition-all duration-300 group">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <Users className="w-5 h-5" />
                </div>
                <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-300">
                  10,000 EMPLOYEES
                </Badge>
              </div>
              <CardTitle className="text-base text-slate-100 group-hover:text-purple-300 transition-colors mt-2">
                Virtual Workforce Simulation
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Autonomous 24/7 staff shift dispatching across ATC, Security, Ground, Baggage, and Tech Maintenance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login?portal=admin">
                <span className="text-xs text-purple-400 flex items-center gap-1 group-hover:underline">
                  View Staff Roster <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Airport Hub Operational Status Bar */}
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400 font-semibold">INDIAN AERODROME NETWORK:</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="text-cyan-400 font-bold">VOHS</span> (HYD): CAVOK 28°C
            </span>
            <span className="text-slate-700">&bull;</span>
            <span className="flex items-center gap-1.5">
              <span className="text-cyan-400 font-bold">VABB</span> (BOM): 09012KT 31°C
            </span>
            <span className="text-slate-700">&bull;</span>
            <span className="flex items-center gap-1.5">
              <span className="text-cyan-400 font-bold">VIDP</span> (DEL): 27008KT 26°C
            </span>
            <span className="text-slate-700">&bull;</span>
            <span className="flex items-center gap-1.5">
              <span className="text-cyan-400 font-bold">VOBL</span> (BLR): 12010KT 24°C
            </span>
          </div>
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px]">
            ALL HUBS NORMAL
          </Badge>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 border-t border-slate-800/80 py-8 px-4 text-center text-xs text-slate-400 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AoccLogo size="sm" />
            <span>AOCC &bull; Airport Operations Control Center Simulator</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-slate-200 transition">Terms</Link>
            <Link href="/privacy" className="hover:text-slate-200 transition">Privacy</Link>
            <Link href="/refund" className="hover:text-slate-200 transition">Refund</Link>
            <Link href="/cookies" className="hover:text-slate-200 transition">Cookies</Link>
            <Link href="/love-messages" className="text-rose-400 hover:text-rose-300 transition">AI Love Messages</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
