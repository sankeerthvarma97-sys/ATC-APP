import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import {
  getCouponById,
  updateCoupon,
  archiveCoupon,
  getCouponRedemptions,
} from "@/lib/services/coupon-service";
import { updateCouponSchema } from "@/lib/validations/authority";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const coupon = await getCouponById(id);
  if (!coupon) {
    return Response.json({ error: "Coupon not found" }, { status: 404 });
  }

  const redemptions = await getCouponRedemptions(coupon.id);
  return Response.json({ coupon, redemptions });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth = assertPermission(user, "MANAGE_COUPONS");
  if (!auth.ok && user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    return Response.json({ error: "Insufficient privileges to update coupons." }, { status: 403 });
  }

  const { id } = await params;
  try {
    const body = await request.json();
    const parsed = updateCouponSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const updated = await updateCoupon(id, parsed.data);
    return Response.json({ coupon: updated });
  } catch (error: unknown) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to update coupon." },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth = assertPermission(user, "MANAGE_COUPONS");
  if (!auth.ok && user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    return Response.json({ error: "Insufficient privileges to archive coupons." }, { status: 403 });
  }

  const { id } = await params;
  try {
    const success = await archiveCoupon(id);
    if (!success) {
      return Response.json({ error: "Coupon not found or already archived" }, { status: 404 });
    }
    return Response.json({ message: "Coupon successfully archived." });
  } catch (error: unknown) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to archive coupon." },
      { status: 500 }
    );
  }
}
