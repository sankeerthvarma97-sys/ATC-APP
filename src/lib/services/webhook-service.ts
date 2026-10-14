import crypto from "node:crypto";

export type WebhookEventType =
  | "FLIGHT_DELAY_ALERT"
  | "FLIGHT_EMERGENCY_ALERT"
  | "METAR_WEATHER_ALERT"
  | "RESOURCE_SHORTAGE_ALERT"
  | "DAILY_OPERATIONAL_SUMMARY"
  | "SYSTEM_TEST_PING";

export interface WebhookPayload<T = Record<string, unknown>> {
  eventId: string;
  eventType: WebhookEventType;
  timestamp: string;
  airport: string;
  data: T;
}

export interface WebhookDispatchResult {
  ok: boolean;
  skipped?: boolean;
  status?: number;
  durationMs?: number;
  error?: string;
  eventId?: string;
}

export interface WebhookServiceStatus {
  configured: boolean;
  endpointMasked: string | null;
  secretConfigured: boolean;
  supportedEvents: WebhookEventType[];
  recentDispatchesCount: number;
}

// In-memory deduplication cache: eventKey -> timestamp
const deduplicationCache = new Map<string, number>();
const DEDUPLICATION_WINDOW_MS = 60_000; // 60 seconds

// Recent dispatch log for administrative inspection (capped at 20 entries)
export interface WebhookDispatchLogEntry {
  eventId: string;
  eventType: WebhookEventType;
  timestamp: string;
  status: number | null;
  ok: boolean;
  durationMs: number;
  error?: string;
}

const recentDispatchHistory: WebhookDispatchLogEntry[] = [];
const MAX_HISTORY_ENTRIES = 20;

/**
 * Computes HMAC-SHA256 signature for outbound n8n webhook payload authentication.
 */
export function computeWebhookSignature(payloadString: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payloadString).digest("hex");
}

/**
 * Verifies an incoming webhook signature using timing-safe comparison.
 */
export function verifyWebhookSignature(payloadString: string, signature: string, secret: string): boolean {
  try {
    const computed = computeWebhookSignature(payloadString, secret);
    const sigBuffer = Buffer.from(signature.replace(/^sha256=/, ""), "hex");
    const computedBuffer = Buffer.from(computed, "hex");
    if (sigBuffer.length !== computedBuffer.length) return false;
    return crypto.timingSafeEqual(sigBuffer, computedBuffer);
  } catch {
    return false;
  }
}

/**
 * Returns current webhook service operational configuration status.
 */
export function getWebhookServiceStatus(): WebhookServiceStatus {
  const url = process.env.N8N_WEBHOOK_URL?.trim();
  const secret = process.env.N8N_WEBHOOK_SECRET?.trim();

  let masked: string | null = null;
  if (url) {
    try {
      const parsed = new URL(url);
      masked = `${parsed.protocol}//${parsed.hostname}${parsed.pathname.slice(0, 8)}...`;
    } catch {
      masked = "configured (invalid format)";
    }
  }

  return {
    configured: Boolean(url),
    endpointMasked: masked,
    secretConfigured: Boolean(secret),
    supportedEvents: [
      "FLIGHT_DELAY_ALERT",
      "FLIGHT_EMERGENCY_ALERT",
      "METAR_WEATHER_ALERT",
      "RESOURCE_SHORTAGE_ALERT",
      "DAILY_OPERATIONAL_SUMMARY",
      "SYSTEM_TEST_PING",
    ],
    recentDispatchesCount: recentDispatchHistory.length,
  };
}

/**
 * Retrieves the in-memory dispatch history for admin telemetry.
 */
export function getWebhookDispatchHistory(): WebhookDispatchLogEntry[] {
  return [...recentDispatchHistory];
}

/**
 * Asynchronously dispatches an authenticated, signature-verified webhook event to n8n.
 * Fully fail-safe: never throws, never blocks the primary application or database writes.
 */
export async function dispatchWebhookEvent<T = Record<string, unknown>>(
  eventType: WebhookEventType,
  data: T,
  options?: {
    airport?: string;
    dedupKey?: string;
    overrideUrl?: string;
    overrideSecret?: string;
  },
): Promise<WebhookDispatchResult> {
  const webhookUrl = options?.overrideUrl || process.env.N8N_WEBHOOK_URL?.trim();
  const secret = options?.overrideSecret || process.env.N8N_WEBHOOK_SECRET?.trim() || "aocc-default-secret";

  if (!webhookUrl) {
    return { ok: false, skipped: true, error: "N8N_WEBHOOK_URL not configured" };
  }

  // Deduplication check
  const dedupKey = options?.dedupKey || `${eventType}:${JSON.stringify(data).slice(0, 100)}`;
  const now = Date.now();
  const lastSent = deduplicationCache.get(dedupKey);
  if (lastSent && now - lastSent < DEDUPLICATION_WINDOW_MS && eventType !== "SYSTEM_TEST_PING") {
    return { ok: true, skipped: true, error: "Throttled: identical event dispatched within 60s" };
  }
  deduplicationCache.set(dedupKey, now);

  // Clean old deduplication entries
  for (const [key, timestamp] of deduplicationCache.entries()) {
    if (now - timestamp > DEDUPLICATION_WINDOW_MS) {
      deduplicationCache.delete(key);
    }
  }

  const eventId = `evt-${crypto.randomUUID()}`;
  const timestamp = new Date().toISOString();
  const payload: WebhookPayload<T> = {
    eventId,
    eventType,
    timestamp,
    airport: options?.airport || process.env.NEXT_PUBLIC_AIRPORT_CODE || "HYD",
    data,
  };

  const payloadString = JSON.stringify(payload);
  const signature = computeWebhookSignature(payloadString, secret);

  const t0 = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-AOCC-Signature": `sha256=${signature}`,
        "X-AOCC-Event-Id": eventId,
        "X-AOCC-Timestamp": timestamp,
        "User-Agent": "AOCC-Automation-Agent/1.0",
      },
      body: payloadString,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const durationMs = Date.now() - t0;

    const result: WebhookDispatchResult = {
      ok: response.ok,
      status: response.status,
      durationMs,
      eventId,
      error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
    };

    recentDispatchHistory.unshift({
      eventId,
      eventType,
      timestamp,
      status: response.status,
      ok: response.ok,
      durationMs,
      error: result.error,
    });
    if (recentDispatchHistory.length > MAX_HISTORY_ENTRIES) {
      recentDispatchHistory.pop();
    }

    return result;
  } catch (err) {
    const durationMs = Date.now() - t0;
    const errorMessage = err instanceof Error ? err.message : "Network/timeout failure";

    recentDispatchHistory.unshift({
      eventId,
      eventType,
      timestamp,
      status: null,
      ok: false,
      durationMs,
      error: errorMessage,
    });
    if (recentDispatchHistory.length > MAX_HISTORY_ENTRIES) {
      recentDispatchHistory.pop();
    }

    return {
      ok: false,
      durationMs,
      eventId,
      error: errorMessage,
    };
  }
}
