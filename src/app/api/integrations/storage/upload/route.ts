import { getAuthenticatedUser } from "@/lib/auth/session";
import { requireAnyRole } from "@/lib/auth/rbac";
import { StorageConfigurationError, uploadStorageObject } from "@/lib/storage/s3";
import { storageUploadSchema } from "@/lib/validations/integrations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  const authz = requireAnyRole(user ?? undefined, ["ATC", "GROUND", "SUPERVISOR", "ANALYST"]);
  if (!authz.ok) {
    return Response.json({ error: authz.message }, { status: authz.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = storageUploadSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid storage upload request.", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await uploadStorageObject(parsed.data);
    return Response.json(result);
  } catch (error) {
    if (error instanceof StorageConfigurationError) {
      return Response.json({ error: error.message }, { status: 503 });
    }

    console.error("Storage upload failed.", error);
    return Response.json({ error: "Storage upload failed." }, { status: 502 });
  }
}
