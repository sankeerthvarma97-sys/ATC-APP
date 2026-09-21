import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const port = Number.parseInt(process.env.PORT || "3000", 10);
const lifecycle = process.env.npm_lifecycle_event;
const dev = process.env.NODE_ENV !== "production" && lifecycle !== "start";
const app = next({ dev, hostname: "localhost", port });
const handle = app.getRequestHandler();
const tickMs = Number.parseInt(process.env.AOCC_SIMULATION_TICK_MS || "2500", 10);

const airport = {
  iata: "JFK",
  icao: "KJFK",
  name: "Kennedy International Simulation Field",
  latitude: 40.6413,
  longitude: -73.7781,
  fieldElevationFt: 13,
};

const disclaimer =
  "Educational airport-operations simulation only. Not certified aviation, dispatch, or air-traffic-control software.";

const user = {
  id: "usr-atc",
  name: "Evan Torres",
  email: "atc@aocc.test",
  role: "ATC",
  shift: "TOWER-E",
};

const iso = (offsetMinutes = 0) => new Date(Date.now() + offsetMinutes * 60_000).toISOString();

let flights = [
  {
    id: "flt-aal245",
    callsign: "AAL245",
    airline: "American",
    aircraftType: "B738",
    status: "APPROACH",
    phase: "ILS 04R established",
    origin: "KORD",
    destination: "KJFK",
    gate: "B24",
    runway: "04R",
    squawk: "4213",
    latitude: 40.405,
    longitude: -74.076,
    altitudeFt: 4200,
    speedKt: 188,
    headingDeg: 43,
    verticalSpeedFpm: -850,
    fuelKg: 5900,
    riskScore: 31,
    eta: iso(11),
    assignedController: { id: "usr-atc", name: "Evan Torres", role: "ATC" },
    updatedAt: iso(),
  },
  {
    id: "flt-dal88",
    callsign: "DAL88",
    airline: "Delta",
    aircraftType: "A21N",
    status: "TAXI_OUT",
    phase: "Holding short at Kilo",
    origin: "KJFK",
    destination: "KLAX",
    gate: "A12",
    runway: "04L",
    squawk: "5062",
    latitude: 40.6505,
    longitude: -73.792,
    altitudeFt: 0,
    speedKt: 18,
    headingDeg: 71,
    verticalSpeedFpm: 0,
    fuelKg: 18500,
    riskScore: 18,
    eta: iso(35),
    assignedController: { id: "usr-atc", name: "Evan Torres", role: "ATC" },
    updatedAt: iso(),
  },
  {
    id: "flt-baw112",
    callsign: "BAW112",
    airline: "British Airways",
    aircraftType: "B772",
    status: "AIRBORNE",
    phase: "Oceanic handoff pending",
    origin: "KJFK",
    destination: "EGLL",
    gate: "C3",
    runway: "31L",
    squawk: "2331",
    latitude: 40.842,
    longitude: -73.422,
    altitudeFt: 17600,
    speedKt: 342,
    headingDeg: 68,
    verticalSpeedFpm: 1600,
    fuelKg: 71200,
    riskScore: 24,
    eta: iso(382),
    assignedController: { id: "usr-atc", name: "Evan Torres", role: "ATC" },
    updatedAt: iso(),
  },
  {
    id: "flt-uae202",
    callsign: "UAE202",
    airline: "Emirates",
    aircraftType: "A388",
    status: "HOLDING",
    phase: "CAMRN hold, level 9000",
    origin: "OMDB",
    destination: "KJFK",
    gate: "A6",
    runway: "04R",
    squawk: "7702",
    latitude: 40.132,
    longitude: -73.416,
    altitudeFt: 9000,
    speedKt: 221,
    headingDeg: 286,
    verticalSpeedFpm: 0,
    fuelKg: 31800,
    riskScore: 62,
    eta: iso(23),
    assignedController: { id: "usr-atc", name: "Evan Torres", role: "ATC" },
    updatedAt: iso(),
  },
  {
    id: "flt-jbu431",
    callsign: "JBU431",
    airline: "JetBlue",
    aircraftType: "A320",
    status: "PUSHBACK",
    phase: "Ramp release requested",
    origin: "KJFK",
    destination: "KMCO",
    gate: "T5-18",
    runway: "04L",
    squawk: "3014",
    latitude: 40.6456,
    longitude: -73.7792,
    altitudeFt: 0,
    speedKt: 3,
    headingDeg: 180,
    verticalSpeedFpm: 0,
    fuelKg: 9800,
    riskScore: 12,
    eta: iso(158),
    assignedController: { id: "usr-atc", name: "Evan Torres", role: "ATC" },
    updatedAt: iso(),
  },
  {
    id: "flt-fdx901",
    callsign: "FDX901",
    airline: "FedEx",
    aircraftType: "B763",
    status: "EMERGENCY",
    phase: "Hydraulic caution, priority return",
    origin: "KJFK",
    destination: "KMEM",
    gate: "Cargo 7",
    runway: "04R",
    squawk: "7700",
    latitude: 40.822,
    longitude: -74.008,
    altitudeFt: 6500,
    speedKt: 242,
    headingDeg: 131,
    verticalSpeedFpm: -400,
    fuelKg: 26800,
    riskScore: 91,
    eta: iso(17),
    assignedController: { id: "usr-atc", name: "Evan Torres", role: "ATC" },
    updatedAt: iso(),
  },
];

let resources = [
  { id: "res-rwy-04l", resourceType: "RUNWAY", code: "04L", label: "Runway 04L departure stream", status: "OCCUPIED", metadata: { wind: "050/11", departures: 4 }, updatedAt: iso() },
  { id: "res-rwy-04r", resourceType: "RUNWAY", code: "04R", label: "Runway 04R arrival stream", status: "RESERVED", metadata: { wind: "050/11", arrivals: 6 }, updatedAt: iso() },
  { id: "res-gate-a12", resourceType: "GATE", code: "A12", label: "Gate A12", status: "OCCUPIED", metadata: { turnMinutes: 41 }, updatedAt: iso() },
  { id: "res-gate-b24", resourceType: "GATE", code: "B24", label: "Gate B24", status: "RESERVED", metadata: { inbound: "AAL245" }, updatedAt: iso() },
  { id: "res-crew-fire", resourceType: "CREW", code: "ARFF-1", label: "Emergency response standby", status: "RESERVED", metadata: { incident: "FDX901" }, updatedAt: iso() },
];

let events = [
  { id: "evt-emergency-fdx901", type: "EMERGENCY", severity: "CRITICAL", title: "FDX901 priority return", detail: "Aircraft declared simulated hydraulic caution. ARFF staged near 04R.", flightId: "flt-fdx901", createdAt: iso(-5) },
  { id: "evt-hold-uae202", type: "FLIGHT_UPDATE", severity: "WARNING", title: "Arrival hold building", detail: "UAE202 entered CAMRN hold due to spacing compression.", flightId: "flt-uae202", createdAt: iso(-11) },
  { id: "evt-runway-flow", type: "RESOURCE_CHANGE", severity: "ADVISORY", title: "Split runway flow active", detail: "04R arrivals and 04L departures are in effect for the simulation.", createdAt: iso(-18) },
];

let messages = [
  { id: "msg-fdx901-1", channel: "Tower", direction: "PILOT_TO_ATC", text: "Tower, FDX901 declaring simulated emergency, hydraulic caution, request priority return.", priority: "CRITICAL", flightId: "flt-fdx901", callsign: "FDX901", createdAt: iso(-6) },
  { id: "msg-aal245-1", channel: "Tower", direction: "ATC_TO_PILOT", text: "AAL245 continue approach runway 04R, traffic departing prior to arrival.", priority: "INFO", flightId: "flt-aal245", callsign: "AAL245", fromUser: { id: "usr-atc", name: "Evan Torres", role: "ATC" }, createdAt: iso(-4) },
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function capFeed(items, limit = 40) {
  return [...items].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, limit);
}

function metrics() {
  const activeFlights = flights.filter((flight) => !["AT_GATE", "CANCELLED", "DIVERTED"].includes(flight.status)).length;
  const airborne = flights.filter((flight) => flight.altitudeFt > 0).length;
  const arrivalsInWindow = flights.filter((flight) => flight.destination === airport.icao && flight.status !== "AT_GATE").length;
  const departuresInWindow = flights.filter((flight) => flight.origin === airport.icao && flight.status !== "AIRBORNE").length;
  const emergencyCount = flights.filter((flight) => flight.status === "EMERGENCY").length;
  const holdingCount = flights.filter((flight) => flight.status === "HOLDING").length;
  const runways = resources.filter((resource) => resource.resourceType === "RUNWAY");
  const runwayUtilization = Math.round((runways.filter((resource) => ["OCCUPIED", "RESERVED"].includes(resource.status)).length / Math.max(runways.length, 1)) * 100);
  const averageRisk = Math.round(flights.reduce((sum, flight) => sum + flight.riskScore, 0) / Math.max(flights.length, 1));
  const averageDelayMin = Math.round(flights.reduce((sum, flight) => sum + Math.max(0, flight.riskScore - 25) * 0.42, 0) / Math.max(flights.length, 1));
  return { activeFlights, airborne, arrivalsInWindow, departuresInWindow, emergencyCount, holdingCount, runwayUtilization, averageRisk, averageDelayMin, throughputPerHour: Math.max(12, Math.round(activeFlights * 5.8 - holdingCount * 1.7)) };
}

function snapshot() {
  return {
    generatedAt: iso(),
    airport,
    currentUser: user,
    flights,
    resources,
    events: capFeed(events, 32),
    messages: capFeed(messages, 28),
    metrics: metrics(),
    disclaimer,
  };
}

function advanceFlight(flight) {
  if (["AT_GATE", "CANCELLED", "DIVERTED", "SCHEDULED"].includes(flight.status)) {
    return { ...flight, updatedAt: iso() };
  }

  const seconds = tickMs / 1000;
  const headingRad = (flight.headingDeg * Math.PI) / 180;
  const nauticalMiles = (Math.max(flight.speedKt, 1) * seconds) / 3600;
  const latDelta = (Math.cos(headingRad) * nauticalMiles) / 60;
  const lonDelta = (Math.sin(headingRad) * nauticalMiles) / (60 * Math.cos((flight.latitude * Math.PI) / 180));
  let altitudeFt = flight.altitudeFt;
  let speedKt = flight.speedKt;
  let status = flight.status;
  let phase = flight.phase;
  let verticalSpeedFpm = flight.verticalSpeedFpm;
  let riskScore = flight.riskScore;

  if (status === "PUSHBACK" && speedKt > 5) {
    status = "TAXI_OUT";
    phase = "Taxi clearance in progress";
  }
  if (status === "DEPARTING") {
    altitudeFt = clamp(altitudeFt + Math.round((seconds / 60) * Math.max(verticalSpeedFpm, 900)), 0, 12000);
    speedKt = clamp(speedKt + 2, 80, 260);
    if (altitudeFt > 2200) {
      status = "AIRBORNE";
      phase = "Departure climb";
    }
  }
  if (status === "APPROACH" || status === "EMERGENCY") {
    altitudeFt = clamp(altitudeFt + Math.round((seconds / 60) * verticalSpeedFpm), 0, 45000);
    speedKt = clamp(speedKt - (altitudeFt < 1800 ? 2 : 0), 136, 260);
    if (altitudeFt <= 120 && status !== "EMERGENCY") {
      status = "LANDED";
      phase = "Runway rollout";
      speedKt = 82;
      verticalSpeedFpm = 0;
    }
  }
  if (status === "HOLDING") {
    riskScore = clamp(riskScore + 1, 0, 100);
  } else if (status !== "EMERGENCY") {
    riskScore = clamp(riskScore + (Math.random() > 0.72 ? 1 : -1), 8, 85);
  }

  return {
    ...flight,
    status,
    phase,
    latitude: Number((flight.latitude + latDelta).toFixed(5)),
    longitude: Number((flight.longitude + lonDelta).toFixed(5)),
    altitudeFt,
    speedKt,
    verticalSpeedFpm,
    riskScore,
    updatedAt: iso(),
  };
}

function applyCommand(command) {
  let event;
  flights = flights.map((flight) => {
    if (flight.id !== command.flightId) return flight;
    let next = flight;
    if (command.type === "ASSIGN_RUNWAY") next = { ...flight, runway: command.value, phase: `Assigned runway ${command.value}` };
    if (command.type === "ASSIGN_GATE") next = { ...flight, gate: command.value, phase: `Gate ${command.value} assigned` };
    if (command.type === "HOLD") next = { ...flight, status: "HOLDING", phase: command.note || "ATC hold instruction active", riskScore: clamp(flight.riskScore + 12, 0, 100) };
    if (command.type === "RELEASE_HOLD") next = { ...flight, status: "APPROACH", phase: command.note || "Released from hold", riskScore: clamp(flight.riskScore - 10, 0, 100) };
    if (command.type === "EXPEDITE") next = { ...flight, speedKt: clamp(flight.speedKt + 28, 0, 380), phase: command.note || "Expedite approved in simulation" };
    if (command.type === "CLEAR_TAKEOFF") next = { ...flight, status: "DEPARTING", speedKt: 112, verticalSpeedFpm: 1400, phase: `Cleared for takeoff ${flight.runway ?? ""}`.trim() };
    if (command.type === "CLEAR_LANDING") next = { ...flight, status: "APPROACH", phase: `Cleared to land ${flight.runway ?? ""}`.trim(), riskScore: clamp(flight.riskScore - 7, 0, 100) };
    if (command.type === "PUSHBACK_APPROVE") next = { ...flight, status: "PUSHBACK", speedKt: 4, phase: command.note || "Pushback and engine start approved" };
    if (command.type === "TAXI_CLEARANCE") next = { ...flight, status: "TAXI_OUT", speedKt: 18, phase: command.note || `Cleared to taxi to holding point RWY ${flight.runway ?? "04L"}` };
    if (command.type === "DECLARE_EMERGENCY") next = { ...flight, status: "EMERGENCY", squawk: "7700", phase: command.note || "Emergency declared in simulation", riskScore: 95 };
    if (command.type === "RESOLVE_EMERGENCY") next = { ...flight, status: flight.altitudeFt > 0 ? "APPROACH" : "LANDED", squawk: flight.squawk === "7700" ? "4210" : flight.squawk, phase: command.note || "Emergency condition resolved", riskScore: 41 };
    if (command.type === "DIVERT") next = { ...flight, status: "DIVERTED", destination: command.value || "KPHL", phase: `Diverting to ${command.value || "alternate"}` };
    next = { ...next, updatedAt: iso() };
    event = { id: `evt-${Date.now()}`, type: command.type === "DECLARE_EMERGENCY" ? "EMERGENCY" : "COMMAND", severity: command.type === "DECLARE_EMERGENCY" ? "CRITICAL" : "ADVISORY", title: `${next.callsign} ${command.type.toLowerCase().replaceAll("_", " ")}`, detail: command.note || "Command applied through Socket.IO.", flightId: next.id, payload: command, createdAt: iso() };
    return next;
  });
  if (event) events = capFeed([event, ...events], 64);
  return event;
}

await app.prepare();
const httpServer = createServer((req, res) => {
  handle(req, res);
});

const io = new Server(httpServer, {
  path: "/socket.io",
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  socket.emit("operations:snapshot", snapshot());

  socket.on("flight:command", (command) => {
    const event = applyCommand(command);
    const nextSnapshot = snapshot();
    if (event) io.emit("operations:event", event);
    io.emit("flight:command:ack", { ok: true, command, snapshot: nextSnapshot });
    io.emit("operations:snapshot", nextSnapshot);
  });

  socket.on("emergency:declare", ({ flightId, note }) => {
    const command = { flightId, type: "DECLARE_EMERGENCY", note: note || "Emergency declared from real-time panel" };
    const event = applyCommand(command);
    const nextSnapshot = snapshot();
    if (event) io.emit("operations:event", event);
    io.emit("notification", { severity: "CRITICAL", title: "Emergency declared", detail: note || "Emergency declared in simulation." });
    io.emit("operations:snapshot", nextSnapshot);
  });

  socket.on("radio:message", (input) => {
    const flight = flights.find((item) => item.id === input.flightId);
    const message = {
      id: `msg-${Date.now()}`,
      channel: input.channel || "Tower",
      direction: input.direction,
      text: input.text,
      priority: input.priority || "INFO",
      flightId: input.flightId,
      callsign: flight?.callsign,
      fromUser: input.direction === "ATC_TO_PILOT" ? user : undefined,
      createdAt: iso(),
    };
    messages = capFeed([message, ...messages], 64);
    io.emit("radio:message", message);
    io.emit("operations:snapshot", snapshot());
  });
});

setInterval(() => {
  flights = flights.map(advanceFlight);
  io.emit("flight:positions", flights);
  io.emit("metrics:update", metrics());
}, tickMs);

httpServer.listen(port, () => {
  console.log(`AOCC simulation server listening at http://localhost:${port}`);
});
