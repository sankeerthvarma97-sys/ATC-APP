"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { io, type Socket } from "socket.io-client";
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  ClipboardList,
  Cloud,
  Download,
  HardDriveUpload,
  LogOut,
  Mail,
  Plane,
  PlugZap,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  TowerControl,
  Trash2,
  Upload,
  Waves,
  XCircle,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type {
  AiBriefingResponse,
  FlightCommandInput,
  FlightCommandType,
  FlightDTO,
  OperationsSnapshot,
} from "@/lib/domain";
import { socketEvents, type ClientToServerEvents, type ServerToClientEvents } from "@/lib/realtime/events";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatEta, formatZulu, titleCase } from "@/lib/utils";

const FlightMap = dynamic(() => import("@/components/maps/flight-map").then((mod) => mod.FlightMap), {
  ssr: false,
  loading: () => <div className="grid min-h-[420px] place-items-center rounded-lg border border-border bg-muted text-sm text-muted-foreground">Loading live map...</div>,
});

type Tab = "overview" | "traffic" | "radio" | "ai" | "audit" | "integrations";
type RealtimeMode = "connecting" | "live" | "fallback";

interface IntegrationHealth {
  database: { enabled: boolean; configured: boolean };
  ai: { gatewayConfigured: boolean; geminiConfigured: boolean; geminiProjectConfigured: boolean; model: string | null };
  map: { mapboxConfigured: boolean };
  storage: {
    endpointConfigured: boolean;
    credentialsConfigured: boolean;
    bucketConfigured: boolean;
    region: string;
    bucket?: string;
  };
  email: { resendConfigured: boolean; defaultFromConfigured: boolean; defaultFrom?: string };
}

interface StorageObjectRow {
  key: string;
  size: number;
  lastModified: string | null;
  etag: string | null;
}

const commandTypes: FlightCommandType[] = [
  "ASSIGN_RUNWAY",
  "ASSIGN_GATE",
  "HOLD",
  "RELEASE_HOLD",
  "EXPEDITE",
  "CLEAR_TAKEOFF",
  "CLEAR_LANDING",
  "DECLARE_EMERGENCY",
  "RESOLVE_EMERGENCY",
  "DIVERT",
];

const statusVariant: Record<string, "destructive" | "warning" | "info" | "success" | "secondary" | "outline"> = {
  EMERGENCY: "destructive",
  HOLDING: "warning",
  APPROACH: "info",
  AIRBORNE: "success",
  DEPARTING: "success",
  TAXI_OUT: "secondary",
  PUSHBACK: "secondary",
  LANDED: "outline",
  TAXI_IN: "outline",
  AT_GATE: "outline",
  SCHEDULED: "outline",
  BOARDING: "info",
  ARRIVED: "success",
  DELAYED: "warning",
  DIVERTED: "warning",
  CANCELLED: "destructive",
};

function metricLabel(value: number, suffix = "") {
  return `${value.toLocaleString()}${suffix}`;
}

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  detail: string;
  icon: typeof Activity;
  tone?: "critical" | "warning" | "normal";
}) {
  return (
    <Card className={cn(tone === "critical" && "border-red-500/40", tone === "warning" && "border-amber-500/40")}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={cn("h-4 w-4 text-muted-foreground", tone === "critical" && "text-red-300", tone === "warning" && "text-amber-300")} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function ConfigStatus({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail?: string;
}) {
  const Icon = ok ? CheckCircle2 : XCircle;

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
      <div>
        <div className="font-medium">{label}</div>
        {detail && <div className="text-xs text-muted-foreground">{detail}</div>}
      </div>
      <Icon className={cn("h-4 w-4 shrink-0", ok ? "text-emerald-300" : "text-red-300")} />
    </div>
  );
}

function FlightRow({
  flight,
  selected,
  onSelect,
}: {
  flight: FlightDTO;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "grid w-full grid-cols-[1.1fr_0.9fr_0.8fr_0.8fr] items-center gap-3 border-b border-border px-3 py-3 text-left text-sm transition-colors hover:bg-accent",
        selected && "bg-accent",
      )}
    >
      <span>
        <span className="block font-medium">{flight.callsign}</span>
        <span className="block text-xs text-muted-foreground">{flight.airline} · {flight.aircraftType}</span>
      </span>
      <Badge variant={statusVariant[flight.status]}>{titleCase(flight.status)}</Badge>
      <span className="font-mono text-xs text-muted-foreground">{flight.altitudeFt.toLocaleString()} ft</span>
      <span className="text-right font-mono text-xs text-muted-foreground">R{flight.riskScore}</span>
    </button>
  );
}

export function OperationsConsole({ initialSnapshot }: { initialSnapshot: OperationsSnapshot }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [selectedFlightId, setSelectedFlightId] = useState(initialSnapshot.flights[0]?.id ?? "");
  const [commandType, setCommandType] = useState<FlightCommandType>("HOLD");
  const [commandValue, setCommandValue] = useState("");
  const [commandNote, setCommandNote] = useState("");
  const [radioText, setRadioText] = useState("");
  const [aiQuestion, setAiQuestion] = useState("What should the supervisor watch over the next 15 minutes?");
  const [aiFocus, setAiFocus] = useState("airport");
  const [aiBriefing, setAiBriefing] = useState<AiBriefingResponse | null>(null);
  const [integrationHealth, setIntegrationHealth] = useState<IntegrationHealth | null>(null);
  const [integrationMessage, setIntegrationMessage] = useState<string | null>(null);
  const [storagePrefix, setStoragePrefix] = useState("reports/");
  const [storageObjects, setStorageObjects] = useState<StorageObjectRow[]>([]);
  const [storageKey, setStorageKey] = useState("reports/shift-note.json");
  const [storageContentType, setStorageContentType] = useState("application/json");
  const [storageContent, setStorageContent] = useState(
    JSON.stringify(
      {
        source: "AOCC",
        category: "shift-handoff",
        note: "Educational simulation artifact.",
      },
      null,
      2,
    ),
  );
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("AOCC simulation notification");
  const [emailText, setEmailText] = useState("AOCC educational simulation notification from the operations console.");
  const [realtimeMode, setRealtimeMode] = useState<RealtimeMode>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  const selectedFlight = snapshot.flights.find((flight) => flight.id === selectedFlightId) ?? snapshot.flights[0];

  const filteredFlights = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return snapshot.flights.filter((flight) => {
      const matchesStatus = status === "ALL" || flight.status === status;
      const matchesQuery =
        !normalized ||
        flight.callsign.toLowerCase().includes(normalized) ||
        flight.airline.toLowerCase().includes(normalized) ||
        flight.origin.toLowerCase().includes(normalized) ||
        flight.destination.toLowerCase().includes(normalized);
      return matchesStatus && matchesQuery;
    });
  }, [query, snapshot.flights, status]);

  const riskData = useMemo(
    () =>
      snapshot.flights.map((flight) => ({
        callsign: flight.callsign,
        risk: flight.riskScore,
      })),
    [snapshot.flights],
  );

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || undefined;
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(socketUrl, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      timeout: 5000,
    });
    socketRef.current = socket;
    let fallbackTimer: ReturnType<typeof setInterval> | null = null;

    const pollSnapshot = async () => {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const response = await fetch(`${baseUrl}/api/operations/snapshot`, { cache: "no-store" });
      if (response.ok) {
        setSnapshot(await response.json());
      }
    };

    const stopFallbackPolling = () => {
      if (fallbackTimer) {
        clearInterval(fallbackTimer);
        fallbackTimer = null;
      }
    };

    const startFallbackPolling = () => {
      setRealtimeMode("fallback");
      if (!fallbackTimer) {
        void pollSnapshot();
        fallbackTimer = setInterval(() => void pollSnapshot(), 5000);
      }
    };

    socket.on("connect", () => {
      setRealtimeMode("live");
      stopFallbackPolling();
    });
    socket.on("connect_error", startFallbackPolling);
    socket.on("disconnect", startFallbackPolling);
    socket.on(socketEvents.snapshot, setSnapshot);
    socket.on(socketEvents.positions, (flights) => {
      setSnapshot((current) => ({ ...current, flights, generatedAt: new Date().toISOString() }));
    });
    socket.on(socketEvents.metricsUpdate, (metrics) => {
      setSnapshot((current) => ({ ...current, metrics }));
    });
    socket.on(socketEvents.radioMessage, (message) => {
      setSnapshot((current) => ({ ...current, messages: [message, ...current.messages].slice(0, 28) }));
    });
    socket.on(socketEvents.eventCreated, (event) => {
      setSnapshot((current) => ({ ...current, events: [event, ...current.events].slice(0, 32) }));
    });
    socket.on(socketEvents.notification, (notification) => {
      setError(`${notification.title}: ${notification.detail}`);
    });

    return () => {
      stopFallbackPolling();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  async function refreshSnapshot() {
    const response = await fetch("/api/operations/snapshot", { cache: "no-store" });
    if (response.ok) {
      setSnapshot(await response.json());
      setError(null);
    }
  }

  function submitCommand() {
    if (!selectedFlight) return;
    setError(null);
    const payload: FlightCommandInput = {
      flightId: selectedFlight.id,
      type: commandType,
      value: commandValue || undefined,
      note: commandNote || undefined,
    };

    startTransition(async () => {
      const response = await fetch("/api/operations/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: "Command failed." }));
        setError(body.error || "Command failed.");
        return;
      }

      const body = await response.json();
      setSnapshot(body.snapshot);
      socketRef.current?.emit(socketEvents.command, payload);
      setCommandNote("");
    });
  }

  function declareEmergency() {
    if (!selectedFlight) return;
    setCommandType("DECLARE_EMERGENCY");
    setCommandNote("Emergency declared from AOCC console.");
    socketRef.current?.emit(socketEvents.emergencyDeclare, {
      flightId: selectedFlight.id,
      note: "Emergency declared from AOCC console.",
    });
  }

  function submitRadioMessage() {
    if (!selectedFlight || radioText.trim().length < 4) return;
    setError(null);
    const payload = {
      flightId: selectedFlight.id,
      text: radioText.trim(),
      direction: "ATC_TO_PILOT" as const,
      priority: selectedFlight.status === "EMERGENCY" ? ("CRITICAL" as const) : ("INFO" as const),
      channel: selectedFlight.status === "AIRBORNE" ? "Departure" : "Tower",
    };

    startTransition(async () => {
      const response = await fetch("/api/operations/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: "Message failed." }));
        setError(body.error || "Message failed.");
        return;
      }

      const body = await response.json();
      setSnapshot(body.snapshot);
      socketRef.current?.emit(socketEvents.radioMessage, payload);
      setRadioText("");
    });
  }

  function requestAiBriefing() {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/ai/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focus: aiFocus, question: aiQuestion }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: "AI briefing failed." }));
        setError(body.error || "AI briefing failed.");
        return;
      }

      setAiBriefing(await response.json());
    });
  }

  function selectTab(nextTab: Tab) {
    setActiveTab(nextTab);
    if (nextTab === "integrations") {
      void loadIntegrationHealth();
      void refreshStorageObjects();
    }
  }

  async function loadIntegrationHealth() {
    setIntegrationMessage(null);
    const response = await fetch("/api/integrations/health", { cache: "no-store" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "Integration health check failed." }));
      setIntegrationMessage(body.error || "Integration health check failed.");
      return;
    }

    setIntegrationHealth(await response.json());
  }

  async function refreshStorageObjects() {
    setIntegrationMessage(null);
    const params = new URLSearchParams();
    if (storagePrefix.trim()) {
      params.set("prefix", storagePrefix.trim());
    }
    params.set("maxKeys", "25");

    const response = await fetch(`/api/integrations/storage/objects?${params.toString()}`, { cache: "no-store" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "Storage list failed." }));
      setIntegrationMessage(body.error || "Storage list failed.");
      return;
    }

    const body = await response.json();
    setStorageObjects(body.objects ?? []);
  }

  function uploadArtifact() {
    setIntegrationMessage(null);
    setDownloadUrl(null);

    startTransition(async () => {
      const response = await fetch("/api/integrations/storage/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: storageKey,
          contentType: storageContentType,
          content: storageContent,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: "Storage upload failed." }));
        setIntegrationMessage(body.error || "Storage upload failed.");
        return;
      }

      const body = await response.json();
      setIntegrationMessage(`Uploaded ${body.key} (${body.size.toLocaleString()} bytes).`);
      await refreshStorageObjects();
    });
  }

  function createDownloadLink(key = storageKey) {
    setIntegrationMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/integrations/storage/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "download", key, expiresIn: 900 }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: "Download URL failed." }));
        setIntegrationMessage(body.error || "Download URL failed.");
        return;
      }

      const body = await response.json();
      setDownloadUrl(body.url);
      setIntegrationMessage(`Download URL ready for ${body.key}.`);
    });
  }

  function deleteArtifact(key: string) {
    setIntegrationMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/integrations/storage/objects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: "Storage delete failed." }));
        setIntegrationMessage(body.error || "Storage delete failed.");
        return;
      }

      setDownloadUrl(null);
      setIntegrationMessage(`Deleted ${key}.`);
      await refreshStorageObjects();
    });
  }

  function sendNotificationEmail() {
    setIntegrationMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/integrations/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailTo,
          subject: emailSubject,
          text: emailText,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: "Email send failed." }));
        setIntegrationMessage(body.error || "Email send failed.");
        return;
      }

      const body = await response.json();
      setIntegrationMessage(`Email sent${body.id ? ` (${body.id})` : ""}.`);
    });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-border bg-card/60 p-4 lg:block">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
              <TowerControl className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">AOCC</div>
              <div className="text-xs text-muted-foreground">{snapshot.airport.icao} simulation</div>
            </div>
          </div>
          <Separator className="my-4" />
          <nav className="space-y-1">
            {[
              ["overview", Activity, "Overview"],
              ["traffic", Plane, "Traffic"],
              ["radio", Radio, "Radio"],
              ["ai", Bot, "AI Briefing"],
              ["audit", ClipboardList, "Audit"],
              ["integrations", PlugZap, "Integrations"],
            ].map(([key, Icon, label]) => (
              <Button
                key={key as string}
                variant={activeTab === key ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => selectTab(key as Tab)}
              >
                <Icon className="h-4 w-4" />
                {label as string}
              </Button>
            ))}
          </nav>
          <Separator className="my-4" />
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="font-medium text-foreground">{snapshot.currentUser.name}</div>
            <div>{snapshot.currentUser.role} · {snapshot.currentUser.shift ?? "ACTIVE"}</div>
            <div>Updated {formatZulu(snapshot.generatedAt)}Z</div>
          </div>
          <Button className="mt-4 w-full justify-start" variant="outline" onClick={() => signOut({ callbackUrl: "/login" })}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold tracking-normal">Airport Operations Control Center</h1>
                  <Badge variant="outline">Educational Simulation</Badge>
                  <Badge variant={realtimeMode === "live" ? "success" : realtimeMode === "fallback" ? "warning" : "outline"}>
                    {realtimeMode === "live" ? "Realtime live" : realtimeMode === "fallback" ? "Polling fallback" : "Realtime connecting"}
                  </Badge>
                  {snapshot.metrics.emergencyCount > 0 && <Badge variant="destructive">Emergency active</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{snapshot.disclaimer}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={refreshSnapshot}>
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
                <Button variant="destructive" size="sm" onClick={declareEmergency} disabled={!selectedFlight}>
                  <ShieldAlert className="h-4 w-4" />
                  Declare Emergency
                </Button>
              </div>
            </div>
          </header>

          {error && (
            <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
              {error}
            </div>
          )}

          <section className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Active flights" value={metricLabel(snapshot.metrics.activeFlights)} detail={`${snapshot.metrics.airborne} airborne`} icon={Plane} />
            <MetricCard title="Runway utilization" value={metricLabel(snapshot.metrics.runwayUtilization, "%")} detail={`${snapshot.metrics.throughputPerHour}/hr throughput`} icon={Waves} />
            <MetricCard title="Average risk" value={metricLabel(snapshot.metrics.averageRisk)} detail={`${snapshot.metrics.averageDelayMin} min avg delay`} icon={AlertTriangle} tone={snapshot.metrics.averageRisk > 45 ? "warning" : "normal"} />
            <MetricCard title="Emergencies" value={metricLabel(snapshot.metrics.emergencyCount)} detail={`${snapshot.metrics.holdingCount} holding`} icon={ShieldAlert} tone={snapshot.metrics.emergencyCount ? "critical" : "normal"} />
          </section>

          <section className="grid flex-1 gap-4 p-4 pt-0 xl:grid-cols-[minmax(0,1.5fr)_480px]">
            <div className="space-y-4">
              {(activeTab === "overview" || activeTab === "traffic") && (
                <Card>
                  <CardHeader>
                    <CardTitle>Live Movement Map</CardTitle>
                    <CardDescription>Socket.IO position updates with Leaflet rendering.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FlightMap flights={snapshot.flights} />
                  </CardContent>
                </Card>
              )}

              {activeTab === "overview" && (
                <div className="grid gap-4 xl:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Risk By Flight</CardTitle>
                      <CardDescription>Operational risk score generated by the simulation service.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={riskData}>
                          <XAxis dataKey="callsign" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                          <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                          <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                          <Line type="monotone" dataKey="risk" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Resource State</CardTitle>
                      <CardDescription>Runways, gates, crews, and vehicles.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {snapshot.resources.map((resource) => (
                        <div key={resource.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                          <div>
                            <div className="font-medium">{resource.code}</div>
                            <div className="text-xs text-muted-foreground">{resource.label}</div>
                          </div>
                          <Badge variant={resource.status === "AVAILABLE" ? "success" : resource.status === "MAINTENANCE" || resource.status === "CLOSED" ? "destructive" : "warning"}>
                            {titleCase(resource.status)}
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "ai" && (
                <Card>
                  <CardHeader>
                    <CardTitle>AI Operations Briefing</CardTitle>
                    <CardDescription>Vercel AI SDK with Gemini-compatible provider configuration; offline fallback is labeled.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-[220px_1fr]">
                      <Select value={aiFocus} onChange={(event) => setAiFocus(event.target.value)}>
                        <option value="airport">Airport</option>
                        <option value="delays">Delays</option>
                        <option value="emergencies">Emergencies</option>
                        <option value="staffing">Staffing</option>
                        <option value="runways">Runways</option>
                      </Select>
                      <Input value={aiQuestion} onChange={(event) => setAiQuestion(event.target.value)} />
                    </div>
                    <Button onClick={requestAiBriefing} disabled={isPending}>
                      <Bot className="h-4 w-4" />
                      Generate Briefing
                    </Button>
                    {aiBriefing && (
                      <div className="rounded-md border border-border bg-muted/30 p-4">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <Badge variant={aiBriefing.risk === "CRITICAL" ? "destructive" : aiBriefing.risk === "WARNING" ? "warning" : "info"}>
                            {aiBriefing.risk}
                          </Badge>
                          <span className="font-mono text-xs text-muted-foreground">{aiBriefing.model}</span>
                          {aiBriefing.simulated && <Badge variant="outline">Simulated fallback</Badge>}
                        </div>
                        <p className="text-sm leading-6">{aiBriefing.briefing}</p>
                        <ul className="mt-3 space-y-2 text-sm">
                          {aiBriefing.actions.map((action) => (
                            <li key={action} className="flex gap-2">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeTab === "audit" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Operational Events</CardTitle>
                    <CardDescription>Events created by simulation, REST mutations, and Socket.IO commands.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {snapshot.events.map((event) => (
                      <div key={event.id} className="rounded-md border border-border p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-medium">{event.title}</div>
                          <Badge variant={event.severity === "CRITICAL" ? "destructive" : event.severity === "WARNING" ? "warning" : "outline"}>
                            {event.severity}
                          </Badge>
                        </div>
                        <div className="mt-1 text-muted-foreground">{event.detail}</div>
                        <div className="mt-2 font-mono text-xs text-muted-foreground">{formatZulu(event.createdAt)}Z · {event.type}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {activeTab === "integrations" && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <CardTitle>Integration Health</CardTitle>
                          <CardDescription>Safe configuration status for provider-backed APIs.</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={loadIntegrationHealth} disabled={isPending}>
                          <RefreshCw className="h-4 w-4" />
                          Check Health
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {integrationMessage && (
                        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                          {integrationMessage}
                        </div>
                      )}
                      {integrationHealth ? (
                        <div className="grid gap-2 md:grid-cols-2">
                          <ConfigStatus
                            label="Neon Postgres"
                            ok={integrationHealth.database.enabled && integrationHealth.database.configured}
                            detail={integrationHealth.database.enabled ? "Database-backed mode" : "In-memory mode"}
                          />
                          <ConfigStatus
                            label="Mapbox"
                            ok={integrationHealth.map.mapboxConfigured}
                            detail={integrationHealth.map.mapboxConfigured ? "Map tiles configured" : "OpenStreetMap fallback"}
                          />
                          <ConfigStatus
                            label="Gemini"
                            ok={integrationHealth.ai.geminiConfigured || integrationHealth.ai.gatewayConfigured}
                            detail={integrationHealth.ai.model ?? "Deterministic fallback"}
                          />
                          <ConfigStatus
                            label="Object Storage"
                            ok={
                              integrationHealth.storage.endpointConfigured &&
                              integrationHealth.storage.credentialsConfigured &&
                              integrationHealth.storage.bucketConfigured
                            }
                            detail={`${integrationHealth.storage.bucket ?? "No bucket"} · ${integrationHealth.storage.region}`}
                          />
                          <ConfigStatus
                            label="Resend"
                            ok={integrationHealth.email.resendConfigured && integrationHealth.email.defaultFromConfigured}
                            detail={integrationHealth.email.defaultFrom ?? "No sender configured"}
                          />
                          <ConfigStatus
                            label="Gemini Project"
                            ok={integrationHealth.ai.geminiProjectConfigured}
                            detail={integrationHealth.ai.geminiProjectConfigured ? "Project id configured" : "Optional project id missing"}
                          />
                        </div>
                      ) : (
                        <div className="grid min-h-32 place-items-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
                          Run a health check to inspect provider configuration.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Simulation Artifacts</CardTitle>
                      <CardDescription>Upload, list, download, and delete text artifacts in S3-compatible storage.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                        <Input value={storageKey} onChange={(event) => setStorageKey(event.target.value)} placeholder="reports/shift-note.json" />
                        <Input value={storageContentType} onChange={(event) => setStorageContentType(event.target.value)} placeholder="application/json" />
                      </div>
                      <Textarea className="min-h-36 font-mono text-xs" value={storageContent} onChange={(event) => setStorageContent(event.target.value)} />
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={uploadArtifact} disabled={isPending || storageKey.trim().length < 3 || storageContent.trim().length === 0}>
                          <Upload className="h-4 w-4" />
                          Upload Artifact
                        </Button>
                        <Button variant="outline" onClick={() => createDownloadLink()} disabled={isPending || storageKey.trim().length < 3}>
                          <Download className="h-4 w-4" />
                          Create Download Link
                        </Button>
                      </div>
                      {downloadUrl && (
                        <a
                          className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-accent"
                          href={downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Cloud className="h-4 w-4" />
                          Open Signed Download
                        </a>
                      )}
                      <Separator />
                      <div className="grid gap-2 sm:grid-cols-[1fr_150px]">
                        <Input value={storagePrefix} onChange={(event) => setStoragePrefix(event.target.value)} placeholder="reports/" />
                        <Button variant="secondary" onClick={refreshStorageObjects} disabled={isPending}>
                          <HardDriveUpload className="h-4 w-4" />
                          List Objects
                        </Button>
                      </div>
                      <div className="max-h-72 overflow-auto rounded-md border border-border">
                        {storageObjects.length ? (
                          storageObjects.map((item) => (
                            <div key={item.key} className="grid gap-2 border-b border-border px-3 py-3 text-sm last:border-b-0 md:grid-cols-[1fr_120px_160px] md:items-center">
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  className="block max-w-full truncate text-left font-mono text-xs text-primary hover:underline"
                                  onClick={() => {
                                    setStorageKey(item.key);
                                    createDownloadLink(item.key);
                                  }}
                                >
                                  {item.key}
                                </button>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {item.lastModified ? formatZulu(item.lastModified) : "No timestamp"}Z
                                </div>
                              </div>
                              <div className="font-mono text-xs text-muted-foreground">{item.size.toLocaleString()} bytes</div>
                              <div className="flex gap-2 md:justify-end">
                                <Button variant="outline" size="sm" onClick={() => createDownloadLink(item.key)} disabled={isPending}>
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => deleteArtifact(item.key)} disabled={isPending}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="grid min-h-24 place-items-center text-sm text-muted-foreground">
                            No objects found for this prefix.
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Email Notification</CardTitle>
                      <CardDescription>Send a Resend-backed operational simulation email.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <Input value={emailTo} onChange={(event) => setEmailTo(event.target.value)} placeholder="recipient@example.com" type="email" />
                        <Input value={emailSubject} onChange={(event) => setEmailSubject(event.target.value)} />
                      </div>
                      <Textarea value={emailText} onChange={(event) => setEmailText(event.target.value)} />
                      <Button onClick={sendNotificationEmail} disabled={isPending || !emailTo || emailText.trim().length === 0}>
                        <Mail className="h-4 w-4" />
                        Send Notification
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Traffic Board</CardTitle>
                  <CardDescription>Filter flights and select one for commands.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_160px]">
                    <label className="relative">
                      <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-9" placeholder="Search callsign, airline, route" value={query} onChange={(event) => setQuery(event.target.value)} />
                    </label>
                    <Select value={status} onChange={(event) => setStatus(event.target.value)}>
                      <option value="ALL">All status</option>
                      {Array.from(new Set(snapshot.flights.map((flight) => flight.status))).map((item) => (
                        <option key={item} value={item}>{titleCase(item)}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="max-h-[360px] overflow-auto rounded-md border border-border">
                    {filteredFlights.map((flight) => (
                      <FlightRow key={flight.id} flight={flight} selected={flight.id === selectedFlight?.id} onSelect={() => setSelectedFlightId(flight.id)} />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {selectedFlight && (
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle>{selectedFlight.callsign}</CardTitle>
                        <CardDescription>{selectedFlight.origin} → {selectedFlight.destination} · ETA {formatEta(selectedFlight.eta)}</CardDescription>
                      </div>
                      <Badge variant={statusVariant[selectedFlight.status]}>{titleCase(selectedFlight.status)}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-md bg-muted p-2"><div className="text-muted-foreground">Runway</div><div className="font-mono">{selectedFlight.runway ?? "TBD"}</div></div>
                      <div className="rounded-md bg-muted p-2"><div className="text-muted-foreground">Gate</div><div className="font-mono">{selectedFlight.gate ?? "TBD"}</div></div>
                      <div className="rounded-md bg-muted p-2"><div className="text-muted-foreground">Squawk</div><div className="font-mono">{selectedFlight.squawk}</div></div>
                    </div>
                    <div className="text-sm text-muted-foreground">{selectedFlight.phase}</div>
                    <Separator />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Select value={commandType} onChange={(event) => setCommandType(event.target.value as FlightCommandType)}>
                        {commandTypes.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}
                      </Select>
                      <Input placeholder="Value, runway, gate, alternate" value={commandValue} onChange={(event) => setCommandValue(event.target.value)} />
                    </div>
                    <Textarea placeholder="Command note" value={commandNote} onChange={(event) => setCommandNote(event.target.value)} />
                    <Button className="w-full" onClick={submitCommand} disabled={isPending}>
                      <TowerControl className="h-4 w-4" />
                      Send Command
                    </Button>
                  </CardContent>
                </Card>
              )}

              {(activeTab === "radio" || activeTab === "overview") && selectedFlight && (
                <Card>
                  <CardHeader>
                    <CardTitle>Radio Console</CardTitle>
                    <CardDescription>ATC → Pilot and Pilot → ATC messages over REST and Socket.IO.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea placeholder={`Message ${selectedFlight.callsign}`} value={radioText} onChange={(event) => setRadioText(event.target.value)} />
                    <Button className="w-full" variant="secondary" onClick={submitRadioMessage} disabled={isPending || radioText.trim().length < 4}>
                      <Radio className="h-4 w-4" />
                      Transmit
                    </Button>
                    <div className="max-h-64 space-y-2 overflow-auto">
                      {snapshot.messages.map((message) => (
                        <div key={message.id} className="rounded-md border border-border p-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{message.callsign ?? "System"} · {message.channel}</span>
                            <Badge variant={message.priority === "CRITICAL" ? "destructive" : message.priority === "WARNING" ? "warning" : "outline"}>{message.priority}</Badge>
                          </div>
                          <div className="mt-1 text-muted-foreground">{message.text}</div>
                          <div className="mt-1 font-mono text-muted-foreground">{formatZulu(message.createdAt)}Z · {message.direction}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
