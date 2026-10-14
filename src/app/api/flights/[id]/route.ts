import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { getFlightById, updateFlightStatus } from "@/lib/services/flight-service";
import { flightStatusSchema } from "@/lib/validations/operations";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await getFlightById(id);
  if (!result) {
    return Response.json({ error: "Flight not found" }, { status: 404 });
  }
  return Response.json(result);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  const auth = assertPermission(user, "EDIT_FLIGHT");
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const patchSchema = z.object({
      status: flightStatusSchema,
      squawk: z.string().optional(),
      phase: z.string().optional(),
      runway: z.string().optional(),
      gate: z.string().optional(),
    });
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid status or parameters" }, { status: 400 });
    }

    const { status, ...extra } = parsed.data;
    const updated = await updateFlightStatus(id, status, extra, {
      id: user?.id,
      name: user?.name,
    });

    if (!updated) {
      return Response.json({ error: "Flight not found" }, { status: 404 });
    }

    return Response.json({ flight: updated });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to update flight" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  const auth = assertPermission(user, "CANCEL_FLIGHT");
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status });
  }

  const updated = await updateFlightStatus(id, "CANCELLED", {
    id: user?.id,
    name: user?.name,
  });

  if (!updated) {
    return Response.json({ error: "Flight not found" }, { status: 404 });
  }

  return Response.json({ ok: true, flight: updated });
}
