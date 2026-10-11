import { logAuditEvent } from "./audit-service";
import { memoryBookings } from "./booking-service";

export interface BaggageItemDTO {
  id: string;
  tagNumber: string;
  pnr: string;
  passengerName: string;
  flightNumber: string;
  origin: string;
  destination: string;
  gate: string;
  weightKg: number;
  classType: "FIRST" | "BUSINESS" | "ECONOMY";
  edsStatus: "CLEARED" | "LEVEL_2_INSPECTION" | "SUSPECT" | "PENDING";
  sortationStatus: "INDUCTED" | "SORTED_CAROUSEL" | "PACKED_ULD" | "LOADED_RAMP" | "CLAIMED";
  assignedUld: string;
  assignedCarousel: number;
  timestamp: string;
  securityNotes?: string;
}

export interface UldContainerDTO {
  id: string;
  code: string;
  type: "AKH (A320)" | "LD3 (B777/A330)" | "BULK_CART";
  flightNumber: string;
  destination: string;
  maxWeightKg: number;
  tareWeightKg: number;
  currentWeightKg: number;
  bagCount: number;
  status: "OPEN_PACKING" | "SEALED" | "RAMP_TRANSIT" | "STOWED_ONBOARD";
  updatedAt: string;
}

export interface CarouselDTO {
  id: number;
  name: string;
  terminal: string;
  type: "DEPARTURE_MAKEUP" | "ARRIVAL_RECLAIM";
  assignedFlight?: string;
  activeBagCount: number;
  status: "OPERATIONAL" | "MAINTENANCE" | "IDLE";
}

// Initial ULD fleet
const memoryUlds: UldContainerDTO[] = [
  {
    id: "uld-1",
    code: "AKH-88214-SC",
    type: "AKH (A320)",
    flightNumber: "SC101",
    destination: "BOM",
    maxWeightKg: 1588,
    tareWeightKg: 82,
    currentWeightKg: 1240,
    bagCount: 64,
    status: "OPEN_PACKING",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "uld-2",
    code: "AKH-10492-AV",
    type: "AKH (A320)",
    flightNumber: "AV201",
    destination: "DEL",
    maxWeightKg: 1588,
    tareWeightKg: 82,
    currentWeightKg: 890,
    bagCount: 46,
    status: "OPEN_PACKING",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "uld-3",
    code: "LD3-44120-IS",
    type: "LD3 (B777/A330)",
    flightNumber: "IS101",
    destination: "BLR",
    maxWeightKg: 1588,
    tareWeightKg: 95,
    currentWeightKg: 1510,
    bagCount: 78,
    status: "SEALED",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "uld-4",
    code: "AKH-99210-BH",
    type: "AKH (A320)",
    flightNumber: "BH301",
    destination: "GOI",
    maxWeightKg: 1588,
    tareWeightKg: 82,
    currentWeightKg: 730,
    bagCount: 38,
    status: "RAMP_TRANSIT",
    updatedAt: new Date().toISOString(),
  },
];

// Initial Carousels & Belts
const memoryCarousels: CarouselDTO[] = [
  { id: 1, name: "Makeup Carousel 1", terminal: "T1", type: "DEPARTURE_MAKEUP", assignedFlight: "SC101", activeBagCount: 64, status: "OPERATIONAL" },
  { id: 2, name: "Makeup Carousel 2", terminal: "T1", type: "DEPARTURE_MAKEUP", assignedFlight: "AV201", activeBagCount: 46, status: "OPERATIONAL" },
  { id: 3, name: "Makeup Carousel 3", terminal: "T1", type: "DEPARTURE_MAKEUP", assignedFlight: "BH301", activeBagCount: 38, status: "OPERATIONAL" },
  { id: 4, name: "Reclaim Belt 1", terminal: "T1", type: "ARRIVAL_RECLAIM", assignedFlight: "IS101", activeBagCount: 78, status: "OPERATIONAL" },
  { id: 5, name: "Reclaim Belt 2", terminal: "T1", type: "ARRIVAL_RECLAIM", activeBagCount: 0, status: "IDLE" },
  { id: 6, name: "Reclaim Belt 3", terminal: "T2", type: "ARRIVAL_RECLAIM", activeBagCount: 0, status: "MAINTENANCE" },
];

// Initial Baggage Inventory
const memoryBags: BaggageItemDTO[] = [
  {
    id: "bag-1",
    tagNumber: "BAG-SC101-0841",
    pnr: "SC7K92P",
    passengerName: "Rahul Varma",
    flightNumber: "SC101",
    origin: "HYD",
    destination: "BOM",
    gate: "B12",
    weightKg: 21.4,
    classType: "BUSINESS",
    edsStatus: "CLEARED",
    sortationStatus: "PACKED_ULD",
    assignedUld: "AKH-88214-SC",
    assignedCarousel: 1,
    timestamp: "11:20:14",
  },
  {
    id: "bag-2",
    tagNumber: "BAG-SC101-0842",
    pnr: "SC7K92P",
    passengerName: "Rahul Varma",
    flightNumber: "SC101",
    origin: "HYD",
    destination: "BOM",
    gate: "B12",
    weightKg: 18.2,
    classType: "BUSINESS",
    edsStatus: "CLEARED",
    sortationStatus: "PACKED_ULD",
    assignedUld: "AKH-88214-SC",
    assignedCarousel: 1,
    timestamp: "11:20:18",
  },
  {
    id: "bag-3",
    tagNumber: "BAG-AV201-1904",
    pnr: "AV10294",
    passengerName: "Ananya Desai",
    flightNumber: "AV201",
    origin: "HYD",
    destination: "DEL",
    gate: "A4",
    weightKg: 23.0,
    classType: "ECONOMY",
    edsStatus: "CLEARED",
    sortationStatus: "SORTED_CAROUSEL",
    assignedUld: "AKH-10492-AV",
    assignedCarousel: 2,
    timestamp: "11:24:45",
  },
  {
    id: "bag-4",
    tagNumber: "BAG-BH301-4411",
    pnr: "BH99412",
    passengerName: "Sarah Jenkins",
    flightNumber: "BH301",
    origin: "HYD",
    destination: "GOI",
    gate: "C2",
    weightKg: 19.5,
    classType: "BUSINESS",
    edsStatus: "CLEARED",
    sortationStatus: "INDUCTED",
    assignedUld: "AKH-99210-BH",
    assignedCarousel: 3,
    timestamp: "11:26:02",
  },
  {
    id: "bag-5",
    tagNumber: "BAG-SEC-9912",
    pnr: "IS88201",
    passengerName: "Vikram Malhotra",
    flightNumber: "IS101",
    origin: "HYD",
    destination: "BLR",
    gate: "A10",
    weightKg: 24.8,
    classType: "ECONOMY",
    edsStatus: "LEVEL_2_INSPECTION",
    sortationStatus: "INDUCTED",
    assignedUld: "UNASSIGNED",
    assignedCarousel: 4,
    timestamp: "11:27:10",
    securityNotes: "High density opaque mass detected in CT slice. Secondary manual reconciliation required.",
  },
];

// Synchronize bags with checked-in bookings in memory
export function syncBaggageFromBookings(): void {
  for (const booking of memoryBookings) {
    if (booking.checkInStatus === "CHECKED_IN") {
      const alreadyCreated = memoryBags.some((b) => b.pnr === booking.pnr);
      if (!alreadyCreated) {
        const bagTag = `BAG-${(booking.flightNumber || "FLT").replace(/\s+/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
        memoryBags.unshift({
          id: `bag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          tagNumber: bagTag,
          pnr: booking.pnr,
          passengerName: booking.passengerName || "Passenger",
          flightNumber: booking.flightNumber || booking.flightCallsign || "SC101",
          origin: booking.origin || "HYD",
          destination: booking.destination || "BOM",
          gate: booking.gate || "B12",
          weightKg: Math.round(14 + Math.random() * 9),
          classType: booking.travelClass || "ECONOMY",
          edsStatus: "CLEARED",
          sortationStatus: "INDUCTED",
          assignedUld: "UNASSIGNED",
          assignedCarousel: 1,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    }
  }
}

export async function listBaggage(filters?: {
  flightNumber?: string;
  edsStatus?: string;
  sortationStatus?: string;
  query?: string;
}): Promise<BaggageItemDTO[]> {
  syncBaggageFromBookings();
  let result = [...memoryBags];

  if (filters?.flightNumber && filters.flightNumber !== "ALL") {
    result = result.filter((b) => b.flightNumber.toUpperCase() === filters.flightNumber?.toUpperCase());
  }

  if (filters?.edsStatus && filters.edsStatus !== "ALL") {
    result = result.filter((b) => b.edsStatus === filters.edsStatus);
  }

  if (filters?.sortationStatus && filters.sortationStatus !== "ALL") {
    result = result.filter((b) => b.sortationStatus === filters.sortationStatus);
  }

  if (filters?.query) {
    const q = filters.query.toLowerCase().trim();
    result = result.filter(
      (b) =>
        b.tagNumber.toLowerCase().includes(q) ||
        b.pnr.toLowerCase().includes(q) ||
        b.passengerName.toLowerCase().includes(q) ||
        b.flightNumber.toLowerCase().includes(q)
    );
  }

  return result;
}

export async function getBaggageByTag(tagOrPnr: string): Promise<BaggageItemDTO | null> {
  syncBaggageFromBookings();
  const q = tagOrPnr.trim().toUpperCase();
  const bag = memoryBags.find(
    (b) => b.tagNumber.toUpperCase() === q || b.pnr.toUpperCase() === q
  );
  return bag || null;
}

export async function scanBaggageBarcode(
  code: string,
  actor?: { id?: string; name?: string }
): Promise<{ ok: boolean; message: string; item?: BaggageItemDTO }> {
  syncBaggageFromBookings();
  const clean = code.trim().toUpperCase();
  const bag = memoryBags.find(
    (b) => b.tagNumber.toUpperCase() === clean || b.pnr.toUpperCase() === clean
  );

  if (!bag) {
    await logAuditEvent({
      actorId: actor?.id,
      actorName: actor?.name,
      action: "BAGGAGE_SCAN_FAILED",
      entity: "BAGGAGE",
      entityId: clean,
      after: { reason: "Tag or PNR not found in sortation index" },
    });
    return { ok: false, message: `Barcode ${clean} not recognized in BHS registry.` };
  }

  await logAuditEvent({
    actorId: actor?.id,
    actorName: actor?.name,
    action: "BAGGAGE_SCANNED",
    entity: "BAGGAGE",
    entityId: bag.tagNumber,
    after: { tagNumber: bag.tagNumber, flight: bag.flightNumber, eds: bag.edsStatus },
  });

  return { ok: true, message: `Bag ${bag.tagNumber} reconciled for flight ${bag.flightNumber}.`, item: bag };
}

export async function updateBaggageStatus(
  tagNumber: string,
  updates: Partial<BaggageItemDTO>,
  actor?: { id?: string; name?: string }
): Promise<BaggageItemDTO | null> {
  const normTag = tagNumber.trim().toUpperCase();
  const index = memoryBags.findIndex((b) => b.tagNumber.toUpperCase() === normTag);
  if (index === -1) return null;

  const previous = { ...memoryBags[index] };
  memoryBags[index] = {
    ...memoryBags[index],
    ...updates,
    timestamp: new Date().toLocaleTimeString(),
  };

  await logAuditEvent({
    actorId: actor?.id,
    actorName: actor?.name,
    action: "BAGGAGE_STATUS_UPDATED",
    entity: "BAGGAGE",
    entityId: normTag,
    before: previous as unknown as Record<string, unknown>,
    after: memoryBags[index] as unknown as Record<string, unknown>,
  });

  return memoryBags[index];
}

export async function listUlds(flightNumber?: string): Promise<UldContainerDTO[]> {
  if (flightNumber && flightNumber !== "ALL") {
    return memoryUlds.filter((u) => u.flightNumber.toUpperCase() === flightNumber.toUpperCase());
  }
  return memoryUlds;
}

export async function packBagIntoUld(
  tagNumber: string,
  uldCode: string,
  actor?: { id?: string; name?: string }
): Promise<{ ok: boolean; message: string; bag?: BaggageItemDTO; uld?: UldContainerDTO }> {
  const normTag = tagNumber.trim().toUpperCase();
  const normUld = uldCode.trim().toUpperCase();

  const bag = memoryBags.find((b) => b.tagNumber.toUpperCase() === normTag);
  if (!bag) return { ok: false, message: `Bag ${normTag} not found.` };

  const uld = memoryUlds.find((u) => u.code.toUpperCase() === normUld);
  if (!uld) return { ok: false, message: `ULD Container ${normUld} not found.` };

  if (bag.edsStatus !== "CLEARED") {
    return {
      ok: false,
      message: `Security Lock: Bag ${bag.tagNumber} is flagged ${bag.edsStatus}. Cannot pack un-cleared baggage.`,
    };
  }

  if (uld.status !== "OPEN_PACKING") {
    return { ok: false, message: `ULD ${uld.code} is ${uld.status} and locked from packing.` };
  }

  // Update bag
  bag.assignedUld = uld.code;
  bag.sortationStatus = "PACKED_ULD";
  bag.timestamp = new Date().toLocaleTimeString();

  // Update ULD metrics
  uld.bagCount += 1;
  uld.currentWeightKg = Math.round(uld.currentWeightKg + bag.weightKg);
  uld.updatedAt = new Date().toISOString();

  await logAuditEvent({
    actorId: actor?.id,
    actorName: actor?.name,
    action: "BAG_PACKED_INTO_ULD",
    entity: "BAGGAGE",
    entityId: bag.tagNumber,
    after: { uld: uld.code, grossWeightKg: uld.currentWeightKg },
  });

  return {
    ok: true,
    message: `Bag ${bag.tagNumber} successfully packed into ${uld.code}. Total load: ${uld.bagCount} bags (${uld.currentWeightKg} kg).`,
    bag,
    uld,
  };
}

export async function updateUldStatus(
  uldCode: string,
  status: UldContainerDTO["status"],
  actor?: { id?: string; name?: string }
): Promise<UldContainerDTO | null> {
  const norm = uldCode.trim().toUpperCase();
  const index = memoryUlds.findIndex((u) => u.code.toUpperCase() === norm);
  if (index === -1) return null;

  const previous = { ...memoryUlds[index] };
  memoryUlds[index] = {
    ...memoryUlds[index],
    status,
    updatedAt: new Date().toISOString(),
  };

  await logAuditEvent({
    actorId: actor?.id,
    actorName: actor?.name,
    action: "ULD_STATUS_UPDATED",
    entity: "ULD",
    entityId: norm,
    before: { status: previous.status },
    after: { status },
  });

  return memoryUlds[index];
}

export async function listCarousels(): Promise<CarouselDTO[]> {
  return memoryCarousels;
}

export async function assignFlightToCarousel(
  carouselId: number,
  flightNumber: string,
  actor?: { id?: string; name?: string }
): Promise<CarouselDTO | null> {
  const carousel = memoryCarousels.find((c) => c.id === carouselId);
  if (!carousel) return null;

  carousel.assignedFlight = flightNumber.trim().toUpperCase();
  carousel.status = "OPERATIONAL";

  await logAuditEvent({
    actorId: actor?.id,
    actorName: actor?.name,
    action: "CAROUSEL_FLIGHT_ASSIGNED",
    entity: "BAGGAGE_CAROUSEL",
    entityId: String(carouselId),
    after: { assignedFlight: carousel.assignedFlight },
  });

  return carousel;
}
