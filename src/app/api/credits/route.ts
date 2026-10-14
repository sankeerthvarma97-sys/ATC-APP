import { getAuthenticatedUser } from "@/lib/auth/session";
import {
  getUserCreditBalance,
  listCreditTransactions,
  adjustUserCredit,
} from "@/lib/services/credit-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    const { searchParams } = new URL(request.url);

    // If userId requested, verify permissions if checking someone else
    let targetUserId = searchParams.get("userId") || user?.id;
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("pageSize") || "20", 10)));

    const isAdmin =
      user?.role === "SUPER_ADMIN" ||
      user?.role === "ADMIN" ||
      user?.role === "AIRPORT_ADMIN" ||
      user?.role === "OPERATIONS_MANAGER";

    if (searchParams.get("all") === "true" && isAdmin) {
      targetUserId = undefined; // Fetch system-wide ledger
    } else if (targetUserId && targetUserId !== user?.id && !isAdmin) {
      return Response.json(
        { error: "Insufficient permissions to view other users' ledger." },
        { status: 403 }
      );
    }

    const [balance, ledgerResult] = await Promise.all([
      targetUserId ? getUserCreditBalance(targetUserId) : Promise.resolve(null),
      listCreditTransactions({ userId: targetUserId, page, pageSize }),
    ]);

    return Response.json({
      userId: targetUserId,
      creditBalance: balance,
      transactions: ledgerResult.transactions,
      total: ledgerResult.total,
      page: ledgerResult.page,
      pageSize: ledgerResult.pageSize,
    });
  } catch (error) {
    console.error("GET /api/credits error:", error);
    return Response.json(
      { error: "Failed to retrieve credit information." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  // Only super admin, admin, airport admin, or operations manager can adjust credits manually
  const allowedRoles = ["SUPER_ADMIN", "ADMIN", "AIRPORT_ADMIN", "OPERATIONS_MANAGER"];
  if (!allowedRoles.includes(user.role)) {
    return Response.json(
      { error: "Insufficient permissions to adjust user credit balance." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { userId, amount, type, reason, description } = body;

    if (!userId || typeof amount !== "number" || amount <= 0) {
      return Response.json(
        { error: "Valid userId and positive amount are required." },
        { status: 400 }
      );
    }

    const validTypes = ["CREDIT", "BOOKING_DEBIT", "REFUND", "ADJUSTMENT", "BONUS"];
    if (!type || !validTypes.includes(type)) {
      return Response.json(
        { error: `Invalid transaction type. Allowed: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const result = await adjustUserCredit({
      userId,
      amount,
      type,
      description: description || `Admin adjustment by ${user.name}`,
      adminId: user.id,
      adminName: user.name,
      reason: reason || "Manual administrative adjustment",
    });

    return Response.json({
      success: true,
      balanceBefore: result.balanceBefore,
      balanceAfter: result.balanceAfter,
      transaction: result.transaction,
    });
  } catch (error: unknown) {
    console.error("POST /api/credits error:", error);
    const msg = error instanceof Error ? error.message : "Credit adjustment failed.";
    const status = msg.includes("Insufficient") ? 400 : 500;
    return Response.json({ error: msg }, { status });
  }
}
