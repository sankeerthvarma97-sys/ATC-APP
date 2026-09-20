import { getAuthenticatedUser } from "@/lib/auth/session";
import { getOperationsSnapshot } from "@/lib/repositories/operations-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const snapshot = await getOperationsSnapshot(user);
  return Response.json(snapshot);
}
