"use client";

import { useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  Info,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface OperationalNotification {
  id: string;
  severity: "CRITICAL" | "WARNING" | "INFO" | "SUCCESS";
  title: string;
  detail: string;
  timestamp: string;
  read: boolean;
}

const INITIAL_NOTIFICATIONS: OperationalNotification[] = [
  {
    id: "notif-1",
    severity: "CRITICAL",
    title: "Runway 22R Surface Friction Alert",
    detail: "Braking action reported POOR by AAL245. ARFF Foam Truck 1 deployed for inspection.",
    timestamp: "2 mins ago",
    read: false,
  },
  {
    id: "notif-2",
    severity: "WARNING",
    title: "Gate A12 Turnaround Delay",
    detail: "Flight DAL88 pushback tug delayed by 8 minutes due to catering reload.",
    timestamp: "14 mins ago",
    read: false,
  },
  {
    id: "notif-3",
    severity: "INFO",
    title: "ATIS Information Charlie Broadcast",
    detail: "Surface wind 040/14kt, visibility 10SM, QNH 1014 hPa active.",
    timestamp: "28 mins ago",
    read: true,
  },
  {
    id: "notif-4",
    severity: "SUCCESS",
    title: "Ticket Verification Cleared",
    detail: "Passenger PNR ABC123 boarding pass verified at Gate B4 turnstile.",
    timestamp: "35 mins ago",
    read: true,
  },
];

export function NotificationCenterDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [notifications, setNotifications] = useState<OperationalNotification[]>(INITIAL_NOTIFICATIONS);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-full bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col font-mono text-slate-100 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-cyan-400" />
            <span className="font-bold text-sm tracking-wide text-white">
              OPERATIONAL NOTIFICATION CENTER
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close notification center"
            className="p-1 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quick action bar */}
        <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px]">
            {notifications.filter((n) => !n.read).length} Unread Alerts
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={markAllRead}
              className="text-[10px] text-cyan-400 hover:text-cyan-300 underline"
            >
              Mark all read
            </button>
            <span className="text-slate-600">&bull;</span>
            <button
              onClick={clearAll}
              className="text-[10px] text-slate-400 hover:text-red-400"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Notifications list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
              <ShieldCheck className="h-8 w-8 text-slate-600" />
              <span>All airspace and ground operational alerts clear.</span>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3 rounded-xl border transition ${
                  notif.severity === "CRITICAL"
                    ? "bg-red-950/20 border-red-500/40"
                    : notif.severity === "WARNING"
                    ? "bg-amber-950/20 border-amber-500/40"
                    : notif.severity === "SUCCESS"
                    ? "bg-emerald-950/20 border-emerald-500/40"
                    : "bg-slate-900/60 border-slate-800"
                } ${!notif.read ? "ring-1 ring-cyan-500/30" : "opacity-80"}`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5">
                    {notif.severity === "CRITICAL" ? (
                      <AlertOctagon className="h-4 w-4 text-red-400 shrink-0" />
                    ) : notif.severity === "WARNING" ? (
                      <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                    ) : notif.severity === "SUCCESS" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Info className="h-4 w-4 text-cyan-400 shrink-0" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">{notif.title}</span>
                      <span className="text-[9px] text-slate-400">{notif.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                      {notif.detail}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/60 text-[10px] text-slate-500 text-center">
          Real-time alerts broadcast via AOCC Authority Event Bus
        </div>
      </div>
    </div>
  );
}
