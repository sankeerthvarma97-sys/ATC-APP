import { listGates, listRunways } from "@/lib/services/fleet-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  if (type === "RUNWAY") {
    const runways = await listRunways();
    return Response.json({ runways });
  }

  if (type === "GATE") {
    const gates = await listGates();
    return Response.json({ gates });
  }

  const [runways, gates] = await Promise.all([listRunways(), listGates()]);
  return Response.json({ runways, gates });
}
