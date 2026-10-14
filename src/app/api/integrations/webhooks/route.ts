import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { requireAnyRole } from "@/lib/auth/rbac";
import {
  getWebhookServiceStatus,
  getWebhookDispatchHistory,
  dispatchWebhookEvent,
  type WebhookEventType,
} from "@/lib/services/webhook-service";
import { z } from "zod";

export const dynamic = "force-dynamic";

const TriggerWebhookSchema = z.object({
  action: z.enum(["TEST_PING", "DISPATCH_ALERT"]),
  eventType: z
    .enum([
      "FLIGHT_DELAY_ALERT",
      "FLIGHT_EMERGENCY_ALERT",
      "METAR_WEATHER_ALERT",
      "RESOURCE_SHORTAGE_ALERT",
      "DAILY_OPERATIONAL_SUMMARY",
      "SYSTEM_TEST_PING",
    ])
    .optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  overrideUrl: z.string().url().optional(),
  overrideSecret: z.string().optional(),
});

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    const authz = requireAnyRole(user ?? undefined, ["ADMIN", "SUPER_ADMIN", "AIRPORT_ADMIN"]);
    if (!authz.ok) {
      return NextResponse.json({ error: authz.message }, { status: authz.status });
    }

    const status = getWebhookServiceStatus();
    const history = getWebhookDispatchHistory();

    return NextResponse.json(
      {
        status,
        history,
      },
      {
        headers: {
          "Cache-Control": "no-store, private",
        },
      },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to retrieve webhook status" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    const authz = requireAnyRole(user ?? undefined, ["ADMIN", "SUPER_ADMIN", "AIRPORT_ADMIN"]);
    if (!authz.ok) {
      return NextResponse.json({ error: authz.message }, { status: authz.status });
    }

    const body = await request.json();
    const parsed = TriggerWebhookSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid webhook trigger input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { action, eventType, data, overrideUrl, overrideSecret } = parsed.data;

    let targetEvent: WebhookEventType = "SYSTEM_TEST_PING";
    let payloadData: Record<string, unknown> = {
      initiatedBy: user?.name || user?.email || "Super Administrator",
      initiatedAt: new Date().toISOString(),
      probe: "AOCC-n8n Integration Connectivity Healthcheck",
    };

    if (action === "DISPATCH_ALERT") {
      if (!eventType) {
        return NextResponse.json({ error: "eventType is required for DISPATCH_ALERT" }, { status: 400 });
      }
      targetEvent = eventType;
      payloadData = data || { note: "Manual administrative alert dispatch" };
    }

    const result = await dispatchWebhookEvent(targetEvent, payloadData, {
      overrideUrl,
      overrideSecret,
    });

    return NextResponse.json(
      {
        success: result.ok,
        result,
        status: getWebhookServiceStatus(),
      },
      {
        headers: {
          "Cache-Control": "no-store, private",
        },
      },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to trigger webhook" },
      { status: 500 },
    );
  }
}
