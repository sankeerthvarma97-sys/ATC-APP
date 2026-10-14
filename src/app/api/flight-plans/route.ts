import { NextResponse } from "next/server";
import type { IcaoFlightPlanDTO } from "@/lib/domain";

// In-memory store for active filed ICAO flight plans
const memoryFlightPlans: Map<string, IcaoFlightPlanDTO> = new Map([
  [
    "fpl-101",
    {
      id: "fpl-101",
      callsign: "SC101",
      flightRules: "I",
      flightType: "S",
      aircraftType: "B789",
      wakeTurbulence: "H",
      equipment: "SDFGHIJ1RVW/LB1",
      departureAirport: "KJFK",
      eobt: "1430Z",
      cruisingSpeed: "N0485",
      cruisingLevel: "F370",
      route: "MERIT DCT PUT DCT BOSTN N124B COLOR",
      destinationAirport: "EGLL",
      totalEet: "0615",
      alternateAirport: "EGKK",
      remarks: "PBN/A1B1C1D1L1O1S2 DOF/260921 REG/VT-AOC",
      status: "CLEARED",
      filedAt: new Date(Date.now() - 45 * 60_000).toISOString(),
    },
  ],
  [
    "fpl-204",
    {
      id: "fpl-204",
      callsign: "AA1204",
      flightRules: "I",
      flightType: "S",
      aircraftType: "A321",
      wakeTurbulence: "M",
      equipment: "SDFGHIJ1RW/S",
      departureAirport: "KJFK",
      eobt: "1510Z",
      cruisingSpeed: "N0450",
      cruisingLevel: "F330",
      route: "WAVEY J75 ZIZZI AR21 DIW J79 CHS",
      destinationAirport: "KMCO",
      totalEet: "0225",
      alternateAirport: "KTPA",
      remarks: "PBN/A1B1 DOF/260921",
      status: "ACCEPTED",
      filedAt: new Date(Date.now() - 20 * 60_000).toISOString(),
    },
  ],
  [
    "fpl-308",
    {
      id: "fpl-308",
      callsign: "FDX901",
      flightRules: "I",
      flightType: "S",
      aircraftType: "B77F",
      wakeTurbulence: "H",
      equipment: "SDFGHIJ1RVW/LB1",
      departureAirport: "KJFK",
      eobt: "1600Z",
      cruisingSpeed: "N0480",
      cruisingLevel: "F350",
      route: "GREKI JUDDS CAMRN V39 EMBER",
      destinationAirport: "KMEM",
      totalEet: "0250",
      alternateAirport: "KBNA",
      remarks: "CARGO FLIGHT DOF/260921",
      status: "FILED",
      filedAt: new Date(Date.now() - 10 * 60_000).toISOString(),
    },
  ],
]);

export async function GET() {
  const plans = Array.from(memoryFlightPlans.values()).sort(
    (a, b) => new Date(b.filedAt).getTime() - new Date(a.filedAt).getTime()
  );
  return NextResponse.json({ ok: true, count: plans.length, flightPlans: plans });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      callsign,
      flightRules = "I",
      flightType = "S",
      aircraftType = "B789",
      wakeTurbulence = "H",
      equipment = "SDFGHIJ1RVW/LB1",
      departureAirport = "KJFK",
      eobt = "1200Z",
      cruisingSpeed = "N0480",
      cruisingLevel = "F350",
      route = "DIRECT",
      destinationAirport = "EGLL",
      totalEet = "0600",
      alternateAirport = "EGKK",
      remarks,
    } = body;

    if (!callsign || !departureAirport || !destinationAirport) {
      return NextResponse.json(
        { ok: false, error: "Callsign, departure, and destination aerodromes are required." },
        { status: 400 }
      );
    }

    const id = `fpl-${Date.now()}`;
    const newPlan: IcaoFlightPlanDTO = {
      id,
      callsign: callsign.toUpperCase().trim(),
      flightRules,
      flightType,
      aircraftType: aircraftType.toUpperCase().trim(),
      wakeTurbulence,
      equipment,
      departureAirport: departureAirport.toUpperCase().trim(),
      eobt,
      cruisingSpeed,
      cruisingLevel,
      route: route.toUpperCase().trim(),
      destinationAirport: destinationAirport.toUpperCase().trim(),
      totalEet,
      alternateAirport: alternateAirport.toUpperCase().trim(),
      remarks,
      status: "FILED",
      filedAt: new Date().toISOString(),
    };

    memoryFlightPlans.set(id, newPlan);

    return NextResponse.json(
      {
        ok: true,
        message: `ICAO Flight Plan for ${newPlan.callsign} filed successfully into ATC queue.`,
        flightPlan: newPlan,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid flight plan payload" }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status } = body;
    const plan = memoryFlightPlans.get(id);
    if (!plan) {
      return NextResponse.json({ ok: false, error: "Flight plan not found" }, { status: 404 });
    }
    plan.status = status;
    memoryFlightPlans.set(id, plan);
    return NextResponse.json({ ok: true, flightPlan: plan });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to update flight plan" }, { status: 400 });
  }
}
