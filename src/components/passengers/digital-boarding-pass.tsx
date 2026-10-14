"use client";

import { useState } from "react";
import {
  ArrowRight,
  Barcode,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Plane,
  Printer,
  QrCode,
  Share2,
  ShieldCheck,
  Sparkles,
  Ticket,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BoardingPassDTO } from "@/lib/domain";

export function DigitalBoardingPass({
  pass,
  onSimulateGateScan,
}: {
  pass: BoardingPassDTO;
  onSimulateGateScan?: (pass: BoardingPassDTO) => void;
}) {
  const [copied, setCopied] = useState(false);

  // Generate standardized IATA 2D barcode payload (BCBP standard)
  const bcbpPayload = `M1${pass.passengerName.padEnd(20, " ")}E${pass.pnr.padEnd(7, " ")}${pass.origin || "JFK"}${pass.destination || "MCO"}${pass.flightNumber.padEnd(8, " ")}${pass.seatNumber.padEnd(4, " ")}`;

  const handleCopyBarcode = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(bcbpPayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="space-y-4 font-mono max-w-md mx-auto">
      {/* Wallet Pass Outer Container */}
      <div className="relative rounded-3xl border-2 border-cyan-500/40 bg-gradient-to-b from-[#0e1726] via-[#070b13] to-[#04070d] p-6 shadow-2xl text-slate-100 overflow-hidden">
        {/* Holographic Top Accent Bar */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-cyan-400 via-purple-400 to-amber-400 shadow-[0_0_12px_#38bdf8]" />

        {/* Header: Carrier & Class */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Plane className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-sm text-white uppercase tracking-wider block">
                {pass.airline || "AOCC Airways"}
              </span>
              <span className="text-[10px] text-slate-400">Aviation Authority Pass</span>
            </div>
          </div>
          <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40 text-[10px] font-bold">
            {pass.seatClass || "BUSINESS CLASS"}
          </Badge>
        </div>

        {/* Origin -> Destination Route Banner */}
        <div className="py-5 border-b border-slate-800/80">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-black text-white tracking-tight">
                {pass.origin || "JFK"}
              </div>
              <span className="text-[10px] text-slate-400 uppercase">Departure Station</span>
            </div>

            <div className="flex flex-col items-center px-3">
              <div className="text-[10px] text-cyan-400 font-bold mb-1">
                {pass.flightNumber}
              </div>
              <div className="relative flex items-center w-24">
                <div className="h-0.5 w-full bg-slate-700" />
                <Plane className="h-4 w-4 text-cyan-400 absolute left-1/2 -translate-x-1/2 -rotate-90" />
              </div>
              <span className="text-[9px] text-slate-500 mt-1">Non-Stop Flight</span>
            </div>

            <div className="text-right">
              <div className="text-3xl font-black text-white tracking-tight">
                {pass.destination || "MCO"}
              </div>
              <span className="text-[10px] text-slate-400 uppercase">Arrival Station</span>
            </div>
          </div>
        </div>

        {/* Passenger & Flight Details Grid */}
        <div className="py-4 space-y-3.5 border-b border-slate-800/80 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Passenger Name</span>
            <div className="text-base font-bold text-white tracking-wide">
              {pass.passengerName}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            <div>
              <span className="text-[9px] text-slate-500 block">SEAT</span>
              <span className="text-sm font-bold text-emerald-400">{pass.seatNumber}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block">GATE</span>
              <span className="text-sm font-bold text-amber-300">{pass.gate || "A1"}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block">GROUP</span>
              <span className="text-sm font-bold text-cyan-300">{pass.boardingGroup || "ZONE 1"}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block">BOARDING</span>
              <span className="text-sm font-bold text-white">
                {pass.boardingTime ? pass.boardingTime.slice(11, 16) : "40M PRIOR"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>Booking Ref: <strong className="text-cyan-300">{pass.pnr}</strong></span>
            <span>Ticket: <strong className="text-slate-300">{pass.passNumber}</strong></span>
          </div>
        </div>

        {/* Perforation Cutout Notches */}
        <div className="relative py-4 flex items-center justify-center">
          <div className="absolute -left-9 w-6 h-6 rounded-full bg-[#070b13] border-r-2 border-slate-800" />
          <div className="absolute -right-9 w-6 h-6 rounded-full bg-[#070b13] border-l-2 border-slate-800" />
          <div className="w-full border-t-2 border-dashed border-slate-800/80" />
        </div>

        {/* Bottom Section: QR Code & Security Stamp */}
        <div className="pt-2 flex items-center justify-between gap-4">
          <div className="p-2 rounded-xl bg-white text-black shadow-lg">
            <QrCode className="h-16 w-16" />
          </div>

          <div className="flex-1 space-y-1 text-right">
            <div className="flex items-center justify-end gap-1 text-[11px] text-emerald-400 font-bold">
              <ShieldCheck className="h-4 w-4" /> IATA DOC 9303 VERIFIED
            </div>
            <p className="text-[9px] text-slate-500 leading-tight">
              Present digital barcode at security checkpoint and boarding gate e-gate readers.
            </p>
            <div className="text-[9px] text-slate-400 font-mono pt-1">
              STATUS: <span className="text-emerald-400 font-bold">READY TO BOARD</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Button
          onClick={handleCopyBarcode}
          variant="outline"
          className="flex-1 h-9 text-xs border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300"
        >
          <Copy className="h-3.5 w-3.5 mr-1.5" />
          {copied ? "Copied BCBP Payload!" : "Copy IATA BCBP"}
        </Button>

        <Button
          onClick={handlePrint}
          variant="outline"
          className="h-9 px-3 text-xs border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300"
        >
          <Printer className="h-3.5 w-3.5 mr-1.5" />
          Print Pass
        </Button>

        {onSimulateGateScan && (
          <Button
            onClick={() => onSimulateGateScan(pass)}
            className="h-9 px-3 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
          >
            <Zap className="h-3.5 w-3.5 mr-1" />
            Gate Scan &rarr;
          </Button>
        )}
      </div>
    </div>
  );
}
