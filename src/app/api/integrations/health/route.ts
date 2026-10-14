import { getAuthenticatedUser } from "@/lib/auth/session";
import { requireAnyRole } from "@/lib/auth/rbac";
import { getEmailConfigStatus } from "@/lib/email/resend";
import { getStorageConfigStatus } from "@/lib/storage/s3";
import { shouldUseDatabase } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthenticatedUser();
  const authz = requireAnyRole(user ?? undefined, ["VIEWER"]);
  if (!authz.ok) {
    return Response.json({ error: authz.message }, { status: authz.status });
  }

  return Response.json({
    database: {
      enabled: shouldUseDatabase(),
      configured: Boolean(process.env.DATABASE_URL),
    },
    ai: {
      gatewayConfigured: Boolean(process.env.AI_GATEWAY_API_KEY),
      geminiConfigured: Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY),
      geminiProjectConfigured: Boolean(process.env.GEMINI_PROJECT_ID),
      model: process.env.AOCC_GOOGLE_MODEL || process.env.AOCC_AI_MODEL || null,
    },
    map: {
      mapboxConfigured: Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN),
    },
    storage: getStorageConfigStatus(),
    email: getEmailConfigStatus(),
  });
}
