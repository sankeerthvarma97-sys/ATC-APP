import Link from "next/link";
import { Cookie, ArrowLeft, Lock, Shield, Sliders, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Cookie Policy · AOCC Airport Operations Control Center",
  description: "Explanation of session cookies and telemetry storage used in AOCC.",
};

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col selection:bg-sky-500 selection:text-slate-950">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Cookie className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                AOCC Aviation Authority
                <Badge variant="outline" className="text-sky-300 border-sky-500/30 text-[10px]">
                  COOKIE POLICY
                </Badge>
              </div>
              <div className="text-xs text-slate-400 font-mono">Telemetry & Local Storage Transparency</div>
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
            <Cookie className="h-3 w-3" />
            Cookies & Browser Storage Disclosures
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Cookie & Storage Policy
          </h1>
          <p className="text-slate-400 text-sm">
            Effective Date: October 11, 2026 · Document ID: POL-COOK-2026-V2
          </p>
        </div>

        {/* Intro */}
        <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <p>
            The Airport Operations Control Center (AOCC) utilizes standard HTTP cookies and browser LocalStorage
            mechanisms to deliver secure session handling, manage role clearances, and retain custom radar and audio
            settings across 24/7 operating shifts.
          </p>
        </div>

        {/* Categories Table */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sliders className="h-4 w-4 text-sky-400" />
            Summary of Cookies & Storage Keys Used
          </h2>

          <div className="rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-mono uppercase">
                <tr>
                  <th className="p-3">Identifier / Key</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Purpose</th>
                  <th className="p-3">Lifespan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                <tr>
                  <td className="p-3 font-mono text-sky-300 font-semibold">next-auth.session-token</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-bold">
                      Strictly Necessary
                    </span>
                  </td>
                  <td className="p-3 text-slate-400">Authenticates active user session, RBAC role, and employee ID clearances.</td>
                  <td className="p-3 font-mono">Session / 30 Days</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-sky-300 font-semibold">next-auth.csrf-token</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-bold">
                      Strictly Necessary
                    </span>
                  </td>
                  <td className="p-3 text-slate-400">Protects against Cross-Site Request Forgery during flight dispatch submissions.</td>
                  <td className="p-3 font-mono">Session</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-sky-300 font-semibold">aocc_cookie_consent_preferences_v1</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-bold">
                      Strictly Necessary
                    </span>
                  </td>
                  <td className="p-3 text-slate-400">Remembers your chosen consent preferences so the modal does not re-appear.</td>
                  <td className="p-3 font-mono">Persistent (1 Year)</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-sky-300 font-semibold">aocc_radar_viewport_v1</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-500/30 font-bold">
                      Functional
                    </span>
                  </td>
                  <td className="p-3 text-slate-400">Remembers selected airport (HYD, BOM, DEL) and zoom level on ASDE-X ground radar.</td>
                  <td className="p-3 font-mono">Persistent</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-sky-300 font-semibold">aocc_vhf_audio_settings_v1</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-500/30 font-bold">
                      Functional
                    </span>
                  </td>
                  <td className="p-3 text-slate-400">Stores VHF squelch audio volume, roger beep pitch, and mute state.</td>
                  <td className="p-3 font-mono">Persistent</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Managing Consent */}
        <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Lock className="h-4 w-4 text-emerald-400" />
            Managing Your Preferences & Withdrawing Consent
          </h2>
          <p>
            You can clear or reconfigure your consent preferences at any time by clearing your browser storage or
            visiting this page. Disabling strictly necessary cookies in your browser settings will prevent login and
            session persistence.
          </p>
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
