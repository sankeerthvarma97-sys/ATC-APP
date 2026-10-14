import React from "react";
import Link from "next/link";
import { ArrowLeft, Heart, Shield, Sparkles } from "lucide-react";
import { AiLoveMessagesCard } from "@/components/ai/ai-love-messages-card";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "AI Love Messages & Appreciation Studio | AOCC Suite",
  description: "Craft personalized romantic notes, caring messages, apologies, and poetry via secure n8n AI workflows.",
};

export default function LoveMessagesPage() {
  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 flex flex-col font-sans antialiased selection:bg-rose-500/30 selection:text-rose-200">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-[#090d16]/80 backdrop-blur-md sticky top-0 z-40 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Return to AOCC
              </Button>
            </Link>
            <div className="h-4 w-px bg-slate-800 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <Heart className="w-4 h-4 fill-rose-500/50" />
              </span>
              <span className="text-sm font-bold text-white tracking-wide">
                AI Love Messages
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-slate-800 hover:border-slate-700 bg-slate-900/60 text-slate-300"
              >
                <Shield className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
                Staff / Admin Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Studio View */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col justify-start">
        <AiLoveMessagesCard />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-6 px-4 text-center text-xs text-slate-400 font-mono">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>AOCC Aviation Operations Suite &bull; AI Text Generation Subsystem</span>
          <span>Powered by n8n Secure Webhooks &bull; Multi-Lingual Architecture</span>
        </div>
      </footer>
    </div>
  );
}
