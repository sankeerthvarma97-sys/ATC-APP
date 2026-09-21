export const roles = [
  "ADMIN",
  "SUPER_ADMIN",
  "AIRPORT_ADMIN",
  "OPERATIONS_MANAGER",
  "SUPERVISOR",
  "ATC",
  "ATC_CONTROLLER",
  "SENIOR_ATC_CONTROLLER",
  "GROUND",
  "GROUND_OPERATOR",
  "AIRLINE_OPERATOR",
  "TICKETING_AGENT",
  "GATE_AGENT",
  "SECURITY_OFFICER",
  "BAGGAGE_STAFF",
  "MAINTENANCE_STAFF",
  "FLIGHT_DISPATCHER",
  "SIMULATOR_OPERATOR",
  "PILOT",
  "PASSENGER",
  "ANALYST",
  "VIEWER",
] as const;

export type Role = (typeof roles)[number];

export const permissions = [
  "VIEW_DASHBOARD",
  "VIEW_FLIGHTS",
  "CREATE_FLIGHT",
  "EDIT_FLIGHT",
  "CANCEL_FLIGHT",
  "VIEW_FLIGHT_STATUS",
  "VIEW_TRAFFIC",
  "CONTROL_ATC",
  "SEND_ATC_COMMAND",
  "VIEW_AIRCRAFT_POSITION",
  "MANAGE_AIRLINES",
  "MANAGE_AIRCRAFT",
  "MANAGE_GATES",
  "MANAGE_RUNWAYS",
  "MANAGE_TERMINALS",
  "VIEW_BOOKINGS",
  "CREATE_BOOKING",
  "MODIFY_BOOKING",
  "CANCEL_BOOKING",
  "VIEW_PASSENGERS",
  "CHECK_IN_PASSENGER",
  "BOARD_PASSENGER",
  "VERIFY_TICKET",
  "VIEW_TICKET",
  "CREATE_TICKET",
  "MANAGE_BAGGAGE",
  "MANAGE_GROUND_OPERATIONS",
  "MANAGE_STAFF",
  "CREATE_STAFF",
  "EDIT_STAFF",
  "VERIFY_STAFF",
  "SUSPEND_STAFF",
  "MANAGE_ROLES",
  "MANAGE_PERMISSIONS",
  "ASSIGN_ROLES",
  "ASSIGN_PERMISSIONS",
  "VIEW_ANALYTICS",
  "VIEW_AUDIT_LOGS",
  "MANAGE_EMERGENCIES",
  "MANAGE_SYSTEM_SETTINGS",
  "MANAGE_SIMULATOR",
  "SUPER_ADMIN_ALL_ACCESS",
] as const;

export type Permission = (typeof permissions)[number];

export const departments = [
  "AIR_TRAFFIC_CONTROL",
  "AIRPORT_OPERATIONS",
  "GROUND_OPERATIONS",
  "AIRLINE_OPERATIONS",
  "TICKETING",
  "PASSENGER_SERVICES",
  "SECURITY",
  "BAGGAGE",
  "MAINTENANCE",
  "EMERGENCY_RESPONSE",
  "ADMINISTRATION",
] as const;

export type DepartmentType = (typeof departments)[number];

export const employeeStatuses = [
  "ACTIVE",
  "OFFLINE",
  "ON_DUTY",
  "PENDING",
  "PENDING_VERIFICATION",
  "SUSPENDED",
  "DEACTIVATED",
] as const;

export type EmployeeStatus = (typeof employeeStatuses)[number];

export const verificationStatuses = ["PENDING", "VERIFIED", "REJECTED"] as const;
export type VerificationStatus = (typeof verificationStatuses)[number];

export const flightStatuses = [
  "SCHEDULED",
  "BOARDING",
  "PUSHBACK",
  "TAXI_OUT",
  "HOLDING",
  "DEPARTING",
  "AIRBORNE",
  "APPROACH",
  "LANDED",
  "TAXI_IN",
  "AT_GATE",
  "ARRIVED",
  "DELAYED",
  "DIVERTED",
  "CANCELLED",
  "EMERGENCY",
] as const;

export type FlightStatus = (typeof flightStatuses)[number];

export const severities = ["INFO", "ADVISORY", "WARNING", "CRITICAL"] as const;
export type Severity = (typeof severities)[number];

export const eventTypes = [
  "FLIGHT_UPDATE",
  "POSITION_UPDATE",
  "ATC_MESSAGE",
  "PILOT_MESSAGE",
  "RESOURCE_CHANGE",
  "COMMAND",
  "EMERGENCY",
  "NOTIFICATION",
  "AI_ANALYSIS",
  "FLIGHT_CREATED",
  "GATE_ASSIGNED",
  "RUNWAY_CHANGED",
  "BOOKING_CREATED",
  "TICKET_VERIFIED",
  "PASSENGER_CHECKED_IN",
  "PASSENGER_BOARDED",
  "EMPLOYEE_CREATED",
] as const;

export type EventType = (typeof eventTypes)[number];

export type MessageDirection = "ATC_TO_PILOT" | "PILOT_TO_ATC" | "SYSTEM";
export type ResourceType = "RUNWAY" | "GATE" | "STAND" | "BAGGAGE_BELT" | "CREW" | "VEHICLE";
export type ResourceStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE" | "CLOSED";
export type SeatClass = "ECONOMY" | "BUSINESS" | "FIRST";
export type SeatStatus = "AVAILABLE" | "SELECTED" | "RESERVED" | "OCCUPIED" | "BLOCKED";
export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "MODIFIED";
export type PaymentStatus = "PENDING" | "SUCCESSFUL" | "FAILED" | "REFUNDED";
export type CheckInStatus = "NOT_CHECKED_IN" | "CHECKED_IN";
export type BoardingStatus = "NOT_BOARDED" | "BOARDING" | "BOARDED";
export type TicketStatus = "ACTIVE" | "USED" | "CANCELLED" | "EXPIRED";
export type TicketVerificationResult =
  | "VALID"
  | "INVALID"
  | "CANCELLED"
  | "EXPIRED"
  | "ALREADY_USED"
  | "PAYMENT_FAILED"
  | "FLIGHT_CANCELLED";
export type BaggageStatus = "CHECKED" | "LOADED" | "TRANSIT" | "CLAIMED";

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: Role;
  shift?: string;
  airportCode?: string;
  permissions?: Permission[];
}

export interface EmployeeDTO {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone: string;
  department: DepartmentType;
  jobTitle: string;
  role: Role;
  airportCode: string;
  terminal?: string;
  gateArea?: string;
  shift: string;
  status: EmployeeStatus;
  verificationStatus: VerificationStatus;
  joinDate: string;
  lastLogin?: string;
  permissions: string[];
  userId?: string;
}

export interface AirportDTO {
  id: string;
  iata: string;
  icao: string;
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  elevationFt: number;
  status: string;
}

export interface TerminalDTO {
  id: string;
  airportId: string;
  code: string;
  name: string;
}

export interface RunwayDTO {
  id: string;
  airportId: string;
  code: string;
  headingDeg: number;
  lengthMeters: number;
  status: ResourceStatus;
  wind?: string;
  approachType?: string;
  surfaceCondition?: "DRY" | "WET" | "DAMP" | "CONTAMINATED";
  frictionMu?: number;
  ilsStatus?: "OPERATIONAL" | "DEGRADED" | "OFFLINE";
  lightingStatus?: "FULL" | "PARTIAL" | "OFF";
  activeConfig?: "DEPARTURES_ONLY" | "ARRIVALS_ONLY" | "MIXED_MODE" | "CLOSED";
}

export interface GateDTO {
  id: string;
  terminalId: string;
  code: string;
  status: ResourceStatus;
  assignedFlightId?: string;
  turnMinutes: number;
}

export interface AirlineDTO {
  id: string;
  name: string;
  iata: string;
  icao: string;
  logo?: string;
  country: string;
  contactPhone?: string;
  contactEmail?: string;
  status: string;
}

export interface AircraftDTO {
  id: string;
  registration: string;
  model: string;
  manufacturer: string;
  airlineId: string;
  airlineName?: string;
  economyCapacity: number;
  businessCapacity: number;
  firstClassCapacity: number;
  totalCapacity: number;
  status: string;
  currentAirport?: string;
  currentGate?: string;
  currentFlightId?: string;
}

export interface FlightDTO {
  id: string;
  callsign: string;
  airline: string;
  aircraftType: string;
  status: FlightStatus;
  phase: string;
  origin: string;
  destination: string;
  gate?: string;
  stand?: string;
  runway?: string;
  squawk: string;
  latitude: number;
  longitude: number;
  altitudeFt: number;
  speedKt: number;
  headingDeg: number;
  verticalSpeedFpm: number;
  fuelKg: number;
  riskScore: number;
  eta: string;
  assignedController?: Pick<UserDTO, "id" | "name" | "role">;
  flightNumber?: string;
  flightName?: string;
  airlineId?: string;
  aircraftId?: string;
  departureTime?: string;
  arrivalTime?: string;
  boardingTime?: string;
  checkInCloseTime?: string;
  terminal?: string;
  economyCapacity?: number;
  businessCapacity?: number;
  firstCapacity?: number;
  economyFare?: number;
  businessFare?: number;
  firstFare?: number;
  availableSeats?: number;
  updatedAt: string;
}

export interface SeatDTO {
  id: string;
  flightId: string;
  seatNumber: string;
  seatClass: SeatClass;
  status: SeatStatus;
  passengerId?: string;
  bookingId?: string;
  price?: number;
}

export interface PassengerDTO {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  gender?: string;
  nationality: string;
  idNumber?: string;
}

export interface BookingDTO {
  id: string;
  pnr: string;
  flightId: string;
  flightNumber?: string;
  flightCallsign?: string;
  origin?: string;
  destination?: string;
  departureTime?: string;
  airline?: string;
  aircraft?: string;
  passengerId: string;
  passengerName?: string;
  passengerEmail?: string;
  passengerPhone?: string;
  seatNumber: string;
  travelClass: SeatClass;
  fare: number;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  checkInStatus: CheckInStatus;
  boardingStatus: BoardingStatus;
  verificationStatus: VerificationStatus;
  gate?: string;
  terminal?: string;
  ticketNumber?: string;
  qrCode?: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketDTO {
  id: string;
  bookingId: string;
  ticketNumber: string;
  pnr: string;
  qrCode: string;
  issuedAt: string;
  status: TicketStatus;
}

export interface BoardingPassDTO {
  id: string;
  bookingId: string;
  passNumber: string;
  pnr: string;
  passengerName: string;
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  date: string;
  seatNumber: string;
  gate?: string;
  terminal?: string;
  boardingTime?: string;
  departureTime?: string;
  boardingGroup: string;
  seatClass?: string;
  qrCode: string;
  status: BoardingStatus;
}

export interface CheckInDTO {
  id: string;
  bookingId: string;
  pnr: string;
  checkedInAt: string;
  checkedInBy?: string;
  seatConfirmed: boolean;
  baggageCount: number;
  baggageWeightKg: number;
  boardingPass?: BoardingPassDTO;
}

export interface BaggageDTO {
  id: string;
  bookingId: string;
  tagNumber: string;
  weightKg: number;
  status: BaggageStatus;
  createdAt: string;
}

export interface PaymentDTO {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  method: string;
  transactionRef: string;
  status: PaymentStatus;
  createdAt: string;
}

export interface AuditLogDTO {
  id: string;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  action: string;
  entity: string;
  entityType?: string;
  entityId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  details?: Record<string, unknown>;
  ip?: string;
  createdAt: string;
}

export interface AirportResourceDTO {
  id: string;
  resourceType: ResourceType;
  code: string;
  label: string;
  status: ResourceStatus;
  metadata?: Record<string, string | number | boolean>;
  updatedAt: string;
}

export interface OperationalEventDTO {
  id: string;
  type: EventType;
  severity: Severity;
  title: string;
  detail: string;
  payload?: Record<string, unknown>;
  flightId?: string;
  userId?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface RadioMessageDTO {
  id: string;
  channel: string;
  direction: MessageDirection;
  text: string;
  priority: Severity;
  createdAt: string;
  fromUser?: Pick<UserDTO, "id" | "name" | "role">;
  flightId?: string;
  callsign?: string;
}

export interface AirportMetrics {
  activeFlights: number;
  airborne: number;
  arrivalsInWindow: number;
  departuresInWindow: number;
  emergencyCount: number;
  holdingCount: number;
  runwayUtilization: number;
  averageRisk: number;
  averageDelayMin: number;
  throughputPerHour: number;
  totalBookings?: number;
  todayPassengers?: number;
  availableGates?: number;
  occupiedGates?: number;
  activeControllers?: number;
  activeGroundStaff?: number;
}

export interface OperationsSnapshot {
  generatedAt: string;
  airport: {
    iata: string;
    icao: string;
    name: string;
    latitude: number;
    longitude: number;
    fieldElevationFt: number;
  };
  currentUser: UserDTO;
  flights: FlightDTO[];
  resources: AirportResourceDTO[];
  events: OperationalEventDTO[];
  messages: RadioMessageDTO[];
  metrics: AirportMetrics;
  disclaimer: string;
}

export type FlightCommandType =
  | "ASSIGN_RUNWAY"
  | "ASSIGN_GATE"
  | "HOLD"
  | "RELEASE_HOLD"
  | "EXPEDITE"
  | "CLEAR_TAKEOFF"
  | "CLEAR_LANDING"
  | "DECLARE_EMERGENCY"
  | "RESOLVE_EMERGENCY"
  | "DIVERT"
  | "PUSHBACK_APPROVE"
  | "TAXI_CLEARANCE";

export interface FlightCommandInput {
  flightId: string;
  type: FlightCommandType;
  value?: string;
  note?: string;
}

export interface RadioMessageInput {
  flightId: string;
  text: string;
  direction: MessageDirection;
  priority?: Severity;
  channel?: string;
}

export interface AiBriefingRequest {
  focus: "airport" | "delays" | "emergencies" | "staffing" | "runways";
  question: string;
}

export interface AiBriefingResponse {
  model: string;
  simulated: boolean;
  briefing: string;
  actions: string[];
  risk: Severity;
}

