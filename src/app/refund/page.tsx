import Link from "next/link";
import { RefreshCw, ArrowLeft, CreditCard, ShieldCheck, AlertCircle, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Refund Policy · AOCC Airport Operations Control Center",
  description: "Simulated credit ledger refund and ticket cancellation policy for AOCC.",
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col selection:bg-sky-500 selection:text-slate-950">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                AOCC Aviation Authority
                <Badge variant="outline" className="text-sky-300 border-sky-500/30 text-[10px]">
                  REFUND POLICY
                </Badge>
              </div>
              <div className="text-xs text-slate-400 font-mono">Treasury & Credit Settlement</div>
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
            <Coins className="h-3 w-3" />
            Simulated Currency & Ticket Settlement
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Refund & Cancellation Policy
          </h1>
          <p className="text-slate-400 text-sm">
            Effective Date: October 11, 2026 · Document ID: POL-REF-2026-V2
          </p>
        </div>

        {/* Currency & Financial Nature Banner */}
        <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-5 space-y-2 text-sky-200/90 text-xs leading-relaxed">
          <div className="font-bold text-sky-300 text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Simulation Credits & Double-Entry Ledger Principles
          </div>
          <p>
            All financial transactions within AOCC are governed by immutable double-entry ledger bookkeeping.
            All monetary figures represent simulation credits. Real-world monetary debit cards, credit cards, or
            bank accounts are never charged.
          </p>
        </div>

        {/* Policy Sections */}
        <div className="space-y-8 text-sm text-slate-300 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-400" />
              1. Passenger Ticket Cancellations & Automatic Credits
            </h2>
            <p>
              When a simulated passenger booking is cancelled within the Ticketing & Check-in subsystem:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-400">
              <li>Full simulated fare credits are instantly credited back to the passenger&apos;s virtual wallet.</li>
              <li>A corresponding debit ledger entry is recorded against the airline operating account.</li>
              <li>Baggage tag allocations and seat assignments are returned to the open inventory immediately.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-sky-400" />
              2. Flight Cancellations & Weather Disruptions
            </h2>
            <p>
              In the event that an aerodrome emergency or adverse weather (METAR wind shear, zero visibility) triggers a
              flight cancellation:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-400">
              <li>100% of ticket fares and ancillary baggage fees are automatically refunded to affected passengers.</li>
              <li>Runway slot utilization fees charged to the operating carrier are credited back to the airline treasury.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400" />
              3. Non-Convertibility & Disclaimer
            </h2>
            <p>
              Under no circumstances are simulation credits, company treasury reserves (₹1 Trillion), or wallet balances
              redeemable for legal currency, merchandise, or services outside of the educational AOCC simulation environment.
            </p>
          </section>

          <section className="space-y-3 border-t border-slate-800 pt-6">
            <h2 className="text-lg font-bold text-white">4. Disputed Ledger Inquiries</h2>
            <p className="text-slate-400">
              To query simulated transaction reconciliations or audit trails, contact the Financial Control Directorate:
            </p>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-1">
              <div className="text-sky-300 font-bold">AOCC Treasury Audit Bureau</div>
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
