import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { PassengerWalletCard } from "@/components/passengers/passenger-wallet-card";
import Link from "next/link";
import { ArrowLeft, Plane, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function PassengerWalletPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?callbackUrl=/passenger/wallet");
  }

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 p-4 md:p-8 font-sans">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Link href="/staff/ticketing">
              <Button size="sm" variant="outline" className="border-slate-800 bg-slate-900 text-xs">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Flight Booking Desk
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Plane className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-bold text-slate-200">AOCC Passenger Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Logged in as: <strong className="text-slate-200">{user.email}</strong></span>
          </div>
        </div>

        {/* Main Wallet Card */}
        <PassengerWalletCard />
      </div>
    </div>
  );
}
