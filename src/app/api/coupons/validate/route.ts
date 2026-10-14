import { calculateFareDiscount } from "@/lib/services/coupon-service";
import { validateCouponSchema } from "@/lib/validations/authority";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = validateCouponSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { valid: false, error: "Validation failed: code and base fare are required." },
        { status: 400 }
      );
    }

    const result = await calculateFareDiscount({
      baseFare: parsed.data.baseFare,
      couponCode: parsed.data.code,
      passengerCategory: parsed.data.passengerCategory,
      seatClass: parsed.data.seatClass,
      passengerEmail: parsed.data.passengerEmail,
    });

    return Response.json(result);
  } catch (error: unknown) {
    return Response.json(
      {
        valid: false,
        error: error instanceof Error ? error.message : "Failed to validate coupon code.",
      },
      { status: 500 }
    );
  }
}
