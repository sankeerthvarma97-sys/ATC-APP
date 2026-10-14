import { getAuthenticatedUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import {
  listBaggage,
  getBaggageByTag,
  scanBaggageBarcode,
  updateBaggageStatus,
  listUlds,
  packBagIntoUld,
  updateUldStatus,
  listCarousels,
  assignFlightToCarousel,
  verifyBaggagePnr,
  acceptBaggageForPnr,
} from "@/lib/services/baggage-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const flightNumber = searchParams.get("flightNumber") || undefined;
  const edsStatus = searchParams.get("edsStatus") || undefined;
  const sortationStatus = searchParams.get("sortationStatus") || undefined;
  const query = searchParams.get("query") || undefined;
  const tag = searchParams.get("tag") || undefined;

  if (tag) {
    const item = await getBaggageByTag(tag);
    if (!item) return Response.json({ error: "Baggage tag not found" }, { status: 404 });
    return Response.json({ item });
  }

  const [bags, ulds, carousels] = await Promise.all([
    listBaggage({ flightNumber, edsStatus, sortationStatus, query }),
    listUlds(flightNumber),
    listCarousels(),
  ]);

  // Compute KPI metrics
  const totalBags = bags.length;
  const packedUld = bags.filter((b) => b.sortationStatus === "PACKED_ULD" || b.sortationStatus === "LOADED_RAMP").length;
  const edsCleared = bags.filter((b) => b.edsStatus === "CLEARED").length;
  const edsFlagged = bags.filter((b) => b.edsStatus === "LEVEL_2_INSPECTION" || b.edsStatus === "SUSPECT").length;
  const totalWeightKg = bags.reduce((acc, b) => acc + b.weightKg, 0);

  return Response.json({
    bags,
    ulds,
    carousels,
    metrics: {
      totalBags,
      packedUld,
      edsCleared,
      edsFlagged,
      totalWeightKg: Math.round(totalWeightKg),
    },
  });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  const auth = assertPermission(user, "MANAGE_BAGGAGE");
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (action === "VERIFY_PNR") {
      const { pnr } = body;
      if (!pnr) return Response.json({ error: "Missing PNR parameter" }, { status: 400 });
      const result = await verifyBaggagePnr(pnr, { id: user?.id, name: user?.name });
      return Response.json(result);
    }

    if (action === "ACCEPT_BAGGAGE") {
      const { pnr, weightKg, pieces } = body;
      if (!pnr) return Response.json({ error: "Missing PNR parameter" }, { status: 400 });
      const result = await acceptBaggageForPnr(pnr, { weightKg, pieces }, { id: user?.id, name: user?.name });
      return Response.json(result, { status: result.ok ? 200 : 400 });
    }

    if (action === "SCAN") {
      const { code } = body;
      if (!code) return Response.json({ error: "Missing barcode or tag payload" }, { status: 400 });
      const result = await scanBaggageBarcode(code, { id: user?.id, name: user?.name });
      return Response.json(result, { status: result.ok ? 200 : 404 });
    }

    if (action === "PACK_ULD") {
      const { tagNumber, uldCode } = body;
      if (!tagNumber || !uldCode) return Response.json({ error: "Missing tagNumber or uldCode" }, { status: 400 });
      const result = await packBagIntoUld(tagNumber, uldCode, { id: user?.id, name: user?.name });
      return Response.json(result, { status: result.ok ? 200 : 400 });
    }

    if (action === "CLEAR_EDS") {
      const { tagNumber } = body;
      if (!tagNumber) return Response.json({ error: "Missing tagNumber" }, { status: 400 });
      const updated = await updateBaggageStatus(
        tagNumber,
        { edsStatus: "CLEARED", securityNotes: `Manually cleared by ${user?.name || "Security Officer"}` },
        { id: user?.id, name: user?.name }
      );
      if (!updated) return Response.json({ error: "Baggage tag not found" }, { status: 404 });
      return Response.json({ ok: true, message: `Baggage ${tagNumber} cleared by security.`, item: updated });
    }

    if (action === "UPDATE_ULD") {
      const { uldCode, status } = body;
      if (!uldCode || !status) return Response.json({ error: "Missing uldCode or target status" }, { status: 400 });
      const updated = await updateUldStatus(uldCode, status, { id: user?.id, name: user?.name });
      if (!updated) return Response.json({ error: "ULD container not found" }, { status: 404 });
      return Response.json({ ok: true, uld: updated });
    }

    if (action === "ASSIGN_CAROUSEL") {
      const { carouselId, flightNumber } = body;
      if (!carouselId || !flightNumber) return Response.json({ error: "Missing carouselId or flightNumber" }, { status: 400 });
      const updated = await assignFlightToCarousel(Number(carouselId), flightNumber, { id: user?.id, name: user?.name });
      if (!updated) return Response.json({ error: "Carousel not found" }, { status: 404 });
      return Response.json({ ok: true, carousel: updated });
    }

    return Response.json({ error: `Unknown action ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "BHS processing error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const user = await getAuthenticatedUser();
  const auth = assertPermission(user, "MANAGE_BAGGAGE");
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { tagNumber, updates } = body;
    if (!tagNumber || !updates) {
      return Response.json({ error: "Missing tagNumber or updates payload" }, { status: 400 });
    }

    const updated = await updateBaggageStatus(tagNumber, updates, { id: user?.id, name: user?.name });
    if (!updated) return Response.json({ error: "Baggage item not found" }, { status: 404 });

    return Response.json({ ok: true, item: updated });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to update baggage item" },
      { status: 500 }
    );
  }
}
