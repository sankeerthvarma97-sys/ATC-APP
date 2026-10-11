import "dotenv/config";
import { FlightStatus, Permission, Prisma, PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import {
  createInitialEvents,
  createInitialFlights,
  createInitialMessages,
  createInitialResources,
  demoUsers,
} from "../src/lib/data/mock";
import { initialAirports, initialAirlines, initialAircraft } from "../src/lib/services/fleet-service";
import { generateSeatsForFlight } from "../src/lib/services/flight-service";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }),
});

const defaultPassword = "AoccDemo!2026";

const simulationRoutes = [
  { callsign: "SC101", flightNumber: "SC101", airline: "SkyConnect Airlines", aircraft: "Airbus A320neo", from: "HYD", to: "BOM", dur: 90, dep: 45, gate: "B12", rwy: "09L", fare: 4500, status: "SCHEDULED" },
  { callsign: "SC103", flightNumber: "SC103", airline: "SkyConnect Airlines", aircraft: "Airbus A321neo", from: "HYD", to: "DEL", dur: 130, dep: 90, gate: "A4", rwy: "09L", fare: 5400, status: "SCHEDULED" },
  { callsign: "AV201", flightNumber: "AV201", airline: "AeroVista", aircraft: "Boeing 737-800", from: "HYD", to: "BLR", dur: 70, dep: 60, gate: "C2", rwy: "09R", fare: 3800, status: "SCHEDULED" },
  { callsign: "BH301", flightNumber: "BH301", airline: "Blue Horizon Air", aircraft: "Airbus A320", from: "HYD", to: "MAA", dur: 75, dep: 75, gate: "B6", rwy: "09L", fare: 4100, status: "SCHEDULED" },
  { callsign: "NV401", flightNumber: "NV401", airline: "Nova Airways", aircraft: "Airbus A321", from: "HYD", to: "CCU", dur: 130, dep: 110, gate: "A10", rwy: "09L", fare: 5900, status: "SCHEDULED" },
  { callsign: "SC105", flightNumber: "SC105", airline: "SkyConnect Airlines", aircraft: "Airbus A320neo", from: "HYD", to: "COK", dur: 115, dep: 130, gate: "B12", rwy: "09R", fare: 4700, status: "SCHEDULED" },
  { callsign: "AV203", flightNumber: "AV203", airline: "AeroVista", aircraft: "Boeing 737-800", from: "HYD", to: "GOI", dur: 75, dep: 50, gate: "C1", rwy: "09L", fare: 3900, status: "BOARDING" },
  { callsign: "BH303", flightNumber: "BH303", airline: "Blue Horizon Air", aircraft: "Airbus A320", from: "HYD", to: "PNQ", dur: 75, dep: 80, gate: "B4", rwy: "09L", fare: 4300, status: "SCHEDULED" },
  { callsign: "NV403", flightNumber: "NV403", airline: "Nova Airways", aircraft: "Airbus A321", from: "HYD", to: "AMD", dur: 115, dep: 100, gate: "A12", rwy: "09R", fare: 4600, status: "SCHEDULED" },
  { callsign: "SC107", flightNumber: "SC107", airline: "SkyConnect Airlines", aircraft: "Airbus A320neo", from: "HYD", to: "JAI", dur: 125, dep: 140, gate: "B24", rwy: "09L", fare: 5100, status: "SCHEDULED" },
  { callsign: "IS503", flightNumber: "IS503", airline: "IndianSky Simulation Airlines", aircraft: "Boeing 737-800", from: "HYD", to: "VTZ", dur: 65, dep: 40, gate: "A2", rwy: "09L", fare: 2900, status: "SCHEDULED" },
  { callsign: "AV205", flightNumber: "AV205", airline: "AeroVista", aircraft: "Airbus A320neo", from: "HYD", to: "TIR", dur: 60, dep: 35, gate: "C3", rwy: "09R", fare: 2600, status: "SCHEDULED" },
  { callsign: "BH307", flightNumber: "BH307", airline: "Blue Horizon Air", aircraft: "Airbus A320", from: "HYD", to: "LKO", dur: 120, dep: 120, gate: "B8", rwy: "09L", fare: 4900, status: "SCHEDULED" },
  { callsign: "NV405", flightNumber: "NV405", airline: "Nova Airways", aircraft: "Airbus A321", from: "HYD", to: "BBI", dur: 110, dep: 95, gate: "A6", rwy: "09R", fare: 4200, status: "SCHEDULED" },
  { callsign: "AV202", flightNumber: "AV202", airline: "AeroVista", aircraft: "Boeing 737-800", from: "DEL", to: "BLR", dur: 160, dep: 60, gate: "C2", rwy: "28", fare: 5200, status: "SCHEDULED" },
  { callsign: "BH305", flightNumber: "BH305", airline: "Blue Horizon Air", aircraft: "Airbus A320", from: "MAA", to: "CCU", dur: 135, dep: 30, gate: "B6", rwy: "07", fare: 4800, status: "BOARDING" },
  { callsign: "NV412", flightNumber: "NV412", airline: "Nova Airways", aircraft: "Airbus A321", from: "COK", to: "GOI", dur: 70, dep: 15, gate: "B2", rwy: "27", fare: 3600, status: "PUSHBACK" },
  { callsign: "SC104", flightNumber: "SC104", airline: "SkyConnect Airlines", aircraft: "Airbus A320neo", from: "PNQ", to: "DEL", dur: 125, dep: 90, gate: "A1", rwy: "10", fare: 4200, status: "SCHEDULED" },
  { callsign: "AV210", flightNumber: "AV210", airline: "AeroVista", aircraft: "Boeing 737-800", from: "BLR", to: "AMD", dur: 130, dep: 120, gate: "D1", rwy: "09", fare: 4600, status: "SCHEDULED" },
  { callsign: "BH315", flightNumber: "BH315", airline: "Blue Horizon Air", aircraft: "Airbus A320", from: "JAI", to: "HYD", dur: 110, dep: 75, gate: "A3", rwy: "15", fare: 4100, status: "SCHEDULED" },
  { callsign: "NV420", flightNumber: "NV420", airline: "Nova Airways", aircraft: "Airbus A321", from: "BOM", to: "MAA", dur: 115, dep: 140, gate: "A4", rwy: "27", fare: 4400, status: "SCHEDULED" },
  { callsign: "SC112", flightNumber: "SC112", airline: "SkyConnect Airlines", aircraft: "Airbus A320neo", from: "CCU", to: "COK", dur: 165, dep: 180, gate: "B4", rwy: "01R", fare: 5900, status: "SCHEDULED" },
  { callsign: "AV225", flightNumber: "AV225", airline: "AeroVista", aircraft: "Boeing 737-800", from: "GOI", to: "BLR", dur: 65, dep: 40, gate: "C1", rwy: "08", fare: 3200, status: "BOARDING" },
];

async function main() {
  console.log("Seeding AOCC Phase 2 database...");

  // 1. Seed Users
  const defaultPasswordHash = await hash(defaultPassword, 12);
  const superAdminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD || "dev-bootstrap-admin-password";
  const superAdminPasswordHash = await hash(superAdminPassword, 12);

  const extraUsers = [
    { id: "usr-super", name: "Super Administrator", email: "superadmin@aocc.test", role: "SUPER_ADMIN" as const, shift: "EXEC" },
    { id: "usr-opsmgr", name: "Suresh Menon", email: "ops@aocc.test", role: "OPERATIONS_MANAGER" as const, shift: "OPS-A" },
    { id: "usr-ticket", name: "Karan Sharma", email: "ticket@aocc.test", role: "TICKETING_AGENT" as const, shift: "MORNING" },
    { id: "usr-gate", name: "Ananya Desai", email: "gate@aocc.test", role: "GATE_AGENT" as const, shift: "EVENING" },
    { id: "usr-dispatch", name: "Vikram Sen", email: "dispatch@aocc.test", role: "FLIGHT_DISPATCHER" as const, shift: "NIGHT" },
  ];

  for (const user of [...demoUsers, ...extraUsers]) {
    const isSuperAdminUser = user.email.toLowerCase() === "admin@gmail.com" || user.email.toLowerCase() === (process.env.ADMIN_BOOTSTRAP_EMAIL || "admin@gmail.com").toLowerCase();
    const hashToUse = isSuperAdminUser ? superAdminPasswordHash : defaultPasswordHash;

    const isAdmin =
      user.role === "SUPER_ADMIN" ||
      user.role === "ADMIN" ||
      user.role === "AIRPORT_ADMIN" ||
      user.email.toLowerCase().includes("admin");
    const initialCredit = isAdmin ? 600_000_000_000.0 : 10_000.0;

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        shift: user.shift,
        passwordHash: hashToUse,
        creditBalance: initialCredit,
      },
      create: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        shift: user.shift,
        passwordHash: hashToUse,
        creditBalance: initialCredit,
      },
    });
  }

  // 2. Seed Airports
  for (const apt of initialAirports) {
    await prisma.airport.upsert({
      where: { iata: apt.iata },
      update: {
        icao: apt.icao,
        name: apt.name,
        city: apt.city,
        country: apt.country,
        latitude: apt.latitude,
        longitude: apt.longitude,
        elevationFt: apt.elevationFt,
        status: apt.status,
      },
      create: {
        id: apt.id,
        iata: apt.iata,
        icao: apt.icao,
        name: apt.name,
        city: apt.city,
        country: apt.country,
        latitude: apt.latitude,
        longitude: apt.longitude,
        elevationFt: apt.elevationFt,
        status: apt.status,
      },
    });
  }

  // 3. Seed Airlines
  for (const air of initialAirlines) {
    await prisma.airline.upsert({
      where: { iata: air.iata },
      update: {
        name: air.name,
        icao: air.icao,
        logo: air.logo,
        country: air.country,
        contactEmail: air.contactEmail,
        contactPhone: air.contactPhone,
        status: air.status,
      },
      create: {
        id: air.id,
        name: air.name,
        iata: air.iata,
        icao: air.icao,
        logo: air.logo,
        country: air.country,
        contactEmail: air.contactEmail,
        contactPhone: air.contactPhone,
        status: air.status,
      },
    });
  }

  // 4. Seed Aircraft
  for (const ac of initialAircraft) {
    await prisma.aircraft.upsert({
      where: { registration: ac.registration },
      update: {
        model: ac.model,
        manufacturer: ac.manufacturer,
        airlineId: ac.airlineId,
        economyCapacity: ac.economyCapacity,
        businessCapacity: ac.businessCapacity,
        firstClassCapacity: ac.firstClassCapacity,
        totalCapacity: ac.totalCapacity,
        status: ac.status,
        currentAirport: ac.currentAirport,
        currentGate: ac.currentGate,
      },
      create: {
        id: ac.id,
        registration: ac.registration,
        model: ac.model,
        manufacturer: ac.manufacturer,
        airlineId: ac.airlineId,
        economyCapacity: ac.economyCapacity,
        businessCapacity: ac.businessCapacity,
        firstClassCapacity: ac.firstClassCapacity,
        totalCapacity: ac.totalCapacity,
        status: ac.status,
        currentAirport: ac.currentAirport,
        currentGate: ac.currentGate,
      },
    });
  }

  // 5. Seed Employees across departments
  const demoEmployees = [
    { empId: "EMP-0001", name: "Permanent Super Admin", email: process.env.ADMIN_BOOTSTRAP_EMAIL || "admin@gmail.com", dept: "ADMINISTRATION" as const, title: "Airport Authority System Owner", role: "SUPER_ADMIN" as const, apt: "HYD", shift: "ALL", permissions: ["SUPER_ADMIN_ALL_ACCESS"] },
    { empId: "EMP-1001", name: "Maya Rao", email: "admin@aocc.test", dept: "ADMINISTRATION" as const, title: "Operations Director", role: "ADMIN" as const, apt: "HYD", shift: "OPS-A", permissions: ["VIEW_DASHBOARD", "CREATE_FLIGHT", "MANAGE_STAFF"] },
    { empId: "EMP-1002", name: "Evan Torres", email: "atc@aocc.test", dept: "AIR_TRAFFIC_CONTROL" as const, title: "Senior Tower Controller", role: "ATC" as const, apt: "HYD", shift: "TOWER-E", permissions: ["CONTROL_ATC", "VIEW_TRAFFIC", "MANAGE_EMERGENCIES"] },
    { empId: "EMP-1003", name: "Priya Nair", email: "ground@aocc.test", dept: "GROUND_OPERATIONS" as const, title: "Ramp Supervisor", role: "GROUND" as const, apt: "HYD", shift: "RAMP-2", permissions: ["MANAGE_GROUND_OPERATIONS", "MANAGE_GATES"] },
    { empId: "EMP-1004", name: "Karan Sharma", email: "ticket@aocc.test", dept: "TICKETING" as const, title: "Ticketing Supervisor", role: "TICKETING_AGENT" as const, apt: "HYD", shift: "MORNING", permissions: ["CREATE_BOOKING", "VERIFY_TICKET", "CHECK_IN_PASSENGER"] },
    { empId: "EMP-1005", name: "Ananya Desai", email: "gate@aocc.test", dept: "PASSENGER_SERVICES" as const, title: "Gate Agent Lead", role: "GATE_AGENT" as const, apt: "HYD", shift: "EVENING", permissions: ["VERIFY_TICKET", "CHECK_IN_PASSENGER", "BOARD_PASSENGER"] },
    { empId: "EMP-1006", name: "Rajesh Kumar", email: "security@aocc.test", dept: "SECURITY" as const, title: "Chief Security Officer", role: "SECURITY_OFFICER" as const, apt: "HYD", shift: "ROTATING", permissions: ["VIEW_DASHBOARD", "VERIFY_TICKET", "MANAGE_EMERGENCIES"] },
    { empId: "EMP-1007", name: "Amitava Ghosh", email: "baggage@aocc.test", dept: "BAGGAGE" as const, title: "Baggage Handling Lead", role: "BAGGAGE_STAFF" as const, apt: "HYD", shift: "MORNING", permissions: ["VIEW_DASHBOARD", "MANAGE_GROUND_OPERATIONS"] },
    { empId: "EMP-1008", name: "Sunil Joshi", email: "maint@aocc.test", dept: "MAINTENANCE" as const, title: "Airfield Maintenance Tech", role: "MAINTENANCE_STAFF" as const, apt: "HYD", shift: "NIGHT", permissions: ["VIEW_DASHBOARD", "MANAGE_AIRCRAFT", "MANAGE_RUNWAYS"] },
    { empId: "EMP-1009", name: "Vikram Sen", email: "dispatch@aocc.test", dept: "AIRLINE_OPERATIONS" as const, title: "Flight Dispatcher", role: "FLIGHT_DISPATCHER" as const, apt: "HYD", shift: "NIGHT", permissions: ["VIEW_DASHBOARD", "CREATE_FLIGHT", "MANAGE_AIRCRAFT"] },
  ];

  for (const emp of demoEmployees) {
    await prisma.employee.upsert({
      where: { employeeId: emp.empId },
      update: {
        fullName: emp.name,
        email: emp.email,
        department: emp.dept,
        jobTitle: emp.title,
        role: emp.role,
        airportCode: emp.apt,
        shift: emp.shift,
        permissions: emp.permissions,
      },
      create: {
        id: `emp-${emp.empId.toLowerCase()}`,
        employeeId: emp.empId,
        fullName: emp.name,
        email: emp.email,
        phone: "+91 98000 11000",
        department: emp.dept,
        jobTitle: emp.title,
        role: emp.role,
        airportCode: emp.apt,
        terminal: emp.role === "SUPER_ADMIN" ? "ALL" : "T1",
        gateArea: emp.role === "SUPER_ADMIN" ? "ALL" : "Main Concourse",
        shift: emp.shift,
        status: "ACTIVE",
        verificationStatus: "VERIFIED",
        permissions: emp.permissions,
      },
    });
  }

  // 5.5 Seed RolePermissions
  console.log("Seeding RolePermissions...");
  const { rolePermissionMap } = await import("../src/lib/auth/permissions");
  const rolePermRecords: { role: Role; permission: Permission }[] = [];
  for (const [roleName, perms] of Object.entries(rolePermissionMap)) {
    for (const perm of perms) {
      rolePermRecords.push({
        role: roleName as Role,
        permission: perm as Permission,
      });
    }
  }
  await prisma.rolePermission.createMany({
    data: rolePermRecords,
    skipDuplicates: true,
  });
  console.log(`Seeded ${rolePermRecords.length} role permissions.`);

  // 6. Seed Simulation Flights & Seats
  for (const r of simulationRoutes) {
    const flightId = `flt-${r.callsign.toLowerCase()}`;
    const depTime = new Date(Date.now() + r.dep * 60_000);
    const arrTime = new Date(depTime.getTime() + r.dur * 60_000);

    const apt = initialAirports.find((a) => a.iata === r.from) ?? initialAirports[0];

    const flight = await prisma.flight.upsert({
      where: { callsign: r.callsign },
      update: {
        flightNumber: r.flightNumber,
        flightName: `${r.airline} ${r.flightNumber}`,
        airline: r.airline,
        aircraftType: r.aircraft,
        status: r.status as FlightStatus,
        phase: r.status === "AIRBORNE" ? "Cruising FL340" : r.status === "BOARDING" ? "Passenger Boarding" : "Scheduled",
        origin: r.from,
        destination: r.to,
        gate: r.gate,
        stand: r.gate,
        runway: r.rwy,
        departureTime: depTime,
        arrivalTime: arrTime,
        economyCapacity: 150,
        businessCapacity: 20,
        firstCapacity: 0,
        economyFare: r.fare,
        businessFare: Math.round(r.fare * 1.9),
        firstFare: Math.round(r.fare * 3.5),
      },
      create: {
        id: flightId,
        callsign: r.callsign,
        flightNumber: r.flightNumber,
        flightName: `${r.airline} ${r.flightNumber}`,
        airline: r.airline,
        aircraftType: r.aircraft,
        status: r.status as FlightStatus,
        phase: r.status === "AIRBORNE" ? "Cruising FL340" : r.status === "BOARDING" ? "Passenger Boarding" : "Scheduled",
        origin: r.from,
        destination: r.to,
        gate: r.gate,
        stand: r.gate,
        runway: r.rwy,
        squawk: Math.floor(1000 + Math.random() * 6700).toString(),
        latitude: apt.latitude,
        longitude: apt.longitude,
        altitudeFt: r.status === "AIRBORNE" ? 34000 : 0,
        speedKt: r.status === "AIRBORNE" ? 450 : 0,
        headingDeg: 90,
        verticalSpeedFpm: 0,
        fuelKg: 10000,
        riskScore: 12,
        eta: arrTime,
        departureTime: depTime,
        arrivalTime: arrTime,
        boardingTime: new Date(depTime.getTime() - 25 * 60_000),
        checkInCloseTime: new Date(depTime.getTime() - 15 * 60_000),
        terminal: "T1",
        economyCapacity: 150,
        businessCapacity: 20,
        firstCapacity: 0,
        economyFare: r.fare,
        businessFare: Math.round(r.fare * 1.9),
        firstFare: Math.round(r.fare * 3.5),
      },
    });

    // Generate seats (batch insert)
    const seats = generateSeatsForFlight(flight.id, 150, 20, 0);
    await prisma.seat.createMany({
      data: seats.map((seat) => ({
        id: seat.id,
        flightId: flight.id,
        seatNumber: seat.seatNumber,
        seatClass: seat.seatClass,
        status: seat.status,
      })),
      skipDuplicates: true,
    });
  }
  console.log("Seeded simulation routes and seats.");

  // 7. Seed Legacy JFK Flights for simulator consistency
  for (const flight of createInitialFlights()) {
    await prisma.flight.upsert({
      where: { callsign: flight.callsign },
      update: {
        airline: flight.airline,
        aircraftType: flight.aircraftType,
        status: flight.status as FlightStatus,
        phase: flight.phase,
        origin: flight.origin,
        destination: flight.destination,
        gate: flight.gate,
        stand: flight.stand,
        runway: flight.runway,
        squawk: flight.squawk,
        latitude: flight.latitude,
        longitude: flight.longitude,
        altitudeFt: flight.altitudeFt,
        speedKt: flight.speedKt,
        headingDeg: flight.headingDeg,
        verticalSpeedFpm: flight.verticalSpeedFpm,
        fuelKg: flight.fuelKg,
        riskScore: flight.riskScore,
        eta: new Date(flight.eta),
      },
      create: {
        id: flight.id,
        callsign: flight.callsign,
        airline: flight.airline,
        aircraftType: flight.aircraftType,
        status: flight.status as FlightStatus,
        phase: flight.phase,
        origin: flight.origin,
        destination: flight.destination,
        gate: flight.gate,
        stand: flight.stand,
        runway: flight.runway,
        squawk: flight.squawk,
        latitude: flight.latitude,
        longitude: flight.longitude,
        altitudeFt: flight.altitudeFt,
        speedKt: flight.speedKt,
        headingDeg: flight.headingDeg,
        verticalSpeedFpm: flight.verticalSpeedFpm,
        fuelKg: flight.fuelKg,
        riskScore: flight.riskScore,
        eta: new Date(flight.eta),
      },
    });
  }

  // 8. Seed Airport Resources
  for (const resource of createInitialResources()) {
    await prisma.airportResource.upsert({
      where: {
        resourceType_code: {
          resourceType: resource.resourceType,
          code: resource.code,
        },
      },
      update: {
        label: resource.label,
        status: resource.status,
        metadata: resource.metadata ?? undefined,
      },
      create: {
        id: resource.id,
        resourceType: resource.resourceType,
        code: resource.code,
        label: resource.label,
        status: resource.status,
        metadata: resource.metadata ?? undefined,
      },
    });
  }

  // 9. Seed Operational Events
  for (const event of createInitialEvents()) {
    await prisma.operationalEvent.upsert({
      where: { id: event.id },
      update: {},
      create: {
        id: event.id,
        type: event.type,
        severity: event.severity,
        title: event.title,
        detail: event.detail,
        payload: event.payload as Prisma.InputJsonValue | undefined,
        flightId: event.flightId,
        userId: event.userId,
        createdAt: new Date(event.createdAt),
      },
    });
  }

  // 10. Seed Radio Messages
  for (const message of createInitialMessages()) {
    await prisma.radioMessage.upsert({
      where: { id: message.id },
      update: {},
      create: {
        id: message.id,
        channel: message.channel,
        direction: message.direction,
        text: message.text,
        priority: message.priority,
        createdAt: new Date(message.createdAt),
        flightId: message.flightId,
        fromUserId: message.fromUser?.id,
      },
    });
  }

  // 11. Seed a sample Passenger & Booking
  const demoPassenger = await prisma.passenger.upsert({
    where: { id: "psg-demo-1" },
    update: {},
    create: {
      id: "psg-demo-1",
      fullName: "Rahul Varma",
      email: "rahul.varma@sim.test",
      phone: "+91 98234 56789",
      dateOfBirth: "1992-05-14",
      gender: "Male",
      nationality: "IN",
      idNumber: "A9812401",
    },
  });

  const demoFlight = await prisma.flight.findUnique({ where: { callsign: "SC101" } });
  if (demoFlight) {
    const demoBooking = await prisma.booking.upsert({
      where: { pnr: "SC7K92P" },
      update: {},
      create: {
        id: "bkg-demo-1",
        pnr: "SC7K92P",
        flightId: demoFlight.id,
        passengerId: demoPassenger.id,
        seatNumber: "14A",
        travelClass: "ECONOMY",
        fare: 4500,
        paymentStatus: "SUCCESSFUL",
        bookingStatus: "CONFIRMED",
        checkInStatus: "CHECKED_IN",
        boardingStatus: "NOT_BOARDED",
        verificationStatus: "VERIFIED",
      },
    });

    await prisma.ticket.upsert({
      where: { ticketNumber: "ET-2026-90124" },
      update: {},
      create: {
        id: "tkt-demo-1",
        bookingId: demoBooking.id,
        ticketNumber: "ET-2026-90124",
        pnr: "SC7K92P",
        qrCode: "AOCC|PNR:SC7K92P|FLT:SC101|SEAT:14A|PSG:Rahul Varma",
        status: "ACTIVE",
      },
    });

    await prisma.boardingPass.upsert({
      where: { bookingId: demoBooking.id },
      update: {},
      create: {
        id: "bp-demo-1",
        bookingId: demoBooking.id,
        passNumber: "BP-SC7K92P-14A",
        seatNumber: "14A",
        gate: "B12",
        terminal: "T1",
        boardingGroup: "Group 2",
        qrCode: "AOCC-BP|PNR:SC7K92P|SEAT:14A",
        status: "NOT_BOARDED",
      },
    });
  }

  console.log("AOCC Phase 2 database seeded successfully!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
