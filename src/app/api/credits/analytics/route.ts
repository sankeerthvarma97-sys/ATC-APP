import { getAuthenticatedUser } from "@/lib/auth/session";
import { getFinancialSummary } from "@/lib/services/credit-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json({ error: "Authentication required." }, { status: 401 });
    }

    const summary = await getFinancialSummary();

    return Response.json(summary);
  } catch (error) {
    console.error("GET /api/credits/analytics error:", error);
    return Response.json(
      { error: "Failed to retrieve financial analytics." },
      { status: 500 }
    );
  }
}
