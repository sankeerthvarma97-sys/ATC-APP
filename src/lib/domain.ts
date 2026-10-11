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
  "VIEW_FINANCE",
  "VIEW_ACCOUNTS",
  "VIEW_TRANSACTIONS",
  "MANAGE_ACCOUNTS",
  "MANAGE_EXPENSES",
  "MANAGE_PAYROLL",
  "CREATE_PAYROLL",
  "APPROVE_PAYROLL",
  "PROCESS_PAYROLL",
  "MANAGE_SALARY",
  "MANAGE_SALARY_HIKES",
  "MANAGE_BONUSES",
  "MANAGE_DEDUCTIONS",
  "MANAGE_REFUNDS",
  "MANAGE_CREDITS",
  "VIEW_FINANCIAL_REPORTS",
  "VIEW_EMPLOYEE_ACCOUNTS",
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

export const gatePassTypes = ["VISITOR", "CREW", "CONTRACTOR", "VIP", "TEMPORARY_STAFF"] as const;
export type GatePassType = (typeof gatePassTypes)[number];

export const securityZones = [
  "ZONE_A_PUBLIC",      // Public Terminal & Check-in Area
  "ZONE_B_SECURITY",    // Security Sterile Area
  "ZONE_C_BOARDING",    // Boarding Gates & Aerobridges
  "ZONE_D_RAMP",        // Airside Ramp, Apron & Baggage Makeup
  "ZONE_E_ATC",         // Air Traffic Control Tower & Radar Cab
] as const;
export type SecurityZone = (typeof securityZones)[number];

export const gatePassStatuses = ["ACTIVE", "EXPIRED", "REVOKED", "SUSPENDED"] as const;
export type GatePassStatus = (typeof gatePassStatuses)[number];

export interface TurnstileScanEntry {
  id: string;
  timestamp: string;
  turnstileId: string;
  turnstileName: string;
  zone: SecurityZone;
  direction: "ENTRY" | "EXIT";
  granted: boolean;
  reason: string;
  passNumber: string;
  holderName: string;
  organization: string;
  officerId?: string;
}

export interface GatePassDTO {
  id: string;
  passNumber: string;
  passType: GatePassType;
  holderName: string;
  idNumber: string;
  organization: string;
  airportCode: string;
  terminal: string;
  authorizedZones: SecurityZone[];
  validFrom: string;
  validUntil: string;
  status: GatePassStatus;
  escortRequired: boolean;
  purpose: string;
  issuedBy: string;
  issuedById?: string;
  qrCode: string;
  createdAt: string;
  updatedAt: string;
  accessLogs: TurnstileScanEntry[];
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: Role;
  shift?: string;
  airportCode?: string;
  creditBalance?: number;
  permissions?: Permission[];
  mustChangePassword?: boolean;
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
  isVirtual?: boolean;
  currentTask?: string;
  currentLocation?: string;
  performanceScore?: number;
  tasksCompleted?: number;
  tasksFailed?: number;
  nextActivity?: string;
}

export interface AirportDTO {
  id: string;
  iata: string;
  icao: string;
  name: string;
  city: string;
  state?: string;
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
  creditUsed?: number;
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

export interface DetectedAirspaceConflict {
  conflictId: string;
  flightA: {
    id: string;
    callsign: string;
    altitudeFt: number;
    headingDeg: number;
    speedKt: number;
  };
  flightB: {
    id: string;
    callsign: string;
    altitudeFt: number;
    headingDeg: number;
    speedKt: number;
  };
  horizontalSeparationNm: number;
  verticalSeparationFt: number;
  conflictType: "LOSS_OF_SEPARATION" | "RUNWAY_INCURSION_RISK" | "WAKE_TURBULENCE_SPACING" | "ALTITUDE_BUST";
  severity: "CRITICAL" | "WARNING" | "ADVISORY";
  resolutionAdvisory: string;
  suggestedAction?: {
    callsign: string;
    targetAltitudeFt?: number;
    targetHeadingDeg?: number;
    targetSpeedKt?: number;
    squawk?: string;
  };
}

export interface AiAtcAssistantRequest {
  pilotTransmission: string;
  selectedFlightId?: string;
  airportCode?: string;
}

export interface AiAtcAssistantResponse {
  callsign: string;
  intent:
    | "WAYPOINT_DIRECT"
    | "CLIMB_DESCEND"
    | "PUSHBACK_STARTUP"
    | "TAXI_CLEARANCE"
    | "TAKEOFF_APPROACH"
    | "EMERGENCY_MAYDAY"
    | "EMERGENCY_PAN_PAN"
    | "SPEED_VECTOR"
    | "GENERAL_QUERY";
  recommendedClearance: string;
  pilotReadback: string;
  suggestedParameters: {
    altitudeFt?: number;
    headingDeg?: number;
    speedKt?: number;
    squawk?: string;
    runway?: string;
    status?: string;
  };
  conflicts: DetectedAirspaceConflict[];
  reasoning: string;
  model: string;
  simulated: boolean;
  timestamp: string;
}

export interface IcaoFlightPlanDTO {
  id: string;
  callsign: string;
  flightRules: "I" | "V" | "Y" | "Z";
  flightType: "S" | "N" | "G" | "M" | "X";
  aircraftType: string;
  wakeTurbulence: "L" | "M" | "H" | "J";
  equipment: string;
  departureAirport: string;
  eobt: string;
  cruisingSpeed: string;
  cruisingLevel: string;
  route: string;
  destinationAirport: string;
  totalEet: string;
  alternateAirport: string;
  remarks?: string;
  status: "FILED" | "ACCEPTED" | "CLEARED" | "CANCELLED";
  filedAt: string;
}

export type CreditTransactionType =
  | "CREDIT"
  | "BOOKING_DEBIT"
  | "REFUND"
  | "ADJUSTMENT"
  | "BONUS"
  | "REVERSAL"
  | "SIMULATION_TOP_UP"
  | "TICKET_PAYMENT"
  | "REFUND_CREDIT"
  | "ADMIN_ADJUSTMENT";

export interface CreditTransactionDTO {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  type: CreditTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceType?: string;
  referenceId?: string;
  description?: string;
  status?: "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";
  unlimitedMode?: boolean;
  createdAt: string;
}

export type SimulationStatus = "RUNNING" | "PAUSED" | "STOPPED" | "DEGRADED";

export type SimulationTaskType =
  | "ATC_MONITOR"
  | "GROUND_TURNAROUND"
  | "TICKET_CHECKIN"
  | "GATE_BOARDING"
  | "SECURITY_SCREENING"
  | "MAINTENANCE_INSPECTION"
  | "DISPATCH_PREPARATION"
  | "OPERATIONS_COORDINATION";

export type SimulationTaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "CANCELLED";

export type TaskPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface SimulationConfigDTO {
  id: string;
  status: SimulationStatus;
  staffCount: number;
  speedMultiplier: number;
  autoBookingEnabled: boolean;
  autoFlightEnabled: boolean;
  maxBookingsPerInterval: number;
  maxBookingsPerFlight: number;
  totalBookingsGenerated: number;
  totalTasksProcessed: number;
  lastTickAt?: string;
  updatedAt: string;
  createdAt: string;
}

export interface SimulationTaskDTO {
  id: string;
  type: SimulationTaskType;
  status: SimulationTaskStatus;
  priority: TaskPriority;
  staffId: string;
  flightId?: string;
  targetEntity?: string;
  targetEntityId?: string;
  payload?: Record<string, unknown>;
  scheduledAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SimulationMetricsDTO {
  totalStaff: number;
  activeStaff: number;
  workingStaff: number;
  onBreakStaff: number;
  offShiftStaff: number;
  idleStaff: number;
  completedTasks: number;
  failedTasks: number;
  pendingTasks: number;
  activeBookings: number;
  totalRevenue: number;
  totalCreditsUsed: number;
  simSpeed: number;
  status: SimulationStatus;
}

// ==========================================
// AOCC COMPANY FINANCIAL & BANKING DOMAIN
// ==========================================

export type FinancialAccountType =
  | "COMPANY_TREASURY"
  | "OPERATING_ACCOUNT"
  | "PAYROLL_ACCOUNT"
  | "REFUND_ACCOUNT"
  | "REVENUE_ACCOUNT"
  | "EXPENSE_ACCOUNT"
  | "EMPLOYEE_SALARY_ACCOUNT"
  | "USER_CREDIT_ACCOUNT";

export type AccountStatus = "ACTIVE" | "FROZEN" | "CLOSED";

export interface FinancialAccountDTO {
  id: string;
  accountNumber: string;
  accountName: string;
  accountType: FinancialAccountType;
  currency: string;
  balance: number;
  status: AccountStatus;
  employeeId?: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export type FinancialTransactionType =
  | "INITIAL_CAPITAL"
  | "INTERNAL_TRANSFER"
  | "REVENUE"
  | "EXPENSE"
  | "PAYROLL"
  | "REFUND"
  | "ADJUSTMENT"
  | "REVERSAL";

export type TransactionDirection = "DEBIT" | "CREDIT" | "TRANSFER";
export type TransactionStatus = "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";

export interface FinancialTransactionDTO {
  id: string;
  transactionNumber: string;
  type: FinancialTransactionType;
  category: string;
  amount: number;
  currency: string;
  direction: TransactionDirection;
  sourceAccountId?: string;
  sourceAccountName?: string;
  destinationAccountId?: string;
  destinationAccountName?: string;
  referenceType?: string;
  referenceId?: string;
  description: string;
  status: TransactionStatus;
  createdBy?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type SalaryType = "MONTHLY" | "HOURLY" | "CONTRACT";
export type SalaryChangeType = "INITIAL" | "HIKE_PERCENTAGE" | "HIKE_FIXED" | "REDUCTION" | "CORRECTION" | "GRADE_CHANGE";
export type BonusType = "PERFORMANCE" | "ATTENDANCE" | "EMERGENCY" | "OPERATIONAL" | "SIMULATOR" | "MANUAL";
export type DeductionType = "ABSENCE" | "PENALTY" | "ADVANCE_RECOVERY" | "OTHER";

export type SalaryGradeCode =
  | "EXECUTIVE"
  | "SENIOR_MANAGEMENT"
  | "MANAGEMENT"
  | "SENIOR_SPECIALIST"
  | "SPECIALIST"
  | "SUPERVISOR"
  | "EXPERIENCED_STAFF"
  | "ENTRY_LEVEL"
  | "TRAINEE";

export interface SalaryGradeDTO {
  gradeCode: SalaryGradeCode;
  gradeName: string;
  minMonthlyBase: number;
  midMonthlyBase: number;
  maxMonthlyBase: number;
  currency: string;
  effectiveDate: string;
  isActive: boolean;
  allowedRoles: Role[];
  approvalRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryProfileDTO {
  id: string;
  employeeId: string;
  gradeCode?: SalaryGradeCode;
  baseSalary: number;
  allowances: number;
  overtime: number;
  bonus: number;
  deductions: number;
  grossSalary: number;
  netSalary: number;
  salaryType: SalaryType;
  effectiveDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryRevisionDTO {
  id: string;
  salaryProfileId: string;
  previousBaseSalary: number;
  newBaseSalary: number;
  previousGrossSalary: number;
  newGrossSalary: number;
  previousNetSalary: number;
  newNetSalary: number;
  changeType: SalaryChangeType;
  percentageChange?: number;
  fixedChange?: number;
  previousGrade?: SalaryGradeCode;
  newGrade?: SalaryGradeCode;
  reason: string;
  effectiveDate: string;
  createdBy?: string;
  createdAt: string;
}

export interface EmployeeBonusDTO {
  id: string;
  salaryProfileId: string;
  bonusType: BonusType;
  amount: number;
  reason: string;
  payrollPeriod?: string;
  applied: boolean;
  createdBy?: string;
  createdAt: string;
}

export interface EmployeeDeductionDTO {
  id: string;
  salaryProfileId: string;
  deductionType: DeductionType;
  amount: number;
  reason: string;
  payrollPeriod?: string;
  applied: boolean;
  createdBy?: string;
  createdAt: string;
}

export type PayrollFrequency = "MONTHLY" | "WEEKLY" | "BIWEEKLY" | "DAILY" | "CUSTOM";
export type PayrollStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "PROCESSING"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "PARTIALLY_FAILED";

export type PayrollItemStatus = "PENDING" | "PAID" | "FAILED";

export interface PayrollDTO {
  id: string;
  payrollPeriod: string;
  title: string;
  frequency: PayrollFrequency;
  status: PayrollStatus;
  scheduledDate: string;
  paymentDate?: string;
  totalEmployees: number;
  grossAmount: number;
  totalBonuses: number;
  totalDeductions: number;
  netAmount: number;
  companyBalanceBefore?: number;
  companyBalanceAfter?: number;
  approvedBy?: string;
  approvedAt?: string;
  processedBy?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollItemDTO {
  id: string;
  payrollId: string;
  employeeId: string;
  employeeName: string;
  department: DepartmentType;
  role: Role;
  baseSalary: number;
  allowances: number;
  overtime: number;
  bonus: number;
  deductions: number;
  grossSalary: number;
  netSalary: number;
  status: PayrollItemStatus;
  paidAt?: string;
  failureReason?: string;
  createdAt: string;
}

export type ExpenseCategory =
  | "PAYROLL"
  | "MAINTENANCE"
  | "FUEL_SIMULATION"
  | "GROUND_OPERATIONS"
  | "AIRPORT_OPERATIONS"
  | "SECURITY"
  | "EQUIPMENT"
  | "UTILITIES"
  | "MARKETING"
  | "EMERGENCY_OPERATIONS"
  | "OTHER";

export interface CompanyExpenseDTO {
  id: string;
  expenseNumber: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  reference?: string;
  expenseDate: string;
  approvedBy?: string;
  status: string;
  createdAt: string;
}

export interface FinanceConfigDTO {
  id: string;
  initialCapital: number;
  autoPayrollEnabled: boolean;
  payrollFrequency: PayrollFrequency;
  payrollPaymentDay: number;
  payrollPaymentTime: string;
  payrollTimezone: string;
  approvalRequired: boolean;
  minWalletTopUp: number;
  maxWalletTopUp: number;
  maxWalletBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyFinanceSummaryDTO {
  treasuryBalance: number;
  operatingBalance: number;
  payrollBalance: number;
  refundBalance: number;
  revenueBalance: number;
  expenseBalance: number;
  totalCompanyBalance: number;
  todayRevenue: number;
  todayExpenses: number;
  totalRevenue: number;
  totalExpenses: number;
  totalPayrollPaid: number;
  totalSalaries?: number;
  ticketRevenue?: number;
  otherRevenue?: number;
  closingBalance?: number;
  totalRefunds: number;
  netCashFlow: number;
  openingBalance: number;
  totalSimulationMoneyCreated: number;
}

export type WalletTransactionDTO = CreditTransactionDTO;

export interface NeonBranchDTO {
  id: string;
  name: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  currentLsn?: string;
  logicalSizeMb: number;
  primary: boolean;
  status: "ready" | "creating" | "restoring" | "archived";
  pointInTime?: string;
  role: "PRODUCTION" | "SIMULATION_ISOLATED" | "DISASTER_RECOVERY_STANDBY" | "SCHEMA_MIGRATION_TEST";
}

export interface NeonSnapshotDTO {
  id: string;
  branchId: string;
  label: string;
  createdAt: string;
  lsn: string;
  recordCounts: {
    flights: number;
    users: number;
    transactions: number;
    auditLogs: number;
  };
  checksum: string;
  status: "VALIDATED" | "RESTORED";
}

export interface DisasterRecoveryStatusDTO {
  healthy: boolean;
  region: string;
  primaryBranch: string;
  activeBranchesCount: number;
  totalSnapshotsCount: number;
  lastSnapshotAt?: string;
  rpoMinutes: number;
  rtoMinutes: number;
  replicationLagSeconds: number;
  storageDecoupled: boolean;
  scaleToZeroEnabled: boolean;
}

export interface GateAllocationAssignmentDTO {
  flightId: string;
  callsign: string;
  aircraftType: string;
  airline: string;
  eta: string;
  allocatedGateCode: string;
  terminal: string;
  hasJetBridge: boolean;
  turnaroundMinutes: number;
  compatibilityReason: string;
  confidenceScore: number;
  conflictResolved?: boolean;
}

export interface GateAllocationPlanDTO {
  airportCode: string;
  generatedAt: string;
  overallEfficiencyScore: number;
  totalFlightsAllocated: number;
  conflictsDetected: number;
  conflictsResolved: number;
  assignments: GateAllocationAssignmentDTO[];
  unassignedFlights: {
    flightId: string;
    callsign: string;
    reason: string;
  }[];
}


