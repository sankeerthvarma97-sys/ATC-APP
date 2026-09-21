import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { createAirport, listAirports } from "@/lib/services/fleet-service";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const airports = await listAirports();
  return Response.json({ airports });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  const auth = assertPermission(user, "MANAGE_RUNWAYS");
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const schema = z.object({
      iata: z.string().trim().length(3).toUpperCase(),
      icao: z.string().trim().length(4).toUpperCase(),
      name: z.string().trim().min(3),
      city: z.string().trim().min(2),
      country: z.string().trim().min(2).default("India"),
      latitude: z.coerce.number(),
      longitude: z.coerce.number(),
      elevationFt: z.coerce.number().default(0),
      status: z.string().default("ACTIVE"),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const airport = await createAirport(parsed.data, {
      id: user?.id,
      name: user?.name,
    });

    return Response.json({ airport }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to create airport" },
      { status: 500 },
    );
  }
}
