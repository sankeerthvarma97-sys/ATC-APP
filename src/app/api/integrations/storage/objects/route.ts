import { getAuthenticatedUser } from "@/lib/auth/session";
import { requireAnyRole } from "@/lib/auth/rbac";
import { deleteStorageObject, listStorageObjects, StorageConfigurationError } from "@/lib/storage/s3";
import { storageDeleteSchema, storageListSchema } from "@/lib/validations/integrations";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  const authz = requireAnyRole(user ?? undefined, ["ATC", "GROUND", "SUPERVISOR", "ANALYST"]);
  if (!authz.ok) {
    return Response.json({ error: authz.message }, { status: authz.status });
  }

  const url = new URL(request.url);
  const parsed = storageListSchema.safeParse({
    prefix: url.searchParams.get("prefix") ?? undefined,
    maxKeys: url.searchParams.get("maxKeys") ?? undefined,
  });

  if (!parsed.success) {
    return Response.json({ error: "Invalid storage list request.", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await listStorageObjects(parsed.data);
    return Response.json(result);
  } catch (error) {
    if (error instanceof StorageConfigurationError) {
      return Response.json({ error: error.message }, { status: 503 });
    }

    console.error("Storage list failed.", error);
    return Response.json({ error: "Storage list failed." }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const user = await getAuthenticatedUser();
  const authz = requireAnyRole(user ?? undefined, ["GROUND", "SUPERVISOR"]);
  if (!authz.ok) {
    return Response.json({ error: authz.message }, { status: authz.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = storageDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid storage delete request.", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await deleteStorageObject(parsed.data.key);
    return Response.json(result);
  } catch (error) {
    if (error instanceof StorageConfigurationError) {
      return Response.json({ error: error.message }, { status: 503 });
    }

    console.error("Storage delete failed.", error);
    return Response.json({ error: "Storage delete failed." }, { status: 502 });
  }
}
