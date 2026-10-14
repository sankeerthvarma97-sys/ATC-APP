"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Megaphone,
  Radio,
  Volume2,
  VolumeX,
  CheckCircle2,
  Flame,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { io, type Socket } from "socket.io-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SoundwaveVisualizer } from "@/components/announcements/soundwave-visualizer";
import { broadcastAudioManager } from "@/lib/services/broadcast-audio-manager";
import type { AnnouncementDTO, UserDTO, VoiceBroadcastSessionDTO } from "@/lib/domain";
import { RefreshButton } from "@/components/ui/refresh-button";

export function StaffAnnouncementBoard({
  currentUser,
}: {
  currentUser: UserDTO;
  compact?: boolean;
}) {
  const [announcements, setAnnouncements] = useState<AnnouncementDTO[]>([]);
  const [activeBroadcast, setActiveBroadcast] = useState<VoiceBroadcastSessionDTO | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());

  const socketRef = useRef<Socket | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  // 1. Fetch staff announcements
  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch("/api/announcements");
      if (res.ok) {
        const data = await res.json();
        const list: AnnouncementDTO[] = data.announcements || [];
        setAnnouncements(list);

        // Pre-fill acknowledged state
        const acked = new Set<string>();
        for (const ann of list) {
          if (ann.acknowledgedByUsers?.includes(currentUser.id)) {
            acked.add(ann.id);
          }
        }
        setAcknowledgedIds(acked);
      }
    } catch (err) {
      console.warn("Failed to fetch staff announcements:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    let isCancelled = false;

    const run = async () => {
      await Promise.resolve();
      if (!isCancelled) {
        await fetchAnnouncements();
      }
    };
    void run();

    const handleStaffRefresh = () => {
      setLoading(true);
      void fetchAnnouncements();
    };

    window.addEventListener("aocc:staff:refresh", handleStaffRefresh);
    window.addEventListener("aocc:refresh", handleStaffRefresh);

    return () => {
      isCancelled = true;
      window.removeEventListener("aocc:staff:refresh", handleStaffRefresh);
      window.removeEventListener("aocc:refresh", handleStaffRefresh);
    };
  }, [fetchAnnouncements]);

  // 2. Setup Socket.IO subscription
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || undefined;
    const socket = io(socketUrl, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      // Register staff presence with audience metadata
      socket.emit("broadcast:presence:register", {
        userId: currentUser.id,
        userName: currentUser.name,
        role: currentUser.role,
        department: "AIRPORT_OPERATIONS", // Default staff department
        audioEnabled: broadcastAudioManager.isAudioUnlocked(),
      });
    });

    // Handle incoming text announcements in real time
    socket.on("announcement:new", (newAnn: AnnouncementDTO) => {
      setAnnouncements((prev) => [newAnn, ...prev.filter((a) => a.id !== newAnn.id)]);
      // Play alert chime if audio is enabled
      if (newAnn.priority === "URGENT") {
        broadcastAudioManager.playAirportChime("URGENT");
      } else {
        broadcastAudioManager.playAirportChime("NORMAL");
      }
    });

    // Handle live voice broadcast started
    socket.on("broadcast:voice:started", (session: VoiceBroadcastSessionDTO) => {
      setActiveBroadcast(session);
      broadcastAudioManager.playAirportChime("NORMAL");
      setAnalyser(broadcastAudioManager.getAnalyser());
    });

    // Handle active session info on connect
    socket.on("broadcast:voice:active-session", (session: VoiceBroadcastSessionDTO) => {
      setActiveBroadcast(session);
      setAnalyser(broadcastAudioManager.getAnalyser());
    });

    // Handle incoming audio stream chunks
    socket.on("broadcast:voice:chunk", async (chunkData: { chunk: ArrayBuffer; seq: number }) => {
      if (!isMuted && chunkData?.chunk) {
        await broadcastAudioManager.receiveAudioChunk(chunkData.chunk);
        if (!analyser) {
          setAnalyser(broadcastAudioManager.getAnalyser());
        }
      }
    });

    // Handle voice broadcast ended
    socket.on("broadcast:voice:ended", () => {
      setActiveBroadcast(null);
      broadcastAudioManager.stopPlayback();
    });

    return () => {
      broadcastAudioManager.stopPlayback();
      socket.disconnect();
    };
  }, [currentUser, isMuted, analyser]);

  // Unlock browser audio upon staff click
  const handleUnlockAudio = async () => {
    const unlocked = await broadcastAudioManager.unlockAudio();
    setAudioUnlocked(unlocked);
    if (unlocked) {
      setAnalyser(broadcastAudioManager.getAnalyser());
      await broadcastAudioManager.playAirportChime("NORMAL");
      if (socketRef.current) {
        socketRef.current.emit("broadcast:presence:audio-state", { audioEnabled: true });
      }
    }
  };

  // Handle Mute Toggle
  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    broadcastAudioManager.setVolume(next ? 0 : volume);
  };

  // Handle Volume Change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number.parseFloat(e.target.value);
    setVolume(val);
    if (!isMuted) {
      broadcastAudioManager.setVolume(val);
    }
  };

  // Handle Acknowledge Announcement
  const handleAcknowledge = async (id: string) => {
    try {
      const res = await fetch(`/api/announcements/${id}/acknowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ACKNOWLEDGE" }),
      });
      if (res.ok) {
        setAcknowledgedIds((prev) => new Set([...prev, id]));
        if (socketRef.current) {
          socketRef.current.emit("announcement:acknowledge", {
            announcementId: id,
            userId: currentUser.id,
          });
        }
      }
    } catch (err) {
      console.warn("Failed to acknowledge announcement", err);
    }
  };

  const unreadCount = announcements.filter((a) => !acknowledgedIds.has(a.id)).length;

  return (
    <div className="space-y-4">
      {/* 1. Browser Autoplay Audio Unlock Notice */}
      {!audioUnlocked && (
        <div className="flex items-center justify-between rounded-xl border border-cyan-500/30 bg-cyan-950/40 p-3 text-xs text-cyan-200 shadow-md">
          <div className="flex items-center gap-2.5">
            <Volume2 className="h-4 w-4 text-cyan-400 shrink-0 animate-bounce" />
            <span>
              <strong>Announcement Audio Standby:</strong> Click to enable voice broadcasts and chime alerts on this workstation.
            </span>
          </div>
          <Button
            size="sm"
            onClick={handleUnlockAudio}
            className="h-7 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs px-3"
          >
            Enable Audio Output
          </Button>
        </div>
      )}

      {/* 2. ACTIVE LIVE VOICE BROADCAST BANNER & SOUNDWAVE */}
      {activeBroadcast && (
        <Card className="border-rose-500/50 bg-gradient-to-r from-rose-950/60 via-slate-900/90 to-cyan-950/60 shadow-2xl overflow-hidden animate-in fade-in">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
                  <Radio className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white font-mono uppercase tracking-wider">
                      LIVE VOICE BROADCAST INCOMING
                    </span>
                    <Badge className="bg-rose-950 border-rose-500 text-rose-300 text-[10px] animate-pulse">
                      ● ON AIR
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-300 font-sans mt-0.5">
                    Transmitting: <strong className="text-white">{activeBroadcast.adminName}</strong> ({activeBroadcast.adminRole})
                    &bull; Target:{" "}
                    <span className="text-cyan-300 font-mono">
                      {activeBroadcast.targetAudienceType === "ALL_STAFF"
                        ? "ALL AIRPORT STAFF"
                        : activeBroadcast.targetDepartment || activeBroadcast.targetRole}
                    </span>
                  </div>
                </div>
              </div>

              {/* Volume and Mute Controls */}
              <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className="text-slate-300 hover:text-white"
                  title={isMuted ? "Unmute Broadcast" : "Mute Broadcast"}
                >
                  {isMuted ? <VolumeX className="h-4 w-4 text-amber-400" /> : <Volume2 className="h-4 w-4 text-cyan-400" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="h-1.5 w-20 accent-cyan-400 cursor-pointer"
                />
                <span className="text-[11px] text-slate-400">{Math.round(volume * 100)}%</span>
              </div>
            </div>

            {/* LIVE DANCING SOUNDWAVE VISUALIZER ON STAFF SIDE */}
            <SoundwaveVisualizer
              analyser={analyser}
              isActive={Boolean(activeBroadcast)}
              isMuted={isMuted}
              theme="cyan"
              label="RECEIVING LIVE BROADCAST AUDIO STREAM"
              height={75}
            />
          </CardContent>
        </Card>
      )}

      {/* 3. STAFF ANNOUNCEMENTS LIST */}
      <Card className="border-slate-800 bg-slate-950/80 shadow">
        <CardHeader className="pb-3 border-b border-slate-800 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-cyan-400" />
              Staff Announcements ({announcements.length})
              {unreadCount > 0 && (
                <Badge className="bg-rose-950 border-rose-500/50 text-rose-300 text-[10px] ml-1">
                  {unreadCount} UNREAD
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Operational updates and executive directives addressed to your workstation
            </CardDescription>
          </div>

          <RefreshButton
            onRefresh={fetchAnnouncements}
            isRefreshing={loading}
            size="xs"
            variant="ghost"
            label="Refresh"
            tooltip="Refresh staff announcements feed"
            showStatusIndicator
          />
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y divide-slate-850">
            {announcements.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 font-mono">
                No active announcements for your role or department.
              </div>
            ) : (
              announcements.map((ann) => {
                const isAcked = acknowledgedIds.has(ann.id);
                const isExpanded = expandedId === ann.id;

                return (
                  <div
                    key={ann.id}
                    className={`p-3.5 transition-colors hover:bg-slate-900/40 ${
                      ann.priority === "URGENT"
                        ? "bg-rose-950/10 border-l-2 border-l-rose-500"
                        : !isAcked
                        ? "bg-cyan-950/10 border-l-2 border-l-cyan-500"
                        : ""
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          {ann.priority === "URGENT" && (
                            <Badge className="bg-rose-950 border-rose-500 text-rose-300 text-[9px] animate-pulse">
                              <Flame className="h-2.5 w-2.5 mr-0.5" />
                              URGENT
                            </Badge>
                          )}
                          {ann.priority === "HIGH" && (
                            <Badge className="bg-amber-950 border-amber-500 text-amber-300 text-[9px]">
                              HIGH
                            </Badge>
                          )}
                          <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-[9px] font-mono">
                            {ann.category.replace(/_/g, " ")}
                          </Badge>
                          <span className="text-[10px] font-mono text-slate-500">
                            {new Date(ann.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-white tracking-tight">{ann.title}</h4>
                        <p className={`text-xs text-slate-300 leading-relaxed ${isExpanded ? "" : "line-clamp-2"}`}>
                          {ann.message}
                        </p>

                        <div className="flex items-center gap-2 pt-1 text-[10px] font-mono text-slate-400">
                          <span>From: {ann.publisherName}</span>
                          {ann.message.length > 120 && (
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? null : ann.id)}
                              className="text-cyan-400 hover:underline flex items-center gap-0.5"
                            >
                              {isExpanded ? (
                                <>
                                  Show Less <ChevronUp className="h-3 w-3" />
                                </>
                              ) : (
                                <>
                                  Read Full Notice <ChevronDown className="h-3 w-3" />
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        {isAcked ? (
                          <span className="text-emerald-400 text-xs font-mono font-semibold flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Acknowledged
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleAcknowledge(ann.id)}
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-2.5"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Acknowledge
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
