import Link from "next/link";
import { Shield, ArrowLeft, Lock, Database, Eye, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Privacy Policy · AOCC Airport Operations Control Center",
  description: "Privacy and simulated data protection policy for the AOCC airport operations platform.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col selection:bg-sky-500 selection:text-slate-950">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                AOCC Aviation Authority
                <Badge variant="outline" className="text-sky-300 border-sky-500/30 text-[10px]">
                  EDUCATIONAL SIMULATION
                </Badge>
              </div>
              <div className="text-xs text-slate-400 font-mono">Legal & Compliance Directorate</div>
            </div>
          </div>

          <Link href="/login">
            <Button variant="outline" size="sm" className="border-slate-700 bg-slate-900 text-slate-300 hover:text-white text-xs">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Return to Gateway
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 space-y-10">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950/60 border border-sky-500/30 text-sky-300 text-xs font-mono">
            <Lock className="h-3 w-3" />
            ICAO & DPDP Act Aligned Privacy Framework
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Privacy & Simulated Telemetry Policy
          </h1>
          <p className="text-slate-400 text-sm">
            Effective Date: October 11, 2026 · Version 3.4 · AOCC Master Regulatory Doc ID: POL-PRIV-2026-01
          </p>
        </div>

        {/* Educational Disclaimer Banner */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-5 space-y-2 text-amber-200/90 text-xs leading-relaxed">
          <div className="font-bold text-amber-300 text-sm flex items-center gap-2">
            Educational Full-Stack Simulation Notice
          </div>
          <p>
            The Airport Operations Control Center (AOCC) application is an educational, interactive full-stack simulation
            system designed for flight control training, algorithmic gate management, and high-concurrency workforce exercises.
            No live production air traffic control clearances, real passenger identities, or legal financial assets are compromised.
          </p>
        </div>

        {/* Policy Sections */}
        <div className="space-y-8 text-sm text-slate-300 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Database className="h-4 w-4 text-sky-400" />
              1. Information Collected & Ingested
            </h2>
            <p>
              In operating our dual-mode in-memory simulation and Neon Lakebase PostgreSQL database, AOCC ingests and processes:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-400">
              <li><strong className="text-slate-200">Personnel & Staff Credentials:</strong> Canonical Employee IDs (e.g. <code>AOCC-EMP-000001</code>), cryptographic salted password hashes (Bcrypt, cost factor 12), assigned airport roles, and 24/7 operational shift assignments.</li>
              <li><strong className="text-slate-200">ADS-B Flight Telemetry:</strong> Simulated 4D historical radar trajectory points (latitude, longitude, altitude in feet, groundspeed in knots, heading, vertical rate, and transponder Squawk codes).</li>
              <li><strong className="text-slate-200">Radio & Audio Telemetry:</strong> Web Audio API synthesized VHF transmission logs, roger beeps, squelch noise signatures, and pilot-controller readback acknowledgments.</li>
              <li><strong className="text-slate-200">Audit & Security Trails:</strong> Actor IDs, IP addresses, immutable timestamped event logs (such as credential resets, gate allocations, and simulated salary disbursements).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-400" />
              2. Zero Credential Leakage & Encryption Standards
            </h2>
            <p>
              AOCC enforces strict security controls protecting stored credentials and state:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-400">
              <li>Passwords are never transmitted or stored in plaintext. Passwords are irreversibly hashed using standard Bcrypt before writing to the database.</li>
              <li>Temporary passwords generated during administrative credential resets are held strictly in ephemeral memory and invalidated immediately upon first-login mandatory password change.</li>
              <li>All database connections communicate over Transport Layer Security (TLS 1.3) with full SSL verification against AWS US-East-2 endpoints.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Eye className="h-4 w-4 text-purple-400" />
              3. Telemetry Retention & Automated Pruning
            </h2>
            <p>
              Simulated radar telemetry recordings, synthetic blackbox FDR state, and ASDE-X ground surface movements
              are maintained in time-series caches and automatically aggregated into hourly statistics. Operators can
              purge or replay historical trajectories in the 4D Radar Replay subsystem at any time.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-400" />
              4. User Rights & Data Subject Access (GDPR & DPDP Act)
            </h2>
            <p>
              Registered simulated operators hold the right to inspect their system account profile, request credential
              revocation, or trigger a full database branch reset via the Neon Lakebase Branching Manager.
            </p>
          </section>

          <section className="space-y-3 border-t border-slate-800 pt-6">
            <h2 className="text-lg font-bold text-white">5. Authority Contact & Compliance Officer</h2>
            <p className="text-slate-400">
              For security disclosures or audit inquiries, contact the AOCC Super Administrator:
            </p>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-1">
              <div className="text-sky-300 font-bold">AOCC IT & Security Directorate</div>
              <div className="text-slate-400">Email: admin@gmail.com</div>
              <div className="text-slate-500">Rajiv Gandhi International Airport (HYD / VOHS) Command Complex</div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-8 text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>&copy; 2026 AOCC · Airport Operations Control Center Simulation. All rights reserved.</div>
          <div className="flex items-center gap-4 text-slate-400">
            <Link href="/privacy" className="hover:text-sky-400 underline">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-sky-400 underline">Terms of Service</Link>
            <Link href="/refund" className="hover:text-sky-400 underline">Refund Policy</Link>
            <Link href="/cookies" className="hover:text-sky-400 underline">Cookie Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
