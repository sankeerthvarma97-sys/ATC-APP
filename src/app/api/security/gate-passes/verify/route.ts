import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { verifyGatePassAndScan } from "@/lib/services/gate-pass-service";
import { verifyGatePassSchema } from "@/lib/validations/authority";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const auth = assertPermission(user, "VERIFY_TICKET");
  if (!auth.ok && user.role !== "SUPER_ADMIN" && user.role !== "ADMIN" && user.role !== "AIRPORT_ADMIN" && user.role !== "SECURITY_OFFICER") {
    return NextResponse.json({ error: "Unauthorized to perform turnstile verification" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = verifyGatePassSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await verifyGatePassAndScan(parsed.data, {
      id: user.id,
      name: user.name,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Turnstile scanning failed" },
      { status: 500 }
    );
  }
}
