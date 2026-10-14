import Link from "next/link";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-2xl border border-red-500/20 bg-slate-900/80 backdrop-blur-xl p-8 shadow-2xl text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 mb-6">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <div className="inline-block rounded-full bg-red-500/10 px-3 py-1 text-xs font-mono font-semibold uppercase tracking-wider text-red-400 border border-red-500/20 mb-3">
          403 Forbidden
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
          Access Restricted
        </h1>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          Your current operational role does not possess the requisite security clearance to access this sector of the Airport Authority Control Center.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/staff"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2.5 text-sm font-medium text-white transition shadow-lg shadow-cyan-600/20"
          >
            <ArrowLeft className="h-4 w-4" />
            Staff Portal
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition"
          >
            <Home className="h-4 w-4" />
            Control Center
          </Link>
        </div>
      </div>
    </div>
  );
}
