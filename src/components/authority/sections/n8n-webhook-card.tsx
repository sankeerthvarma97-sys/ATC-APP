"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Webhook,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Radio,
  Clock,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface WebhookStatus {
  enabled: boolean;
  endpointMasked: string | null;
  hasSecret: boolean;
  totalDispatched: number;
  totalFailed: number;
}

interface WebhookHistoryItem {
  id: string;
  eventType: string;
  timestamp: string;
  targetUrl: string;
  status: "SUCCESS" | "FAILED" | "TIMEOUT" | "SKIPPED";
  statusCode?: number;
  durationMs: number;
  errorMessage?: string;
}

export function N8nWebhookCard() {
  const [status, setStatus] = useState<WebhookStatus | null>(null);
  const [history, setHistory] = useState<WebhookHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
    durationMs?: number;
    statusCode?: number;
  } | null>(null);
  const [customUrl, setCustomUrl] = useState("");

  const refreshStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/webhooks");
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error("Failed to load webhook status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const loadInitial = async () => {
      try {
        const res = await fetch("/api/integrations/webhooks");
        if (!ignore && res.ok) {
          const data = await res.json();
          setStatus(data.status);
          setHistory(data.history || []);
        }
      } catch (err) {
        console.error("Failed to load initial webhook status:", err);
      }
    };
    void loadInitial();
    return () => {
      ignore = true;
    };
  }, []);

  const handleTestPing = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/integrations/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TEST_PING",
          overrideUrl: customUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          ok: true,
          message: `Webhook ping acknowledged (${data.result?.statusCode ?? 200} OK)`,
          durationMs: data.result?.durationMs,
          statusCode: data.result?.statusCode,
        });
      } else {
        setTestResult({
          ok: false,
          message: data.result?.error || data.error || "Webhook dispatch failed",
          durationMs: data.result?.durationMs,
          statusCode: data.result?.statusCode,
        });
      }
      refreshStatus();
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : "Network error triggering webhook",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur-sm shadow-sm md:col-span-2">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Webhook className="h-5 w-5 text-indigo-400" />
              <span>n8n Enterprise Automation & Webhook Dispatcher</span>
              <Badge variant="outline" className="text-[10px] tracking-widest font-mono text-muted-foreground uppercase">
                HYD/VOHS Telemetry Hub
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Cryptographically signed (HMAC-SHA256) event streams triggering automated airport workflows in n8n.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshStatus}
              disabled={loading}
              className="h-8 px-2.5 text-xs gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4 text-xs">
        {/* Status Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-muted/40 border border-border/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground mb-1.5">
              <span>Endpoint Status</span>
              <Radio className="h-3.5 w-3.5 text-indigo-400" />
            </div>
            <div className="flex items-center gap-2">
              {status?.enabled ? (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40">
                  ACTIVE
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-muted-foreground">
                  STANDBY / LOCAL
                </Badge>
              )}
              <span className="font-mono text-[11px] truncate text-foreground/80">
                {status?.endpointMasked || "Simulated Local Sink"}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/40 border border-border/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground mb-1.5">
              <span>Security Signature</span>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="flex items-center gap-2">
              <Badge
                className={
                  status?.hasSecret
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                    : "bg-amber-500/20 text-amber-400 border-amber-500/40"
                }
              >
                {status?.hasSecret ? "HMAC-SHA256 SIGNED" : "UNRESTRICTED"}
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                {status?.hasSecret ? "Header: X-AOCC-Signature" : "No secret key configured"}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/40 border border-border/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground mb-1.5">
              <span>Telemetry Counter</span>
              <Clock className="h-3.5 w-3.5 text-sky-400" />
            </div>
            <div className="flex items-center gap-3">
              <div>
                <span className="text-sm font-semibold text-foreground font-mono">
                  {status?.totalDispatched ?? 0}
                </span>{" "}
                <span className="text-[11px] text-muted-foreground">Dispatched</span>
              </div>
              <div className="border-l border-border/50 pl-3">
                <span className="text-sm font-semibold text-rose-400 font-mono">
                  {status?.totalFailed ?? 0}
                </span>{" "}
                <span className="text-[11px] text-muted-foreground">Failed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Test Ping Controls */}
        <div className="p-3.5 rounded-lg border border-border/50 bg-background/50 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="url"
              placeholder="Custom Webhook URL (optional override for testing, e.g. https://.../webhook/test)"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className="flex-1 bg-muted/50 border border-border/60 rounded px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            />
            <Button
              size="sm"
              onClick={handleTestPing}
              disabled={testing}
              className="gap-1.5 shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {testing ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Pinging...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Dispatch Test Ping
                </>
              )}
            </Button>
          </div>

          {testResult && (
            <div
              className={`p-2.5 rounded-md border flex items-center justify-between gap-2 text-xs ${
                testResult.ok
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-400"
              }`}
            >
              <div className="flex items-center gap-2">
                {testResult.ok ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
              {testResult.durationMs !== undefined && (
                <span className="font-mono text-[11px] opacity-80 shrink-0">
                  {testResult.durationMs}ms
                </span>
              )}
            </div>
          )}
        </div>

        {/* Supported Event Triggers */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Subscribed Operational Events
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[
              "FLIGHT_DELAY_ALERT",
              "FLIGHT_EMERGENCY_ALERT",
              "METAR_WEATHER_ALERT",
              "RESOURCE_SHORTAGE_ALERT",
              "DAILY_OPERATIONAL_SUMMARY",
              "SYSTEM_TEST_PING",
            ].map((evt) => (
              <Badge
                key={evt}
                variant="outline"
                className="font-mono text-[10px] text-muted-foreground bg-muted/20"
              >
                {evt}
              </Badge>
            ))}
          </div>
        </div>

        {/* Recent Dispatch History */}
        {history.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border/40">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Recent Webhook Dispatches (In-Memory Buffer)
            </span>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {history.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded bg-muted/20 border border-border/30 text-[11px]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge
                      className={
                        item.status === "SUCCESS"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : item.status === "SKIPPED"
                          ? "bg-muted text-muted-foreground border-border/30"
                          : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                      }
                    >
                      {item.status}
                    </Badge>
                    <span className="font-mono font-medium truncate text-foreground/90">
                      {item.eventType}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-muted-foreground font-mono text-[10px]">
                    <span>{item.durationMs}ms</span>
                    <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
