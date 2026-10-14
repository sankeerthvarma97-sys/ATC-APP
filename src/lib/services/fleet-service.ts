import type { AircraftDTO, AirlineDTO, AirportDTO, GateDTO, RunwayDTO } from "@/lib/domain";
import { prisma, shouldUseDatabase } from "@/lib/prisma";
import { logAuditEvent } from "./audit-service";

export const initialAirports: AirportDTO[] = [
  { id: "apt-hyd", iata: "HYD", icao: "VOHS", name: "Rajiv Gandhi International Airport", city: "Hyderabad", state: "Telangana", country: "India", latitude: 17.2403, longitude: 78.4294, elevationFt: 2024, status: "ACTIVE" },
  { id: "apt-bom", iata: "BOM", icao: "VABB", name: "Chhatrapati Shivaji Maharaj International Airport", city: "Mumbai", state: "Maharashtra", country: "India", latitude: 19.0896, longitude: 72.8656, elevationFt: 39, status: "ACTIVE" },
  { id: "apt-del", iata: "DEL", icao: "VIDP", name: "Indira Gandhi International Airport", city: "Delhi", state: "Delhi", country: "India", latitude: 28.5562, longitude: 77.1000, elevationFt: 777, status: "ACTIVE" },
  { id: "apt-blr", iata: "BLR", icao: "VOBL", name: "Kempegowda International Airport", city: "Bengaluru", state: "Karnataka", country: "India", latitude: 13.1986, longitude: 77.7066, elevationFt: 3000, status: "ACTIVE" },
  { id: "apt-maa", iata: "MAA", icao: "VOMM", name: "Chennai International Airport", city: "Chennai", state: "Tamil Nadu", country: "India", latitude: 12.9941, longitude: 80.1709, elevationFt: 52, status: "ACTIVE" },
  { id: "apt-ccu", iata: "CCU", icao: "VECC", name: "Netaji Subhas Chandra Bose International Airport", city: "Kolkata", state: "West Bengal", country: "India", latitude: 22.6547, longitude: 88.4467, elevationFt: 16, status: "ACTIVE" },
  { id: "apt-cok", iata: "COK", icao: "VOCI", name: "Cochin International Airport", city: "Kochi", state: "Kerala", country: "India", latitude: 10.1520, longitude: 76.4019, elevationFt: 30, status: "ACTIVE" },
  { id: "apt-goi", iata: "GOI", icao: "VOGO", name: "Goa International Airport", city: "Goa", state: "Goa", country: "India", latitude: 15.3808, longitude: 73.8314, elevationFt: 184, status: "ACTIVE" },
  { id: "apt-pnq", iata: "PNQ", icao: "VAPO", name: "Pune Airport", city: "Pune", state: "Maharashtra", country: "India", latitude: 18.5822, longitude: 73.9197, elevationFt: 1942, status: "ACTIVE" },
  { id: "apt-amd", iata: "AMD", icao: "VAAH", name: "Sardar Vallabhbhai Patel International Airport", city: "Ahmedabad", state: "Gujarat", country: "India", latitude: 23.0772, longitude: 72.6347, elevationFt: 189, status: "ACTIVE" },
  { id: "apt-jai", iata: "JAI", icao: "VIJP", name: "Jaipur International Airport", city: "Jaipur", state: "Rajasthan", country: "India", latitude: 26.8242, longitude: 75.8122, elevationFt: 1263, status: "ACTIVE" },
  { id: "apt-lko", iata: "LKO", icao: "VILK", name: "Chaudhary Charan Singh International Airport", city: "Lucknow", state: "Uttar Pradesh", country: "India", latitude: 26.7606, longitude: 80.8893, elevationFt: 123, status: "ACTIVE" },
  { id: "apt-bbi", iata: "BBI", icao: "VEBS", name: "Biju Patnaik International Airport", city: "Bhubaneswar", state: "Odisha", country: "India", latitude: 20.2444, longitude: 85.8178, elevationFt: 138, status: "ACTIVE" },
  { id: "apt-vtz", iata: "VTZ", icao: "VOVZ", name: "Visakhapatnam International Airport", city: "Visakhapatnam", state: "Andhra Pradesh", country: "India", latitude: 17.7212, longitude: 83.2245, elevationFt: 45, status: "ACTIVE" },
  { id: "apt-tir", iata: "TIR", icao: "VOTP", name: "Tirupati International Airport", city: "Tirupati", state: "Andhra Pradesh", country: "India", latitude: 13.6325, longitude: 79.5433, elevationFt: 350, status: "ACTIVE" },
  { id: "apt-gau", iata: "GAU", icao: "VEGT", name: "Lokpriya Gopinath Bordoloi International Airport", city: "Guwahati", state: "Assam", country: "India", latitude: 26.1061, longitude: 91.5859, elevationFt: 162, status: "ACTIVE" },
  { id: "apt-pat", iata: "PAT", icao: "VEPT", name: "Jayprakash Narayan Airport", city: "Patna", state: "Bihar", country: "India", latitude: 25.5913, longitude: 85.0880, elevationFt: 170, status: "ACTIVE" },
  { id: "apt-ixc", iata: "IXC", icao: "VICG", name: "Shaheed Bhagat Singh International Airport", city: "Chandigarh", state: "Punjab", country: "India", latitude: 30.6735, longitude: 76.7885, elevationFt: 1012, status: "ACTIVE" },
  { id: "apt-trv", iata: "TRV", icao: "VOTV", name: "Thiruvananthapuram International Airport", city: "Thiruvananthapuram", state: "Kerala", country: "India", latitude: 8.4821, longitude: 76.9200, elevationFt: 15, status: "ACTIVE" },
  { id: "apt-nag", iata: "NAG", icao: "VANP", name: "Dr. Babasaheb Ambedkar International Airport", city: "Nagpur", state: "Maharashtra", country: "India", latitude: 21.0922, longitude: 79.0472, elevationFt: 1033, status: "ACTIVE" },
  { id: "apt-sxr", iata: "SXR", icao: "VISR", name: "Sheikh ul-Alam International Airport", city: "Srinagar", state: "Jammu & Kashmir", country: "India", latitude: 33.9871, longitude: 74.7742, elevationFt: 5456, status: "ACTIVE" },
  { id: "apt-ixb", iata: "IXB", icao: "VEBD", name: "Bagdogra Airport", city: "Siliguri", state: "West Bengal", country: "India", latitude: 26.6812, longitude: 88.3286, elevationFt: 413, status: "ACTIVE" },
  { id: "apt-idr", iata: "IDR", icao: "VAID", name: "Devi Ahilya Bai Holkar Airport", city: "Indore", state: "Madhya Pradesh", country: "India", latitude: 22.7217, longitude: 75.8011, elevationFt: 1850, status: "ACTIVE" },
  { id: "apt-vns", iata: "VNS", icao: "VEBN", name: "Lal Bahadur Shastri International Airport", city: "Varanasi", state: "Uttar Pradesh", country: "India", latitude: 25.4524, longitude: 82.8593, elevationFt: 266, status: "ACTIVE" },
  { id: "apt-atq", iata: "ATQ", icao: "VIAR", name: "Sri Guru Ram Dass Jee International Airport", city: "Amritsar", state: "Punjab", country: "India", latitude: 31.7096, longitude: 74.7973, elevationFt: 756, status: "ACTIVE" },
  { id: "apt-ixr", iata: "IXR", icao: "VERC", name: "Birsa Munda Airport", city: "Ranchi", state: "Jharkhand", country: "India", latitude: 23.3143, longitude: 85.3217, elevationFt: 2149, status: "ACTIVE" },
  { id: "apt-bdq", iata: "BDQ", icao: "VABO", name: "Vadodara Airport", city: "Vadodara", state: "Gujarat", country: "India", latitude: 22.3361, longitude: 73.2263, elevationFt: 127, status: "ACTIVE" },
  { id: "apt-dxb", iata: "DXB", icao: "OMDB", name: "Dubai International Simulation Field", city: "Dubai", country: "UAE", latitude: 25.2532, longitude: 55.3657, elevationFt: 62, status: "ACTIVE" },
  { id: "apt-sin", iata: "SIN", icao: "WSSS", name: "Singapore Changi Simulation Field", city: "Singapore", country: "Singapore", latitude: 1.3644, longitude: 103.9915, elevationFt: 22, status: "ACTIVE" },
  { id: "apt-jfk", iata: "JFK", icao: "KJFK", name: "Kennedy International Simulation Field", city: "New York", country: "USA", latitude: 40.6413, longitude: -73.7781, elevationFt: 13, status: "ACTIVE" },
];

export const initialAirlines: AirlineDTO[] = [
  { id: "air-sc", name: "SkyConnect Airlines", iata: "SC", icao: "SKY", logo: "✈️", country: "India", contactEmail: "ops@skyconnect.sim", contactPhone: "+91 800 100 2001", status: "ACTIVE" },
  { id: "air-av", name: "AeroVista", iata: "AV", icao: "AVS", logo: "🌐", country: "India", contactEmail: "ops@aerovista.sim", contactPhone: "+91 800 100 2002", status: "ACTIVE" },
  { id: "air-bh", name: "Blue Horizon Air", iata: "BH", icao: "BHA", logo: "🔷", country: "India", contactEmail: "ops@bluehorizon.sim", contactPhone: "+91 800 100 2003", status: "ACTIVE" },
  { id: "air-nv", name: "Nova Airways", iata: "NV", icao: "NVA", logo: "⭐", country: "India", contactEmail: "ops@novaair.sim", contactPhone: "+91 800 100 2004", status: "ACTIVE" },
  { id: "air-is", name: "IndianSky Simulation Airlines", iata: "IS", icao: "ISK", logo: "🇮🇳", country: "India", contactEmail: "ops@indiansky.sim", contactPhone: "+91 800 100 2005", status: "ACTIVE" },
];

export const initialAircraft: AircraftDTO[] = [
  { id: "ac-1", registration: "VT-SC1", model: "Airbus A320neo", manufacturer: "Airbus", airlineId: "air-sc", airlineName: "SkyConnect Airlines", economyCapacity: 150, businessCapacity: 20, firstClassCapacity: 0, totalCapacity: 170, status: "IN_SERVICE", currentAirport: "HYD", currentGate: "B12" },
  { id: "ac-2", registration: "VT-SC2", model: "Airbus A321neo", manufacturer: "Airbus", airlineId: "air-sc", airlineName: "SkyConnect Airlines", economyCapacity: 180, businessCapacity: 24, firstClassCapacity: 0, totalCapacity: 204, status: "IN_SERVICE", currentAirport: "BOM", currentGate: "A4" },
  { id: "ac-3", registration: "VT-AV1", model: "Boeing 737-800", manufacturer: "Boeing", airlineId: "air-av", airlineName: "AeroVista", economyCapacity: 162, businessCapacity: 16, firstClassCapacity: 0, totalCapacity: 178, status: "IN_SERVICE", currentAirport: "DEL", currentGate: "C2" },
  { id: "ac-4", registration: "VT-AV2", model: "Boeing 787-9", manufacturer: "Boeing", airlineId: "air-av", airlineName: "AeroVista", economyCapacity: 220, businessCapacity: 35, firstClassCapacity: 8, totalCapacity: 263, status: "IN_SERVICE", currentAirport: "BLR", currentGate: "D1" },
  { id: "ac-5", registration: "VT-BH1", model: "Airbus A320", manufacturer: "Airbus", airlineId: "air-bh", airlineName: "Blue Horizon Air", economyCapacity: 150, businessCapacity: 20, firstClassCapacity: 0, totalCapacity: 170, status: "IN_SERVICE", currentAirport: "MAA", currentGate: "B6" },
  { id: "ac-6", registration: "VT-BH2", model: "Boeing 737 MAX 8", manufacturer: "Boeing", airlineId: "air-bh", airlineName: "Blue Horizon Air", economyCapacity: 160, businessCapacity: 18, firstClassCapacity: 0, totalCapacity: 178, status: "IN_SERVICE", currentAirport: "CCU", currentGate: "A1" },
  { id: "ac-7", registration: "VT-NV1", model: "Airbus A321", manufacturer: "Airbus", airlineId: "air-nv", airlineName: "Nova Airways", economyCapacity: 180, businessCapacity: 24, firstClassCapacity: 0, totalCapacity: 204, status: "IN_SERVICE", currentAirport: "COK", currentGate: "B2" },
  { id: "ac-8", registration: "VT-IS1", model: "Boeing 777-200ER", manufacturer: "Boeing", airlineId: "air-is", airlineName: "IndianSky Simulation Airlines", economyCapacity: 260, businessCapacity: 40, firstClassCapacity: 12, totalCapacity: 312, status: "IN_SERVICE", currentAirport: "HYD", currentGate: "A10" },
];

export const initialRunways: RunwayDTO[] = [
  { id: "rwy-09l-hyd", airportId: "HYD", code: "09L/27R", headingDeg: 92, lengthMeters: 4260, status: "AVAILABLE", wind: "090/08kt", approachType: "CAT IIIb ILS", surfaceCondition: "DRY", frictionMu: 0.76, ilsStatus: "OPERATIONAL", lightingStatus: "FULL", activeConfig: "MIXED_MODE" },
  { id: "rwy-09r-hyd", airportId: "HYD", code: "09R/27L", headingDeg: 92, lengthMeters: 3800, status: "OCCUPIED", wind: "090/08kt", approachType: "CAT II ILS", surfaceCondition: "DRY", frictionMu: 0.74, ilsStatus: "OPERATIONAL", lightingStatus: "FULL", activeConfig: "DEPARTURES_ONLY" },
  { id: "rwy-04l-jfk", airportId: "JFK", code: "04L/22R", headingDeg: 44, lengthMeters: 3682, status: "OCCUPIED", wind: "040/12kt", approachType: "CAT IIIb ILS", surfaceCondition: "DRY", frictionMu: 0.72, ilsStatus: "OPERATIONAL", lightingStatus: "FULL", activeConfig: "ARRIVALS_ONLY" },
  { id: "rwy-04r-jfk", airportId: "JFK", code: "04R/22L", headingDeg: 44, lengthMeters: 2560, status: "AVAILABLE", wind: "040/12kt", approachType: "CAT I ILS", surfaceCondition: "DRY", frictionMu: 0.70, ilsStatus: "OPERATIONAL", lightingStatus: "FULL", activeConfig: "DEPARTURES_ONLY" },
  { id: "rwy-13l-jfk", airportId: "JFK", code: "13L/31R", headingDeg: 134, lengthMeters: 4423, status: "AVAILABLE", wind: "040/12kt", approachType: "CAT II ILS", surfaceCondition: "DRY", frictionMu: 0.75, ilsStatus: "OPERATIONAL", lightingStatus: "FULL", activeConfig: "MIXED_MODE" },
  { id: "rwy-13r-jfk", airportId: "JFK", code: "13R/31L", headingDeg: 134, lengthMeters: 3048, status: "RESERVED", wind: "040/12kt", approachType: "RNAV (GPS)", surfaceCondition: "DRY", frictionMu: 0.69, ilsStatus: "OPERATIONAL", lightingStatus: "PARTIAL", activeConfig: "CLOSED" },
  { id: "rwy-27-bom", airportId: "BOM", code: "09/27", headingDeg: 274, lengthMeters: 3489, status: "AVAILABLE", wind: "260/14kt", approachType: "CAT II ILS", surfaceCondition: "WET", frictionMu: 0.61, ilsStatus: "OPERATIONAL", lightingStatus: "FULL", activeConfig: "MIXED_MODE" },
  { id: "rwy-14-bom", airportId: "BOM", code: "14/32", headingDeg: 142, lengthMeters: 2925, status: "AVAILABLE", wind: "260/14kt", approachType: "VOR/DME", surfaceCondition: "DAMP", frictionMu: 0.65, ilsStatus: "DEGRADED", lightingStatus: "FULL", activeConfig: "DEPARTURES_ONLY" },
  { id: "rwy-28-del", airportId: "DEL", code: "10/28", headingDeg: 281, lengthMeters: 3810, status: "OCCUPIED", wind: "290/06kt", approachType: "CAT IIIb ILS", surfaceCondition: "DRY", frictionMu: 0.78, ilsStatus: "OPERATIONAL", lightingStatus: "FULL", activeConfig: "ARRIVALS_ONLY" },
  { id: "rwy-29-del", airportId: "DEL", code: "11/29", headingDeg: 291, lengthMeters: 4430, status: "AVAILABLE", wind: "290/06kt", approachType: "CAT IIIb ILS", surfaceCondition: "DRY", frictionMu: 0.80, ilsStatus: "OPERATIONAL", lightingStatus: "FULL", activeConfig: "DEPARTURES_ONLY" },
  { id: "rwy-09l-blr", airportId: "BLR", code: "09L/27R", headingDeg: 93, lengthMeters: 4000, status: "AVAILABLE", wind: "090/09kt", approachType: "CAT I ILS", surfaceCondition: "DRY", frictionMu: 0.75, ilsStatus: "OPERATIONAL", lightingStatus: "FULL", activeConfig: "ARRIVALS_ONLY" },
  { id: "rwy-09r-blr", airportId: "BLR", code: "09R/27L", headingDeg: 93, lengthMeters: 4000, status: "AVAILABLE", wind: "090/09kt", approachType: "CAT IIIb ILS", surfaceCondition: "DRY", frictionMu: 0.77, ilsStatus: "OPERATIONAL", lightingStatus: "FULL", activeConfig: "DEPARTURES_ONLY" },
];

export const initialGates: GateDTO[] = [
  { id: "gate-b12", terminalId: "t1", code: "B12", status: "OCCUPIED", turnMinutes: 40 },
  { id: "gate-a4", terminalId: "t1", code: "A4", status: "AVAILABLE", turnMinutes: 45 },
  { id: "gate-a10", terminalId: "t1", code: "A10", status: "AVAILABLE", turnMinutes: 50 },
  { id: "gate-c2", terminalId: "t2", code: "C2", status: "OCCUPIED", turnMinutes: 35 },
  { id: "gate-b24", terminalId: "t1", code: "B24", status: "RESERVED", turnMinutes: 45 },
  { id: "gate-a12", terminalId: "t1", code: "A12", status: "OCCUPIED", turnMinutes: 41 },
];

const memoryAirports = [...initialAirports];
const memoryAirlines = [...initialAirlines];
const memoryAircraft = [...initialAircraft];
const memoryRunways = [...initialRunways];
let memoryGates = [...initialGates];

export async function ensureDomesticAirports(): Promise<void> {
  if (!shouldUseDatabase()) return;

  const domesticAirports = initialAirports.filter((airport) => airport.country === "India");
  const existing = await prisma.airport.findMany({
    where: { iata: { in: domesticAirports.map((airport) => airport.iata) } },
    select: { iata: true },
  });
  const existingCodes = new Set(existing.map((airport) => airport.iata));
  const missingAirports = domesticAirports.filter((airport) => !existingCodes.has(airport.iata));

  if (missingAirports.length > 0) {
    await prisma.airport.createMany({
      data: missingAirports.map(({ id, iata, icao, name, city, country, latitude, longitude, elevationFt, status }) => ({
        id,
        iata,
        icao,
        name,
        city,
        country,
        latitude,
        longitude,
        elevationFt,
        status,
      })),
      skipDuplicates: true,
    });
  }
}

export async function listAirports(): Promise<AirportDTO[]> {
  if (shouldUseDatabase()) {
    try {
      await ensureDomesticAirports();
      const dbAirports = await prisma.airport.findMany({ orderBy: { iata: "asc" } });
      if (dbAirports.length > 0) {
        const sorted = [...dbAirports].sort((a, b) => {
          if (a.iata === "HYD") return -1;
          if (b.iata === "HYD") return 1;
          return a.iata.localeCompare(b.iata);
        });
        return sorted.map((a) => ({
          id: a.id,
          iata: a.iata,
          icao: a.icao,
          name: a.name,
          city: a.city,
          country: a.country,
          latitude: a.latitude,
          longitude: a.longitude,
          elevationFt: a.elevationFt,
          status: a.status,
        }));
      }
    } catch (error) {
      console.warn("Database airport query failed; using memory.", error);
    }
  }
  return memoryAirports;
}

export async function createAirport(input: Omit<AirportDTO, "id">, actor?: { id?: string; name?: string }): Promise<AirportDTO> {
  const airport: AirportDTO = {
    id: `apt-${input.iata.toLowerCase()}`,
    ...input,
  };
  memoryAirports.push(airport);

  if (shouldUseDatabase()) {
    try {
      await prisma.airport.upsert({
        where: { iata: airport.iata },
        update: { ...input },
        create: { id: airport.id, ...input },
      });
    } catch (error) {
      console.warn("Database airport upsert failed; stored in memory.", error);
    }
  }

  await logAuditEvent({
    actorId: actor?.id,
    actorName: actor?.name,
    action: "ADMIN_CREATED_AIRPORT",
    entity: "AIRPORT",
    entityId: airport.iata,
    after: { iata: airport.iata, name: airport.name },
  });

  return airport;
}

export async function deleteAirport(
  iata: string,
  actor?: { id?: string; name?: string }
): Promise<{ ok: boolean; message: string }> {
  const normIata = iata.trim().toUpperCase();

  if (normIata === "HYD") {
    throw new Error("Default simulation airport (HYD) cannot be deleted.");
  }

  if (shouldUseDatabase()) {
    const activeFlight = await prisma.flight.findFirst({
      where: {
        OR: [{ origin: normIata }, { destination: normIata }],
        status: { notIn: ["CANCELLED", "ARRIVED"] },
      },
    });
    if (activeFlight) {
      throw new Error(
        `Cannot delete airport ${normIata}: Active flight ${activeFlight.flightNumber || activeFlight.callsign} depends on it. Archive instead or cancel flights first.`
      );
    }

    await prisma.airport.delete({ where: { iata: normIata } });
  }

  const idx = memoryAirports.findIndex((a) => a.iata === normIata);
  if (idx !== -1) {
    memoryAirports.splice(idx, 1);
  }

  await logAuditEvent({
    actorId: actor?.id,
    actorName: actor?.name,
    action: "ADMIN_DELETED_AIRPORT",
    entity: "AIRPORT",
    entityId: normIata,
  });

  return { ok: true, message: `Airport ${normIata} deleted successfully.` };
}

export async function archiveAirport(
  iata: string,
  actor?: { id?: string; name?: string }
): Promise<{ ok: boolean; message: string }> {
  const normIata = iata.trim().toUpperCase();
  if (normIata === "HYD") {
    throw new Error("Default simulation airport (HYD) cannot be archived.");
  }

  if (shouldUseDatabase()) {
    await prisma.airport.update({
      where: { iata: normIata },
      data: { status: "ARCHIVED" },
    });
  }

  const apt = memoryAirports.find((a) => a.iata === normIata);
  if (apt) apt.status = "ARCHIVED";

  await logAuditEvent({
    actorId: actor?.id,
    actorName: actor?.name,
    action: "ADMIN_ARCHIVED_AIRPORT",
    entity: "AIRPORT",
    entityId: normIata,
  });

  return { ok: true, message: `Airport ${normIata} archived successfully.` };
}

export async function listAirlines(): Promise<AirlineDTO[]> {
  if (shouldUseDatabase()) {
    try {
      const dbAirlines = await prisma.airline.findMany({ orderBy: { name: "asc" } });
      if (dbAirlines.length > 0) {
        return dbAirlines.map((a) => ({
          id: a.id,
          name: a.name,
          iata: a.iata,
          icao: a.icao,
          logo: a.logo ?? "✈️",
          country: a.country,
          contactEmail: a.contactEmail ?? undefined,
          contactPhone: a.contactPhone ?? undefined,
          status: a.status,
        }));
      }
    } catch (error) {
      console.warn("Database airline query failed; using memory.", error);
    }
  }
  return memoryAirlines;
}

export async function createAirline(input: Omit<AirlineDTO, "id">, actor?: { id?: string; name?: string }): Promise<AirlineDTO> {
  const airline: AirlineDTO = {
    id: `air-${input.iata.toLowerCase()}`,
    ...input,
  };
  memoryAirlines.push(airline);

  if (shouldUseDatabase()) {
    try {
      await prisma.airline.upsert({
        where: { iata: airline.iata },
        update: { ...input },
        create: { id: airline.id, ...input },
      });
    } catch (error) {
      console.warn("Database airline upsert failed; stored in memory.", error);
    }
  }

  await logAuditEvent({
    actorId: actor?.id,
    actorName: actor?.name,
    action: "AIRLINE_CREATED",
    entity: "AIRLINE",
    entityId: airline.iata,
    after: { iata: airline.iata, name: airline.name },
  });

  return airline;
}

export async function listAircraft(): Promise<AircraftDTO[]> {
  if (shouldUseDatabase()) {
    try {
      const dbAircraft = await prisma.aircraft.findMany({
        include: { airline: { select: { name: true } } },
        orderBy: { registration: "asc" },
      });
      if (dbAircraft.length > 0) {
        return dbAircraft.map((ac) => ({
          id: ac.id,
          registration: ac.registration,
          model: ac.model,
          manufacturer: ac.manufacturer,
          airlineId: ac.airlineId,
          airlineName: ac.airline.name,
          economyCapacity: ac.economyCapacity,
          businessCapacity: ac.businessCapacity,
          firstClassCapacity: ac.firstClassCapacity,
          totalCapacity: ac.totalCapacity,
          status: ac.status,
          currentAirport: ac.currentAirport ?? undefined,
          currentGate: ac.currentGate ?? undefined,
          currentFlightId: ac.currentFlightId ?? undefined,
        }));
      }
    } catch (error) {
      console.warn("Database aircraft query failed; using memory.", error);
    }
  }
  return memoryAircraft;
}

export async function createAircraft(input: Omit<AircraftDTO, "id">, actor?: { id?: string; name?: string }): Promise<AircraftDTO> {
  const aircraft: AircraftDTO = {
    id: `ac-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ...input,
  };
  memoryAircraft.push(aircraft);

  if (shouldUseDatabase()) {
    try {
      await prisma.aircraft.create({
        data: {
          id: aircraft.id,
          registration: aircraft.registration,
          model: aircraft.model,
          manufacturer: aircraft.manufacturer,
          airlineId: aircraft.airlineId,
          economyCapacity: aircraft.economyCapacity,
          businessCapacity: aircraft.businessCapacity,
          firstClassCapacity: aircraft.firstClassCapacity,
          totalCapacity: aircraft.totalCapacity,
          status: aircraft.status,
          currentAirport: aircraft.currentAirport,
          currentGate: aircraft.currentGate,
        },
      });
    } catch (error) {
      console.warn("Database aircraft create failed; stored in memory.", error);
    }
  }

  await logAuditEvent({
    actorId: actor?.id,
    actorName: actor?.name,
    action: "AIRCRAFT_CREATED",
    entity: "AIRCRAFT",
    entityId: aircraft.registration,
    after: { registration: aircraft.registration, model: aircraft.model },
  });

  return aircraft;
}

export async function updateAircraftStatus(
  registrationOrId: string,
  status: string,
  actor?: { id?: string; name?: string }
): Promise<AircraftDTO | null> {
  const norm = registrationOrId.trim().toUpperCase();
  const index = memoryAircraft.findIndex(
    (a) => a.registration.toUpperCase() === norm || a.id === registrationOrId
  );
  if (index === -1) return null;

  const previous = { ...memoryAircraft[index] };
  memoryAircraft[index] = {
    ...memoryAircraft[index],
    status,
  };

  if (shouldUseDatabase()) {
    try {
      await prisma.aircraft.updateMany({
        where: { registration: memoryAircraft[index].registration },
        data: { status },
      });
    } catch (err) {
      console.warn("Database aircraft status update failed; in-memory updated.", err);
    }
  }

  await logAuditEvent({
    actorId: actor?.id,
    actorName: actor?.name,
    action: "AIRCRAFT_STATUS_UPDATED",
    entity: "AIRCRAFT",
    entityId: memoryAircraft[index].registration,
    before: { status: previous.status },
    after: { status },
  });

  return memoryAircraft[index];
}

export async function listRunways(): Promise<RunwayDTO[]> {
  return memoryRunways;
}

export async function updateRunwayStatus(
  runwayIdOrCode: string,
  updates: Partial<RunwayDTO>,
  actor?: { id?: string; name?: string }
): Promise<RunwayDTO | null> {
  const index = memoryRunways.findIndex(
    (r) => r.id === runwayIdOrCode || r.code === runwayIdOrCode
  );
  if (index === -1) return null;

  const previous = { ...memoryRunways[index] };
  memoryRunways[index] = {
    ...memoryRunways[index],
    ...updates,
  };

  if (shouldUseDatabase()) {
    try {
      if (updates.status) {
        await prisma.airportResource.updateMany({
          where: { code: memoryRunways[index].code, resourceType: "RUNWAY" },
          data: { status: updates.status },
        });
      }
    } catch (err) {
      console.warn("Database runway status update failed; in-memory updated.", err);
    }
  }

  await logAuditEvent({
    actorId: actor?.id,
    actorName: actor?.name,
    action: "RUNWAY_UPDATED",
    entity: "RUNWAY",
    entityId: memoryRunways[index].code,
    before: previous as unknown as Record<string, unknown>,
    after: memoryRunways[index] as unknown as Record<string, unknown>,
  });

  return memoryRunways[index];
}

export async function listGates(): Promise<GateDTO[]> {
  return memoryGates;
}

export async function updateGateStatus(
  gateCodeOrId: string,
  status: GateDTO["status"],
  assignedFlightId?: string
) {
  memoryGates = memoryGates.map((g) =>
    g.code === gateCodeOrId || g.id === gateCodeOrId
      ? { ...g, status, assignedFlightId }
      : g
  );
  return memoryGates.find((g) => g.code === gateCodeOrId || g.id === gateCodeOrId);
}

