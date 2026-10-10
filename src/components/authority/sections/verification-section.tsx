"use client";

import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileCheck,
  Plane,
  QrCode,
  RotateCcw,
  Search,
  ShieldCheck,
  Ticket as TicketIcon,
  User,
  XCircle,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { TicketVerificationResult, BookingDTO } from "@/lib/domain";

export function VerificationSection({
  onNavigateTo,
}: {
  onNavigateTo?: (section: string, params?: Record<string, string>) => void;
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [gatewayActionLoading, setGatewayActionLoading] = useState(false);
  const [gatewayMessage, setGatewayMessage] = useState<string | null>(null);

  const copyText = (text: string, key: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const [result, setResult] = useState<{
    status: TicketVerificationResult;
    message: string;
    ticket?: {
      ticketNumber: string;
      pnr: string;
      flightNumber: string;
      passengerName: string;
      seatNumber: string;
      origin: string;
      destination: string;
      departureTime: string;
      status: string;
      gate?: string;
      qrCode?: string;
      bookingStatus?: string;
      paymentStatus?: string;
      boardingStatus?: string;
    };
    booking?: BookingDTO;
    flight?: {
      id: string;
      callsign: string;
      origin: string;
      destination: string;
      status: string;
      departureTime: string;
      gate?: string;
    };
  } | null>(null);

  const [scanHistory, setScanHistory] = useState<
    Array<{
      pnr: string;
      name: string;
      flight: string;
      status: TicketVerificationResult;
      time: string;
    }>
  >([]);

  const ticketData = result?.ticket || (result?.booking ? {
    ticketNumber: result.booking.ticketNumber || "",
    pnr: result.booking.pnr,
    flightNumber: result.booking.flightNumber,
    passengerName: result.booking.passengerName,
    seatNumber: result.booking.seatNumber,
    origin: result.booking.origin || "",
    destination: result.booking.destination || "",
    departureTime: result.booking.departureTime || "",
    status: result.booking.bookingStatus,
    gate: result.booking.gate || "",
    qrCode: result.booking.qrCode || "",
    bookingStatus: result.booking.bookingStatus,
    paymentStatus: result.booking.paymentStatus,
    boardingStatus: result.booking.boardingStatus,
  } : undefined);

  const handleVerify = async (codeToVerify?: string) => {
    const targetCode = (codeToVerify || query).trim().toUpperCase();
    if (!targetCode) return;

    setLoading(true);
    setGatewayMessage(null);
    try {
      const res = await fetch("/api/tickets/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pnr: targetCode }),
      });

      const data = await res.json();
      setResult(data);

      const activeTicket = data.ticket || (data.booking ? {
        pnr: data.booking.pnr,
        passengerName: data.booking.passengerName,
        flightNumber: data.booking.flightNumber,
      } : undefined);

      if (activeTicket) {
        setScanHistory((prev) => [
          {
            pnr: activeTicket.pnr,
            name: activeTicket.passengerName,
            flight: activeTicket.flightNumber,
            status: data.status,
            time: new Date().toLocaleTimeString(),
          },
          ...prev.slice(0, 9),
        ]);
      }
    } catch {
      setResult({
        status: "INVALID",
        message: "Failed to connect to verification authority service.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGatewayClearance = async (pnrToBoard: string, flightId: string, gate: string) => {
    if (!flightId || !gate) {
      setGatewayMessage("Boarding requires a flight with an assigned gate. Open the flight's gate manifest.");
      return;
    }

    setGatewayActionLoading(true);
    setGatewayMessage(null);
    try {
      const res = await fetch("/api/boarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pnr: pnrToBoard, flightId, gate }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setGatewayMessage("Passenger cleared and successfully boarded at gate!");
        setResult((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            status: "ALREADY_USED",
            message: "Passenger successfully boarded at gateway.",
            ticket: prev.ticket
              ? { ...prev.ticket, boardingStatus: "BOARDED" }
              : undefined,
          };
        });
      } else {
        setGatewayMessage(data.error || "Gateway clearance failed. Please check boarding state.");
      }
    } catch {
      setGatewayMessage("Gateway server error. Failed to clear passenger.");
    } finally {
      setGatewayActionLoading(false);
    }
  };

  const getStatusBadge = (status: TicketVerificationResult) => {
    switch (status) {
      case "VALID":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-base py-1 px-3">VALID TICKET</Badge>;
      case "ALREADY_USED":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-base py-1 px-3">ALREADY BOARDED / USED</Badge>;
      case "CANCELLED":
        return <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/40 text-base py-1 px-3">BOOKING CANCELLED</Badge>;
      case "EXPIRED":
        return <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/40 text-base py-1 px-3">TICKET EXPIRED</Badge>;
      case "PAYMENT_FAILED":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/40 text-base py-1 px-3">PAYMENT FAILED</Badge>;
      case "FLIGHT_CANCELLED":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/40 text-base py-1 px-3">FLIGHT CANCELLED</Badge>;
      default:
        return <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/40 text-base py-1 px-3">INVALID RECORD</Badge>;
    }
  };

  const getStatusIcon = (status: TicketVerificationResult) => {
    switch (status) {
      case "VALID":
        return <CheckCircle2 className="h-12 w-12 text-emerald-400" />;
      case "ALREADY_USED":
        return <Clock className="h-12 w-12 text-amber-400" />;
      case "CANCELLED":
      case "PAYMENT_FAILED":
      case "FLIGHT_CANCELLED":
        return <XCircle className="h-12 w-12 text-rose-400" />;
      default:
        return <AlertTriangle className="h-12 w-12 text-rose-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <QrCode className="h-6 w-6 text-primary" />
            Ticket Verification & Gate Validation
          </h2>
          <p className="text-sm text-muted-foreground">
            Authoritative ticket validity checker for security check, customs, and boarding gate entry.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10">
            <ShieldCheck className="h-3.5 w-3.5 mr-1" />
            Security Subsystem Active
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Verification Scanner Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/60 bg-card/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                Scan or Enter PNR / Ticket Number
              </CardTitle>
              <CardDescription>
                Simulates gate scanner barcode reading or manual agent verification.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleVerify();
                }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <div className="relative flex-1">
                  <TicketIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="e.g. SKY-98234 or TKT-..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value.toUpperCase())}
                    className="pl-9 text-base tracking-wider font-mono uppercase bg-background"
                  />
                </div>
                <Button type="submit" disabled={loading || !query.trim()} className="px-6 font-semibold">
                  {loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  ) : (
                    <FileCheck className="h-4 w-4 mr-2" />
                  )}
                  Verify Ticket
                </Button>
              </form>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Quick Test PNRs:</span>
                {["SKY-DEMO1", "OEA-8421", "SKY-7700"].map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => {
                      setQuery(sample);
                      handleVerify(sample);
                    }}
                    className="px-2 py-0.5 rounded bg-muted hover:bg-muted/80 font-mono text-foreground border border-border"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Gateway Action Feedback */}
          {gatewayMessage && (
            <div className="p-3 rounded-lg border border-primary/30 bg-primary/10 text-primary text-sm flex items-center justify-between">
              <span>{gatewayMessage}</span>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setGatewayMessage(null)}>
                Dismiss
              </Button>
            </div>
          )}

          {/* Verification Result Card */}
          {result && (
            <Card
              className={`border-2 transition-all ${
                result.status === "VALID"
                  ? "border-emerald-500/60 bg-emerald-950/10 shadow-lg shadow-emerald-950/20"
                  : "border-rose-500/60 bg-rose-950/10 shadow-lg shadow-rose-950/20"
              }`}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border/50">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(result.status)}
                    <div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(result.status)}
                        <span className="font-mono text-sm text-muted-foreground flex items-center gap-1.5">
                          {ticketData?.pnr || query}
                          <button
                            type="button"
                            onClick={() => copyText(ticketData?.pnr || query, "pnr-hdr")}
                            title="Copy PNR"
                            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {copiedKey === "pnr-hdr" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </span>
                      </div>
                      <p className="text-sm font-medium mt-1 text-foreground">
                        {result.message}
                      </p>
                    </div>
                  </div>

                  {ticketData && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        disabled={gatewayActionLoading || ticketData.boardingStatus === "BOARDED"}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-sm"
                        onClick={() => handleGatewayClearance(
                          ticketData.pnr,
                          result.booking?.flightId || result.flight?.id || "",
                          (result.booking?.gate || ticketData.gate || "").replace(/^GATE\s*/i, "").trim(),
                        )}
                      >
                        {gatewayActionLoading ? (
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent mr-1.5" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        {ticketData.boardingStatus === "BOARDED" ? "Boarded at Gate" : "⚡ Gateway Clearance (Board Now)"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (onNavigateTo) {
                            onNavigateTo("checkin", { pnr: ticketData.pnr });
                          }
                        }}
                      >
                        Check-in Desk
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          if (onNavigateTo) {
                            onNavigateTo("boarding", {
                              flight: ticketData.flightNumber ?? "UNKNOWN",
                              pnr: ticketData.pnr ?? "",
                            });
                          }
                        }}
                      >
                        Boarding Gate
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>

                {ticketData && (
                  <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground block">PASSENGER NAME</span>
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-primary" />
                        {ticketData.passengerName}
                        <button
                          type="button"
                          onClick={() => copyText(ticketData.passengerName ?? "", "name")}
                          title="Copy Passenger Name"
                          className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {copiedKey === "name" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground block">FLIGHT NUMBER</span>
                      <span className="font-mono font-semibold text-foreground flex items-center gap-1.5">
                        <Plane className="h-3.5 w-3.5 text-primary" />
                        {ticketData.flightNumber}
                        <button
                          type="button"
                          onClick={() => copyText(ticketData.flightNumber ?? "", "flight")}
                          title="Copy Flight Number"
                          className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {copiedKey === "flight" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground block">SEAT</span>
                      <span className="font-mono font-bold text-base text-primary flex items-center gap-1.5">
                        {ticketData.seatNumber}
                        <button
                          type="button"
                          onClick={() => copyText(ticketData.seatNumber, "seat")}
                          title="Copy Seat"
                          className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {copiedKey === "seat" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground block">ROUTING</span>
                      <span className="font-semibold text-foreground">
                        {ticketData.origin} &rarr; {ticketData.destination}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground block">SCHEDULED DEP</span>
                      <span className="font-mono text-muted-foreground">
                        {ticketData.departureTime || "Unavailable"}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground block">GATE</span>
                      <span className="font-mono font-semibold text-foreground flex items-center gap-1.5">
                        {ticketData.gate || "Unassigned"}
                        <button
                          type="button"
                          onClick={() => copyText(ticketData.gate || "", "gate")}
                          title="Copy Gate"
                          className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {copiedKey === "gate" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground block">PAYMENT STATUS</span>
                      <Badge variant="outline" className="text-xs">
                        {ticketData.paymentStatus || "Unavailable"}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground block">BOARDING STATE</span>
                      <Badge
                        variant={ticketData.boardingStatus === "BOARDED" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {ticketData.boardingStatus || "PENDING"}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Scan Log & Verification Rules Sidebar */}
        <div className="space-y-6">
          <Card className="border-border/60 bg-card/80 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Recent Verification Log
                </span>
                {scanHistory.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setScanHistory([])}
                    className="h-7 px-2 text-xs"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {scanHistory.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No scan events recorded this session.
                </div>
              ) : (
                <div className="space-y-2">
                  {scanHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded border border-border/50 bg-background/50 hover:bg-muted/50 text-xs space-y-1 transition-colors"
                    >
                      <div className="flex items-center justify-between font-mono font-medium">
                        <span
                          className="cursor-pointer hover:underline text-primary"
                          onClick={() => {
                            setQuery(item.pnr);
                            handleVerify(item.pnr);
                          }}
                        >
                          {item.pnr}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => copyText(item.pnr, `log-${idx}`)}
                            title="Copy PNR"
                            className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {copiedKey === `log-${idx}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          </button>
                          <Badge
                            variant={item.status === "VALID" ? "default" : "destructive"}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {item.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>{item.name} ({item.flight})</span>
                        <span>{item.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/80 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                Validation Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>&bull; <strong>VALID:</strong> PNR exists, payment completed, flight scheduled, not yet boarded.</p>
              <p>&bull; <strong>ALREADY_USED:</strong> Passenger has already scanned boarding pass at gate.</p>
              <p>&bull; <strong>CANCELLED:</strong> Passenger or airline cancelled this reservation.</p>
              <p>&bull; <strong>FLIGHT_CANCELLED:</strong> Operations cancelled the underlying flight.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
