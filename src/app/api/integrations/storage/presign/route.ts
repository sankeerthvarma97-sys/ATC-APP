import { getAuthenticatedUser } from "@/lib/auth/session";
import { requireAnyRole } from "@/lib/auth/rbac";
import { createPresignedStorageUrl, StorageConfigurationError } from "@/lib/storage/s3";
import { storagePresignSchema } from "@/lib/validations/integrations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  const authz = requireAnyRole(user ?? undefined, ["ATC", "GROUND", "SUPERVISOR", "ANALYST"]);
  if (!authz.ok) {
    return Response.json({ error: authz.message }, { status: authz.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = storagePresignSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid storage presign request.", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await createPresignedStorageUrl(parsed.data);
    return Response.json(result);
  } catch (error) {
    if (error instanceof StorageConfigurationError) {
      return Response.json({ error: error.message }, { status: 503 });
    }

    console.error("Storage presign failed.", error);
    return Response.json({ error: "Storage presign failed." }, { status: 502 });
  }
}
