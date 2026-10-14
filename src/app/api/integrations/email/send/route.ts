import { getAuthenticatedUser } from "@/lib/auth/session";
import { requireAnyRole } from "@/lib/auth/rbac";
import { EmailConfigurationError, sendOperationalEmail } from "@/lib/email/resend";
import { emailSendSchema } from "@/lib/validations/integrations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  const authz = requireAnyRole(user ?? undefined, ["ATC", "SUPERVISOR"]);
  if (!authz.ok) {
    return Response.json({ error: authz.message }, { status: authz.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = emailSendSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid email request.", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await sendOperationalEmail(parsed.data);
    return Response.json({
      ...result,
      sent: true,
      simulated: false,
    });
  } catch (error) {
    if (error instanceof EmailConfigurationError) {
      return Response.json({ error: error.message }, { status: 503 });
    }

    console.error("Email send failed.", error);
    return Response.json({ error: "Email send failed." }, { status: 502 });
  }
}
