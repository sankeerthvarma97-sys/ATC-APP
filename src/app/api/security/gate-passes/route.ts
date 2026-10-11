import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import {
  issueGatePass,
  listGatePasses,
  getGatePassKPIs,
  getRecentTurnstileScans,
} from "@/lib/services/gate-pass-service";
import { createGatePassSchema } from "@/lib/validations/authority";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const airportCode = searchParams.get("airportCode") || undefined;
  const status = searchParams.get("status") || undefined;
  const passType = searchParams.get("passType") || undefined;
  const search = searchParams.get("search") || undefined;

  const [passes, kpis, recentScans] = await Promise.all([
    listGatePasses({ airportCode, status, passType, search }),
    getGatePassKPIs(airportCode),
    getRecentTurnstileScans(25),
  ]);

  return NextResponse.json({
    passes,
    kpis,
    recentScans,
  });
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Permission check: gate pass issuance requires security / ground operations / admin authority
  const auth = assertPermission(user, "VERIFY_TICKET");
  if (!auth.ok && user.role !== "SUPER_ADMIN" && user.role !== "ADMIN" && user.role !== "AIRPORT_ADMIN" && user.role !== "SECURITY_OFFICER") {
    return NextResponse.json({ error: "Unauthorized to issue gate passes" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createGatePassSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const pass = await issueGatePass(parsed.data, {
      id: user.id,
      name: user.name,
    });

    return NextResponse.json({ ok: true, pass }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to issue gate pass" },
      { status: 500 }
    );
  }
}
