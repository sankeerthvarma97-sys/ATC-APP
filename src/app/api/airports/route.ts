import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { createAirport, listAirports, deleteAirport, archiveAirport } from "@/lib/services/fleet-service";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const airports = await listAirports();
  return Response.json(
    { airports },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400" } }
  );
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

export async function DELETE(request: Request) {
  const user = await getAuthenticatedUser();
  const auth = assertPermission(user, "MANAGE_RUNWAYS");
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const iata = searchParams.get("iata");
  if (!iata) {
    return Response.json({ error: "iata parameter is required." }, { status: 400 });
  }

  try {
    const result = await deleteAirport(iata, { id: user?.id, name: user?.name });
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to delete airport" },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  const user = await getAuthenticatedUser();
  const auth = assertPermission(user, "MANAGE_RUNWAYS");
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { iata, action } = body;
    if (!iata) return Response.json({ error: "iata is required." }, { status: 400 });

    if (action === "ARCHIVE") {
      const result = await archiveAirport(iata, { id: user?.id, name: user?.name });
      return Response.json(result);
    }
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Airport operation failed" },
      { status: 400 },
    );
  }
}
