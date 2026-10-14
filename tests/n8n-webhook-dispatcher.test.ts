import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import {
  computeWebhookSignature,
  verifyWebhookSignature,
  dispatchWebhookEvent,
  getWebhookServiceStatus,
  getWebhookDispatchHistory,
} from "@/lib/services/webhook-service";

describe("n8n Webhook Dispatcher & Outbound Event Security", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.N8N_WEBHOOK_URL = "";
    process.env.N8N_WEBHOOK_SECRET = "test-secret-key-12345";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("computes deterministic HMAC-SHA256 hex signatures", () => {
    const payload = JSON.stringify({ event: "TEST", value: 42 });
    const secret = "aocc-secure-salt";

    const sig1 = computeWebhookSignature(payload, secret);
    const sig2 = computeWebhookSignature(payload, secret);

    expect(sig1).toBeDefined();
    expect(sig1).toHaveLength(64); // SHA-256 produces 64 hex characters (32 bytes)
    expect(sig1).toBe(sig2);
  });

  it("verifies valid HMAC signatures and rejects tampered payloads or wrong secrets", () => {
    const payload = JSON.stringify({ flightId: "flt-sc101", status: "DELAYED" });
    const secret = "super-secret-automation-key";

    const validSignature = `sha256=${computeWebhookSignature(payload, secret)}`;
    expect(verifyWebhookSignature(payload, validSignature, secret)).toBe(true);

    // Tampered payload
    const tamperedPayload = JSON.stringify({ flightId: "flt-sc101", status: "ON_TIME" });
    expect(verifyWebhookSignature(tamperedPayload, validSignature, secret)).toBe(false);

    // Wrong secret
    expect(verifyWebhookSignature(payload, validSignature, "wrong-secret")).toBe(false);

    // Malformed signature
    expect(verifyWebhookSignature(payload, "invalid-hex", secret)).toBe(false);
  });

  it("gracefully skips dispatch when N8N_WEBHOOK_URL is not configured without throwing", async () => {
    delete process.env.N8N_WEBHOOK_URL;

    const result = await dispatchWebhookEvent("FLIGHT_DELAY_ALERT", {
      flightNumber: "SC101",
      delayMinutes: 35,
    });

    expect(result.ok).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.error).toContain("N8N_WEBHOOK_URL not configured");
  });

  it("dispatches authenticated webhooks with expected security headers", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
    });
    vi.stubGlobal("fetch", mockFetch);

    const testUrl = "https://automation.internal.aocc.test/webhook/events";
    const testSecret = "integration-key-xyz";

    const result = await dispatchWebhookEvent(
      "SYSTEM_TEST_PING",
      { message: "Automated heartbeat" },
      { overrideUrl: testUrl, overrideSecret: testSecret },
    );

    expect(result.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [calledUrl, options] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe(testUrl);
    expect(options.method).toBe("POST");

    const headers = options.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["X-AOCC-Signature"]).toMatch(/^sha256=[a-f0-9]{64}$/);
    expect(headers["X-AOCC-Event-Id"]).toMatch(/^evt-/);
    expect(headers["X-AOCC-Timestamp"]).toBeDefined();

    // Verify the transmitted body can be verified with the secret
    const sentBody = options.body as string;
    expect(verifyWebhookSignature(sentBody, headers["X-AOCC-Signature"], testSecret)).toBe(true);
  });

  it("implements fail-safe resilience when target automation endpoint is unreachable or times out", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Connection refused (ECONNREFUSED)"));
    vi.stubGlobal("fetch", mockFetch);

    const result = await dispatchWebhookEvent(
      "METAR_WEATHER_ALERT",
      { station: "HYD", crosswindKt: 32 },
      { overrideUrl: "https://offline-n8n.test/webhook" },
    );

    // Must never throw, preserving core application execution
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Connection refused");
  });

  it("throttles duplicate rapid events to prevent alert flood", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    vi.stubGlobal("fetch", mockFetch);

    const testUrl = "https://automation.internal.aocc.test/webhook/events";

    // First dispatch succeeds
    const res1 = await dispatchWebhookEvent(
      "RESOURCE_SHORTAGE_ALERT",
      { resource: "STAND_B12", shortage: "TUG_DEFICIT" },
      { overrideUrl: testUrl, dedupKey: "dedup-tug-test-1" },
    );
    expect(res1.ok).toBe(true);
    expect(res1.skipped).toBeUndefined();

    // Immediate second dispatch with identical key gets throttled
    const res2 = await dispatchWebhookEvent(
      "RESOURCE_SHORTAGE_ALERT",
      { resource: "STAND_B12", shortage: "TUG_DEFICIT" },
      { overrideUrl: testUrl, dedupKey: "dedup-tug-test-1" },
    );
    expect(res2.ok).toBe(true);
    expect(res2.skipped).toBe(true);
    expect(res2.error).toContain("Throttled");
  });

  it("reports masked endpoint telemetry and records dispatch history", () => {
    process.env.N8N_WEBHOOK_URL = "https://n8n.cloud.internal/webhook/airport-alerts";
    process.env.N8N_WEBHOOK_SECRET = "secret-passphrase";

    const status = getWebhookServiceStatus();
    expect(status.configured).toBe(true);
    expect(status.secretConfigured).toBe(true);
    expect(status.endpointMasked).toContain("https://n8n.cloud.internal/webhook...");
    expect(status.supportedEvents).toContain("FLIGHT_DELAY_ALERT");
    expect(status.supportedEvents).toContain("SYSTEM_TEST_PING");

    const history = getWebhookDispatchHistory();
    expect(Array.isArray(history)).toBe(true);
  });
});
