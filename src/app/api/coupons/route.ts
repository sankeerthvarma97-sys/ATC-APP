import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { createCoupon, listCoupons } from "@/lib/services/coupon-service";
import { createCouponSchema } from "@/lib/validations/authority";
import type { PassengerCategory, CouponStatus } from "@/lib/domain";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (user) {
    const auth = assertPermission(user, "VIEW_COUPONS");
    // If not VIEW_COUPONS, check if they have VIEW_BOOKINGS or are ADMIN
    if (!auth.ok && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      const fallbackAuth = assertPermission(user, "VIEW_BOOKINGS");
      if (!fallbackAuth.ok) {
        return Response.json({ error: auth.message }, { status: auth.status });
      }
    }
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || undefined;
  const category = (searchParams.get("category") as PassengerCategory) || undefined;
  const status = (searchParams.get("status") as CouponStatus) || undefined;
  const includeArchived = searchParams.get("includeArchived") === "true";
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("limit") || "25", 10)));

  try {
    const result = await listCoupons({
      query,
      category,
      status,
      includeArchived,
      page,
      limit,
    });

    return Response.json(
      {
        coupons: result.coupons,
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
      {
        headers: {
          "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
        },
      }
    );
  } catch (error: unknown) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to list coupons." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth = assertPermission(user, "MANAGE_COUPONS");
  if (!auth.ok && user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    return Response.json({ error: "Insufficient privileges to create coupons." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createCouponSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const coupon = await createCoupon(parsed.data, user.name || user.email);
    return Response.json({ coupon }, { status: 201 });
  } catch (error: unknown) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to create coupon." },
      { status: 400 }
    );
  }
}
