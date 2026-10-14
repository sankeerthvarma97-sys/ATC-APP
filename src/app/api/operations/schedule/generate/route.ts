import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { generateHydDailySchedule } from "@/lib/services/schedule-generator";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (user) {
    const isOps =
      user.role === "SUPER_ADMIN" ||
      user.role === "ADMIN" ||
      user.role === "AIRPORT_ADMIN" ||
      user.role === "OPERATIONS_MANAGER" ||
      user.role === "FLIGHT_DISPATCHER" ||
      user.role === "SIMULATOR_OPERATOR" ||
      assertPermission(user, "CREATE_FLIGHT").ok;

    if (!isOps) {
      return Response.json({ error: "Forbidden: Operations permissions required." }, { status: 403 });
    }
  }

  try {
    const body = await request.json().catch(() => ({}));
    const result = await generateHydDailySchedule({
      startDate: body.startDate,
      daysAhead: body.daysAhead,
      overwrite: body.overwrite,
    });

    return Response.json({ ok: true, schedule: result });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Schedule generation failed." },
      { status: 500 }
    );
  }
}
