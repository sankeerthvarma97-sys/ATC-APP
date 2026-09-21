import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { verifyTicket } from "@/lib/services/checkin-service";
import { verifyTicketSchema } from "@/lib/validations/authority";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  const auth = assertPermission(user, "VERIFY_TICKET");
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const parsed = verifyTicketSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const result = await verifyTicket(parsed.data, {
      id: user?.id,
      name: user?.name,
    });

    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Verification error" },
      { status: 500 },
    );
  }
}
