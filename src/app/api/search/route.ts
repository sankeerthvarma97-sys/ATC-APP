import { NextResponse } from "next/server";
import { prisma, shouldUseDatabase } from "@/lib/prisma";
import { buildMemorySnapshot } from "@/lib/data/store";

export const dynamic = "force-dynamic";

interface SearchResultItem {
  id: string;
  category: "PAGES" | "FLIGHTS" | "PASSENGERS" | "GATES" | "RUNWAYS" | "BOOKINGS" | "TICKETS" | "EMPLOYEES" | "AIRCRAFT";
  title: string;
  subtitle: string;
  badge?: string;
  href: string;
}

const STATIC_PAGES = [
  { title: "Air Traffic Control Radar", subtitle: "/staff/atc &bull; Radar & Sequencing", href: "/staff/atc", category: "PAGES" as const },
  { title: "Flight Deck & Cockpit (PFD)", subtitle: "/staff/pilot &bull; Primary Flight Display", href: "/staff/pilot", category: "PAGES" as const },
  { title: "Gate Turnstile & HUD Scanner", subtitle: "/staff/gate &bull; Passenger Boarding", href: "/staff/gate", category: "PAGES" as const },
  { title: "Ground Handling & Ramp Cockpit", subtitle: "/staff/ground &bull; Pushback & Baggage Tugs", href: "/staff/ground", category: "PAGES" as const },
  { title: "Baggage Handling System (BHS)", subtitle: "/staff/baggage &bull; Carousel & CT X-Ray", href: "/staff/baggage", category: "PAGES" as const },
  { title: "Passenger Check-in & Ticketing", subtitle: "/staff/ticketing &bull; Digital Boarding Pass", href: "/staff/ticketing", category: "PAGES" as const },
  { title: "Security Screening & Access", subtitle: "/staff/security &bull; Biometrics", href: "/staff/security", category: "PAGES" as const },
  { title: "National Operations Command", subtitle: "/admin &bull; Airspace Telemetry", href: "/admin", category: "PAGES" as const },
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();

  const results: SearchResultItem[] = [];

  // Always match relevant static pages
  const matchedPages = STATIC_PAGES.filter(
    (p) => !q || p.title.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q)
  ).slice(0, 4);

  for (const page of matchedPages) {
    results.push({
      id: `page-${page.href}`,
      category: "PAGES",
      title: page.title,
      subtitle: page.subtitle,
      href: page.href,
    });
  }

  if (q.length < 2) {
    return NextResponse.json({ ok: true, query: q, results });
  }

  try {
    if (shouldUseDatabase()) {
      const [flights, passengers, resources, bookings, employees, aircraft] = await Promise.all([
        prisma.flight.findMany({
          where: {
            OR: [
              { callsign: { contains: q, mode: "insensitive" } },
              { flightNumber: { contains: q, mode: "insensitive" } },
              { origin: { contains: q, mode: "insensitive" } },
              { destination: { contains: q, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            callsign: true,
            flightNumber: true,
            origin: true,
            destination: true,
            status: true,
            altitudeFt: true,
          },
          take: 4,
        }),
        prisma.passenger.findMany({
          where: {
            OR: [
              { fullName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            fullName: true,
            email: true,
            bookings: {
              select: { pnr: true, flight: { select: { callsign: true } } },
              take: 1,
            },
          },
          take: 3,
        }),
        prisma.airportResource.findMany({
          where: {
            code: { contains: q, mode: "insensitive" },
          },
          select: {
            id: true,
            resourceType: true,
            code: true,
            label: true,
            status: true,
          },
          take: 3,
        }),
        prisma.booking.findMany({
          where: {
            pnr: { contains: q, mode: "insensitive" },
          },
          select: {
            id: true,
            pnr: true,
            seatNumber: true,
            bookingStatus: true,
            flight: { select: { callsign: true } },
          },
          take: 3,
        }),
        prisma.employee.findMany({
          where: {
            OR: [
              { fullName: { contains: q, mode: "insensitive" } },
              { employeeId: { contains: q, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            employeeId: true,
            fullName: true,
            department: true,
            role: true,
          },
          take: 3,
        }),
        prisma.aircraft.findMany({
          where: {
            OR: [
              { registration: { contains: q, mode: "insensitive" } },
              { model: { contains: q, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            registration: true,
            model: true,
            status: true,
          },
          take: 3,
        }),
      ]);

      for (const f of flights) {
        results.push({
          id: f.id,
          category: "FLIGHTS",
          title: `${f.callsign} (${f.origin} → ${f.destination})`,
          subtitle: `FL${Math.round(f.altitudeFt / 100)} · ${f.status}`,
          badge: f.status,
          href: `/staff/atc?flight=${f.callsign}`,
        });
      }

      for (const p of passengers) {
        const b = p.bookings[0];
        results.push({
          id: p.id,
          category: "PASSENGERS",
          title: p.fullName,
          subtitle: b ? `PNR: ${b.pnr} · ${b.flight?.callsign || "Flight"}` : p.email,
          href: `/staff/ticketing?pnr=${b?.pnr || ""}`,
        });
      }

      for (const b of bookings) {
        results.push({
          id: b.id,
          category: "BOOKINGS" as const,
          title: `PNR: ${b.pnr}`,
          subtitle: `${b.flight.callsign} · Seat ${b.seatNumber}`,
          badge: b.bookingStatus,
          href: `/staff/ticketing?pnr=${b.pnr}`,
        });
      }

      for (const emp of employees) {
        results.push({
          id: emp.id,
          category: "EMPLOYEES" as const,
          title: `${emp.fullName} (${emp.employeeId})`,
          subtitle: `${emp.department} · ${emp.role}`,
          badge: emp.role,
          href: `/admin`,
        });
      }

      for (const ac of aircraft) {
        results.push({
          id: ac.id,
          category: "AIRCRAFT" as const,
          title: `${ac.registration} · ${ac.model}`,
          subtitle: `Status: ${ac.status}`,
          badge: ac.status,
          href: `/staff/ground`,
        });
      }

      for (const r of resources) {
        results.push({
          id: r.id,
          category: r.resourceType === "RUNWAY" ? "RUNWAYS" : "GATES",
          title: `${r.resourceType} ${r.code}`,
          subtitle: `${r.label} · ${r.status}`,
          badge: r.status,
          href: `/staff/ground`,
        });
      }
    } else {
      // In-memory search fallback
      const matchedFlights = buildMemorySnapshot().flights
        .filter(
          (f) =>
            f.callsign.toLowerCase().includes(q) ||
            f.origin.toLowerCase().includes(q) ||
            f.destination.toLowerCase().includes(q)
        )
        .slice(0, 6);

      for (const f of matchedFlights) {
        results.push({
          id: f.id,
          category: "FLIGHTS",
          title: `${f.callsign} (${f.origin} → ${f.destination})`,
          subtitle: `FL${Math.round(f.altitudeFt / 100)} &bull; ${f.status}`,
          badge: f.status,
          href: `/staff/atc?flight=${f.callsign}`,
        });
      }
    }

    return NextResponse.json({ ok: true, query: q, results });
  } catch {
    // Graceful fallback to memory store if database query times out or fails
    const matchedFlights = buildMemorySnapshot().flights
      .filter(
        (f) =>
          f.callsign.toLowerCase().includes(q) ||
          f.origin.toLowerCase().includes(q) ||
          f.destination.toLowerCase().includes(q)
      )
      .slice(0, 6);

    for (const f of matchedFlights) {
      results.push({
        id: f.id,
        category: "FLIGHTS",
        title: `${f.callsign} (${f.origin} → ${f.destination})`,
        subtitle: `FL${Math.round(f.altitudeFt / 100)} · ${f.status}`,
        badge: f.status,
        href: `/staff/atc?flight=${f.callsign}`,
      });
    }

    return NextResponse.json({ ok: true, query: q, results });
  }
}
