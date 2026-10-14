"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Megaphone,
  Radio,
  Mic,
  MicOff,
  Square,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Search,
  Plus,
  RefreshCw,
  X,
  Send,
  Flame,
  RadioTower,
  Sparkles,
  Loader2,
} from "lucide-react";
import { io, type Socket } from "socket.io-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SoundwaveVisualizer } from "@/components/announcements/soundwave-visualizer";
import { broadcastAudioManager } from "@/lib/services/broadcast-audio-manager";
import type {
  AnnouncementCategory,
  AnnouncementDTO,
  AnnouncementPriority,
  DepartmentType,
  Role,
  TargetAudienceType,
  VoiceBroadcastSessionDTO,
} from "@/lib/domain";
import { RefreshButton } from "@/components/ui/refresh-button";

const CATEGORIES: { label: string; value: AnnouncementCategory }[] = [
  { label: "General Announcement", value: "GENERAL" },
  { label: "Meeting / Briefing", value: "MEETING" },
  { label: "Staff Instructions", value: "STAFF_INSTRUCTIONS" },
  { label: "Operational Update", value: "OPERATIONAL_UPDATE" },
  { label: "Maintenance Notice", value: "MAINTENANCE" },
  { label: "Training & Syllabus", value: "TRAINING" },
  { label: "Simulator Emergency Drill", value: "EMERGENCY_DRILL" },
];

const DEPARTMENTS: { label: string; value: DepartmentType }[] = [
  { label: "Air Traffic Control (ATC)", value: "AIR_TRAFFIC_CONTROL" },
  { label: "Airport Operations", value: "AIRPORT_OPERATIONS" },
  { label: "Ground Operations", value: "GROUND_OPERATIONS" },
  { label: "Airline Operations", value: "AIRLINE_OPERATIONS" },
  { label: "Security & Turnstiles", value: "SECURITY" },
  { label: "Baggage Handling (BHS)", value: "BAGGAGE" },
  { label: "Maintenance & Snags", value: "MAINTENANCE" },
  { label: "Ticketing & Passenger", value: "TICKETING" },
];

export function AnnouncementsSection() {
  const [announcements, setAnnouncements] = useState<AnnouncementDTO[]>([]);
  const [broadcastHistory, setBroadcastHistory] = useState<VoiceBroadcastSessionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Presence stats
  const [onlineStaffCount, setOnlineStaffCount] = useState(12);
  const [audioReadyCount, setAudioReadyCount] = useState(8);

  // New Announcement Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    message: "",
    category: "GENERAL" as AnnouncementCategory,
    priority: "NORMAL" as AnnouncementPriority,
    targetAudienceType: "ALL_STAFF" as TargetAudienceType,
    targetDepartment: "AIRPORT_OPERATIONS" as DepartmentType,
    targetRole: "ATC" as Role,
    expiresInHours: "24",
  });
  const [publishing, setPublishing] = useState(false);

  // Live Voice Broadcast State
  const [activeSession, setActiveSession] = useState<VoiceBroadcastSessionDTO | null>(null);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [broadcastAudienceType, setBroadcastAudienceType] = useState<TargetAudienceType>("ALL_STAFF");
  const [broadcastDepartment, setBroadcastDepartment] = useState<DepartmentType>("AIR_TRAFFIC_CONTROL");
  const [broadcastRole, setBroadcastRole] = useState<Role>("ATC");
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isStartingBroadcast, setIsStartingBroadcast] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initialize Socket.IO connection
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || undefined;
    const socket = io(socketUrl, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      // Register Admin presence
      socket.emit("broadcast:presence:register", {
        userId: "usr-super-admin",
        userName: "Permanent Super Admin",
        role: "SUPER_ADMIN",
        department: "ADMINISTRATION",
        audioEnabled: true,
      });
    });

    socket.on("announcement:new", (newAnn: AnnouncementDTO) => {
      setAnnouncements((prev) => [newAnn, ...prev.filter((a) => a.id !== newAnn.id)]);
    });

    socket.on("announcement:ack:update", ({ announcementId }) => {
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === announcementId ? { ...a, acknowledgementCount: a.acknowledgementCount + 1 } : a)),
      );
    });

    socket.on("broadcast:voice:active-session", (session: VoiceBroadcastSessionDTO) => {
      setActiveSession(session);
    });

    socket.on("broadcast:voice:ended", () => {
      setActiveSession(null);
      setIsTransmitting(false);
      setElapsedSeconds(0);
      broadcastAudioManager.stopCapture();
    });

    return () => {
      broadcastAudioManager.stopCapture();
      socket.disconnect();
    };
  }, []);

  // 2. Fetch announcements & broadcast status
  const fetchData = useCallback(async () => {
    try {
      const [annRes, bcRes, presRes] = await Promise.all([
        fetch("/api/announcements"),
        fetch("/api/broadcast/voice"),
        fetch(`/api/broadcast/presence?audienceType=${broadcastAudienceType}`),
      ]);

      if (annRes.ok) {
        const data = await annRes.json();
        setAnnouncements(data.announcements || []);
      }
      if (bcRes.ok) {
        const data = await bcRes.json();
        setActiveSession(data.activeBroadcast || null);
        setBroadcastHistory(data.history || []);
      }
      if (presRes.ok) {
        const data = await presRes.json();
        setOnlineStaffCount(data.onlineStaffCount || 12);
        setAudioReadyCount(data.audioReadyCount || 8);
      }
    } catch (err) {
      console.error("Failed to load announcements:", err);
      setError("Failed to load announcements. Please refresh.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [broadcastAudienceType]);

  useEffect(() => {
    let isCancelled = false;

    const run = async () => {
      await Promise.resolve();
      if (!isCancelled) {
        await fetchData();
      }
    };
    void run();

    const handleGlobalRefresh = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail || customEvent.detail.activeSection === "announcements") {
        setRefreshing(true);
        void fetchData();
      }
    };
    window.addEventListener("aocc:refresh", handleGlobalRefresh);
    return () => {
      isCancelled = true;
      window.removeEventListener("aocc:refresh", handleGlobalRefresh);
    };
  }, [fetchData]);

  // Elapsed timer when broadcasting
  useEffect(() => {
    if (!isTransmitting) return;

    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isTransmitting]);

  // 3. Handle Create Announcement Submission
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim() || !createForm.message.trim()) {
      setError("Please provide both title and announcement message.");
      return;
    }

    try {
      setPublishing(true);
      setError(null);

      const expHours = Number.parseInt(createForm.expiresInHours, 10) || 24;
      const expiresAt = new Date(Date.now() + expHours * 3600_000).toISOString();

      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createForm.title,
          message: createForm.message,
          category: createForm.category,
          priority: createForm.priority,
          targetAudienceType: createForm.targetAudienceType,
          targetDepartment: createForm.targetAudienceType === "DEPARTMENT" ? createForm.targetDepartment : undefined,
          targetRole: createForm.targetAudienceType === "ROLE" ? createForm.targetRole : undefined,
          expiresAt,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to publish announcement");

      // Broadcast event via Socket.IO
      if (socketRef.current && data.announcement) {
        socketRef.current.emit("announcement:publish", data.announcement);
      }

      setSuccessMessage(`Announcement "${createForm.title}" published to ${createForm.targetAudienceType}!`);
      setShowCreateModal(false);
      setCreateForm({
        title: "",
        message: "",
        category: "GENERAL",
        priority: "NORMAL",
        targetAudienceType: "ALL_STAFF",
        targetDepartment: "AIRPORT_OPERATIONS",
        targetRole: "ATC",
        expiresInHours: "24",
      });
      await fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Publishing failed";
      setError(msg);
    } finally {
      setPublishing(false);
    }
  };

  // 4. Handle Cancel Announcement
  const handleCancelAnnouncement = async (id: string) => {
    try {
      const res = await fetch(`/api/announcements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CANCEL" }),
      });
      if (res.ok) {
        setSuccessMessage("Announcement revoked.");
        await fetchData();
      }
    } catch {
      setError("Failed to revoke announcement.");
    }
  };

  // 5. Handle Start Voice Broadcast
  const handleStartVoiceBroadcast = async () => {
    if (isStartingBroadcast || isTransmitting) return;

    try {
      setIsStartingBroadcast(true);
      setError(null);

      if (!socketRef.current) {
        setError("Signaling connection unavailable. Please wait for server connection.");
        return;
      }

      // Call API to start session
      const res = await fetch("/api/broadcast/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "START",
          targetAudienceType: broadcastAudienceType,
          targetDepartment: broadcastAudienceType === "DEPARTMENT" ? broadcastDepartment : undefined,
          targetRole: broadcastAudienceType === "ROLE" ? broadcastRole : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start broadcast session");

      const session = data.session;
      setActiveSession(session);

      // Acquire microphone
      const captureResult = await broadcastAudioManager.startMicrophoneCapture(
        socketRef.current,
        session.id,
        (node) => {
          setAnalyser(node);
        },
        () => {
          // Hardware track ended callback
          void handleEndBroadcast();
        },
      );

      if (captureResult.ok) {
        setMicPermissionGranted(true);
        setIsTransmitting(true);
        setIsMuted(false);

        // Emit real-time broadcast started event
        socketRef.current.emit("broadcast:voice:start", {
          sessionId: session.id,
          adminName: session.adminName,
          adminRole: session.adminRole,
          targetAudienceType: session.targetAudienceType,
          targetDepartment: session.targetDepartment,
          targetRole: session.targetRole,
        });

        // Play high-frequency chime to announce broadcast
        broadcastAudioManager.playAirportChime("NORMAL");
      } else {
        // Rollback created backend session so it does not linger
        await fetch("/api/broadcast/voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "END", sessionId: session.id }),
        }).catch(() => {});

        setActiveSession(null);
        setError(captureResult.userMessage);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Voice broadcast activation failed";
      setError(msg);
    } finally {
      setIsStartingBroadcast(false);
    }
  };

  // 6. Handle Mute Toggle
  const handleToggleMute = async () => {
    if (!activeSession) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    broadcastAudioManager.setMuteMicrophone(nextMuted);

    if (socketRef.current) {
      socketRef.current.emit("broadcast:voice:mute", {
        sessionId: activeSession.id,
        isMuted: nextMuted,
      });
    }

    await fetch("/api/broadcast/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "MUTE",
        sessionId: activeSession.id,
        isMuted: nextMuted,
      }),
    }).catch(() => {});
  };

  // 7. Handle End Voice Broadcast
  const handleEndBroadcast = async () => {
    if (!activeSession) return;
    const sessionId = activeSession.id;

    broadcastAudioManager.stopCapture();
    setIsTransmitting(false);
    setActiveSession(null);
    setAnalyser(null);

    if (socketRef.current) {
      socketRef.current.emit("broadcast:voice:end", { sessionId });
    }

    try {
      await fetch("/api/broadcast/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "END", sessionId }),
      });
      setSuccessMessage("Voice broadcast session ended successfully.");
      await fetchData();
    } catch {
      //
    }
  };

  // Filtered announcement list
  const filteredAnnouncements = announcements.filter((a) => {
    const matchesSearch =
      search.trim() === "" ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.message.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "ALL" || a.category === categoryFilter;
    const matchesPriority = priorityFilter === "ALL" || a.priority === priorityFilter;
    const matchesStatus = statusFilter === "ALL" || a.status === statusFilter;
    return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
  });

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* Notifications banner */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300 shadow">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs text-emerald-300 shadow">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button type="button" onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <RadioTower className="h-6 w-6 text-cyan-400" />
            Announcement Control Center & Live Voice Broadcast
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Internal simulated public address, staff coordination, operational instructions, and high-fidelity live voice streaming.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Badge variant="outline" className="border-cyan-500/40 bg-cyan-950/20 text-cyan-300 font-mono text-[11px] py-1 px-2.5">
            <Users className="h-3 w-3 mr-1 text-cyan-400" />
            {onlineStaffCount} Online Staff · {audioReadyCount} Speakers Ready
          </Badge>
          <RefreshButton
            onRefresh={fetchData}
            isRefreshing={refreshing}
            size="sm"
            variant="outline"
            label="Refresh"
            tooltip="Refresh announcements, live broadcasts, and connected staff presence"
            showStatusIndicator
          />
          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Post Announcement
          </Button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PROMINENT LIVE VOICE BROADCAST CONTROL CENTER & SOUNDWAVE */}
      {/* ======================================================== */}
      <Card className="border-cyan-500/30 bg-gradient-to-b from-[#091322] via-[#070d17] to-[#040810] shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 h-40 w-40 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />

        <CardHeader className="pb-3 border-b border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`grid h-10 w-10 place-items-center rounded-xl border ${
                  isTransmitting
                    ? isMuted
                      ? "border-amber-500/50 bg-amber-950/40 text-amber-400"
                      : "border-emerald-500/50 bg-emerald-950/40 text-emerald-400 animate-pulse"
                    : "border-cyan-500/30 bg-cyan-950/30 text-cyan-400"
                }`}
              >
                <Radio className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <span>Live Airport Voice Broadcast (PA System)</span>
                  {isTransmitting && (
                    <Badge className="bg-rose-950 border-rose-500/50 text-rose-300 text-[10px] animate-pulse">
                      ● ON AIR ({formatTimer(elapsedSeconds)})
                    </Badge>
                  )}
                  {micPermissionGranted && !isTransmitting && (
                    <Badge className="bg-emerald-950/60 border-emerald-500/40 text-emerald-300 text-[10px]">
                      MIC READY
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 font-mono">
                  Microphone audio stream over secure Socket.IO relay · Real-time oscilloscope soundwave · No persistent raw audio retention
                </CardDescription>
              </div>
            </div>

            {/* Target Audience Selector */}
            {!isTransmitting && (
              <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 p-1.5 rounded-lg text-xs">
                <span className="text-slate-400 font-mono text-[11px] px-1">Audience:</span>
                <select
                  value={broadcastAudienceType}
                  onChange={(e) => setBroadcastAudienceType(e.target.value as TargetAudienceType)}
                  className="bg-slate-950 text-white rounded border border-slate-700 text-xs px-2 py-1 font-sans focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="ALL_STAFF">All Staff (Entire Airport)</option>
                  <option value="DEPARTMENT">By Department</option>
                  <option value="ROLE">By Operational Role</option>
                </select>

                {broadcastAudienceType === "DEPARTMENT" && (
                  <select
                    value={broadcastDepartment}
                    onChange={(e) => setBroadcastDepartment(e.target.value as DepartmentType)}
                    className="bg-slate-950 text-white rounded border border-slate-700 text-xs px-2 py-1 font-sans focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                )}

                {broadcastAudienceType === "ROLE" && (
                  <select
                    value={broadcastRole}
                    onChange={(e) => setBroadcastRole(e.target.value as Role)}
                    className="bg-slate-950 text-white rounded border border-slate-700 text-xs px-2 py-1 font-sans focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="ATC">ATC Controllers</option>
                    <option value="PILOT">Pilots & Flight Crew</option>
                    <option value="GROUND">Ground Operators</option>
                    <option value="SECURITY_OFFICER">Security Officers</option>
                    <option value="TICKETING_AGENT">Ticketing Agents</option>
                  </select>
                )}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          {/* HEARABLE SOUNDWAVE CANVAS */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                Live Frequency Waveform & Peak Spectrum Meter
              </span>
              <span>
                Audience:{" "}
                <span className="text-cyan-300 font-bold">
                  {broadcastAudienceType === "ALL_STAFF"
                    ? "ALL AIRPORT STAFF"
                    : broadcastAudienceType === "DEPARTMENT"
                    ? broadcastDepartment.replace(/_/g, " ")
                    : broadcastRole}
                </span>{" "}
                ({onlineStaffCount} Connected)
              </span>
            </div>

            <SoundwaveVisualizer
              analyser={analyser}
              isActive={isTransmitting}
              isMuted={isMuted}
              theme={isTransmitting ? (isMuted ? "amber" : "cyan") : "cyan"}
              label={
                isTransmitting
                  ? isMuted
                    ? "MIC MUTED (STANDBY)"
                    : "TRANSMITTING TO ACTIVE STAFF WORKSTATIONS"
                  : "READY TO BROADCAST"
              }
              height={110}
            />
          </div>

          {/* Broadcast Control Buttons Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Microphone Status:</span>
              <span className="text-slate-200 font-semibold">
                {isTransmitting ? (isMuted ? "Muted" : "Active & Streaming") : "Idle / Secured"}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {!isTransmitting ? (
                <Button
                  onClick={handleStartVoiceBroadcast}
                  disabled={isStartingBroadcast}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/60 px-5"
                >
                  {isStartingBroadcast ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                      Acquiring Audio...
                    </>
                  ) : (
                    <>
                      <Mic className="mr-2 h-4 w-4 text-white" />
                      Start Voice Broadcast
                    </>
                  )}
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={handleToggleMute}
                    className={`text-xs font-semibold ${
                      isMuted
                        ? "border-amber-500 text-amber-300 bg-amber-950/40 hover:bg-amber-900/50"
                        : "border-slate-700 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {isMuted ? (
                      <>
                        <Mic className="mr-1.5 h-3.5 w-3.5 text-amber-400" />
                        Unmute Microphone
                      </>
                    ) : (
                      <>
                        <MicOff className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                        Mute Microphone
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleEndBroadcast}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-950/60 px-5"
                  >
                    <Square className="mr-2 h-3.5 w-3.5 fill-current" />
                    End Broadcast
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ======================================================== */}
      {/* ANNOUNCEMENT FEED & MANAGEMENT TABLE */}
      {/* ======================================================== */}
      <Card className="border-slate-800 bg-slate-950/70 shadow-lg">
        <CardHeader className="pb-3 border-b border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-cyan-400" />
                Published & Scheduled Announcements ({filteredAnnouncements.length})
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Audited dispatch logs, staff acknowledgements, and priority notices
              </CardDescription>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-44">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search notices..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-slate-900 border-slate-800 text-slate-200"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-8 rounded bg-slate-900 border border-slate-800 text-slate-300 text-xs px-2 focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="h-8 rounded bg-slate-900 border border-slate-800 text-slate-300 text-xs px-2 focus:outline-none"
              >
                <option value="ALL">All Priorities</option>
                <option value="URGENT">Urgent Alert</option>
                <option value="HIGH">High Priority</option>
                <option value="NORMAL">Normal</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 rounded bg-slate-900 border border-slate-800 text-slate-300 text-xs px-2 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PUBLISHED">Published</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y divide-slate-850">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 font-mono">
                Loading announcements...
              </div>
            ) : filteredAnnouncements.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 font-mono">
                No announcements matching filter criteria. Click &quot;Post Announcement&quot; to publish one.
              </div>
            ) : (
              filteredAnnouncements.map((ann) => (
                <div
                  key={ann.id}
                  className={`p-4 transition-colors hover:bg-slate-900/40 ${
                    ann.priority === "URGENT" ? "bg-rose-950/10 border-l-2 border-l-rose-500" : ""
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2">
                        {ann.priority === "URGENT" && (
                          <Badge className="bg-rose-950/80 border-rose-500 text-rose-300 text-[10px] animate-pulse">
                            <Flame className="h-2.5 w-2.5 mr-1" />
                            URGENT
                          </Badge>
                        )}
                        {ann.priority === "HIGH" && (
                          <Badge className="bg-amber-950/80 border-amber-500 text-amber-300 text-[10px]">
                            HIGH
                          </Badge>
                        )}
                        {ann.priority === "NORMAL" && (
                          <Badge variant="outline" className="border-slate-700 text-slate-400 text-[10px]">
                            NORMAL
                          </Badge>
                        )}

                        <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-[10px] font-mono">
                          {ann.category.replace(/_/g, " ")}
                        </Badge>

                        <Badge variant="outline" className="border-slate-800 text-slate-400 text-[10px] font-mono">
                          Target:{" "}
                          {ann.targetAudienceType === "ALL_STAFF"
                            ? "ALL STAFF"
                            : ann.targetAudienceType === "DEPARTMENT"
                            ? ann.targetDepartment?.replace(/_/g, " ")
                            : ann.targetRole}
                        </Badge>

                        <span className="text-[11px] font-mono text-slate-500">
                          ID: {ann.id} &bull; {new Date(ann.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white tracking-tight">{ann.title}</h4>
                      <p className="text-xs text-slate-300 leading-relaxed">{ann.message}</p>

                      <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-slate-500">
                        <span>By {ann.publisherName}</span>
                        <span>&bull;</span>
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {ann.acknowledgementCount} Acknowledged
                        </span>
                        <span>&bull;</span>
                        <span>{ann.readCount} Reads</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      {ann.status === "PUBLISHED" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCancelAnnouncement(ann.id)}
                          className="h-7 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
                        >
                          Revoke
                        </Button>
                      )}
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono ${
                          ann.status === "PUBLISHED"
                            ? "border-emerald-500/40 text-emerald-400 bg-emerald-950/20"
                            : ann.status === "CANCELLED"
                            ? "border-rose-500/40 text-rose-400 bg-rose-950/20"
                            : "border-slate-700 text-slate-400"
                        }`}
                      >
                        {ann.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* ======================================================== */}
      {/* RECENT VOICE BROADCAST SESSIONS HISTORY */}
      {/* ======================================================== */}
      <Card className="border-slate-800 bg-slate-950/60 shadow">
        <CardHeader className="pb-3 border-b border-slate-800">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <Clock className="h-4 w-4 text-cyan-400" />
            Live Voice Broadcast Log History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/60 text-[11px] text-slate-400 uppercase font-mono border-b border-slate-800">
                <tr>
                  <th className="p-3">Session ID</th>
                  <th className="p-3">Initiating Admin</th>
                  <th className="p-3">Target Audience</th>
                  <th className="p-3">Recipients</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 font-sans">
                {broadcastHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500 font-mono">
                      No previous voice broadcast sessions logged.
                    </td>
                  </tr>
                ) : (
                  broadcastHistory.map((bc) => (
                    <tr key={bc.id} className="hover:bg-slate-900/30">
                      <td className="p-3 font-mono text-[11px] text-cyan-400">{bc.id}</td>
                      <td className="p-3 font-medium text-white">{bc.adminName}</td>
                      <td className="p-3 font-mono text-[11px] text-slate-300">
                        {bc.targetAudienceType === "ALL_STAFF"
                          ? "ALL STAFF"
                          : bc.targetDepartment || bc.targetRole || "CUSTOM"}
                      </td>
                      <td className="p-3 font-mono text-emerald-400">{bc.connectedRecipientsCount} Connected</td>
                      <td className="p-3 font-mono text-slate-300">{bc.durationSeconds ? `${bc.durationSeconds}s` : "In Progress"}</td>
                      <td className="p-3 font-mono text-[11px] text-slate-400">
                        {new Date(bc.startedAt).toLocaleString("en-IN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="p-3 text-right">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono ${
                            bc.status === "ENDED"
                              ? "border-slate-700 text-slate-400"
                              : "border-emerald-500 text-emerald-400 animate-pulse"
                          }`}
                        >
                          {bc.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ======================================================== */}
      {/* CREATE ANNOUNCEMENT MODAL */}
      {/* ======================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-xl border border-slate-800 bg-[#070d17] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Compose Staff Announcement</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Title</label>
                <Input
                  required
                  placeholder="e.g. Urgent Runaway Inspection · Tower Procedure Change"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="bg-slate-900 border-slate-800 text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Category</label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value as AnnouncementCategory })}
                    className="w-full rounded-md bg-slate-900 border border-slate-800 p-2 text-xs text-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Priority Level</label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value as AnnouncementPriority })}
                    className="w-full rounded-md bg-slate-900 border border-slate-800 p-2 text-xs text-white"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High Priority</option>
                    <option value="URGENT">Urgent (Chime Alert & Pulse)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Target Audience</label>
                  <select
                    value={createForm.targetAudienceType}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, targetAudienceType: e.target.value as TargetAudienceType })
                    }
                    className="w-full rounded-md bg-slate-900 border border-slate-800 p-2 text-xs text-white"
                  >
                    <option value="ALL_STAFF">All Staff (Entire Airport)</option>
                    <option value="DEPARTMENT">Specific Department</option>
                    <option value="ROLE">Specific Role</option>
                  </select>
                </div>

                {createForm.targetAudienceType === "DEPARTMENT" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Department</label>
                    <select
                      value={createForm.targetDepartment}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, targetDepartment: e.target.value as DepartmentType })
                      }
                      className="w-full rounded-md bg-slate-900 border border-slate-800 p-2 text-xs text-white"
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {createForm.targetAudienceType === "ROLE" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Target Role</label>
                    <select
                      value={createForm.targetRole}
                      onChange={(e) => setCreateForm({ ...createForm, targetRole: e.target.value as Role })}
                      className="w-full rounded-md bg-slate-900 border border-slate-800 p-2 text-xs text-white"
                    >
                      <option value="ATC">ATC Controllers</option>
                      <option value="PILOT">Pilots</option>
                      <option value="GROUND">Ground Operators</option>
                      <option value="SECURITY_OFFICER">Security Officers</option>
                      <option value="TICKETING_AGENT">Ticketing Agents</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Message Content</label>
                <Textarea
                  required
                  rows={4}
                  placeholder="Provide precise details, operational guidelines, or drill procedures..."
                  value={createForm.message}
                  onChange={(e) => setCreateForm({ ...createForm, message: e.target.value })}
                  className="bg-slate-900 border-slate-800 text-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                  className="text-xs border-slate-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={publishing}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs px-4"
                >
                  {publishing ? (
                    <>
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                      Publish Announcement
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
