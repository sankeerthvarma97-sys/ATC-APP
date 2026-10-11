import type { DepartmentType, Role } from "@/lib/domain";
import { formatEmployeeId } from "@/server/employees/employee-id-service";

const FIRST_NAMES = [
  "Aarav", "Aditi", "Rohan", "Priya", "Vikram", "Ananya", "Rahul", "Sneha", "Karan", "Pooja",
  "Arjun", "Neha", "Siddharth", "Divya", "Suresh", "Meera", "Rajesh", "Kavita", "Amit", "Sunita",
  "James", "Emma", "Liam", "Olivia", "Noah", "Ava", "William", "Sophia", "Benjamin", "Isabella",
  "Lucas", "Mia", "Henry", "Charlotte", "Alexander", "Amelia", "Daniel", "Harper", "Matthew", "Evelyn",
  "David", "Abigail", "Joseph", "Emily", "Samuel", "Elizabeth", "John", "Sofia", "Michael", "Avery",
  "Chen", "Wei", "Hui", "Mei", "Jun", "Ying", "Tao", "Fang", "Lei", "Yan",
  "Hiroshi", "Yuki", "Kenji", "Sakura", "Daiki", "Aoi", "Kazuki", "Rin", "Ren", "Hina",
  "Tariq", "Fatima", "Omar", "Zainab", "Zayd", "Layla", "Youssef", "Maryam", "Karim", "Nour",
];

const LAST_NAMES = [
  "Sharma", "Verma", "Patel", "Reddy", "Menon", "Rao", "Nair", "Iyer", "Gupta", "Deshmukh",
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
  "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Wong", "Zhang", "Wang", "Liu", "Chen", "Yang", "Huang", "Wu", "Zhou",
  "Sato", "Suzuki", "Takahashi", "Tanaka", "Watanabe", "Ito", "Yamamoto", "Nakamura", "Kobayashi", "Kato",
  "Al-Mansoor", "Al-Hashimi", "Hassan", "Khan", "Ibrahim", "Malik", "Siddiqui", "Farooq", "Rahman", "Qureshi",
];

export interface StaffTemplate {
  department: DepartmentType;
  roles: Role[];
  tasks: string[];
  locations: string[];
}

export const DEPARTMENT_CONFIGS: Record<DepartmentType, { roles: Role[]; tasks: string[]; locations: string[]; weight: number }> = {
  AIR_TRAFFIC_CONTROL: {
    weight: 0.12,
    roles: ["ATC_CONTROLLER", "SENIOR_ATC_CONTROLLER", "ATC"],
    tasks: [
      "Monitoring inbound approach radar sequencing",
      "Issuing departure taxi clearance",
      "Coordinating runway 09L lineup and wait",
      "Monitoring active glideslope interception",
      "Issuing missed approach instructions",
      "Monitoring weather radar wind shear advisories",
    ],
    locations: ["Tower Cab Level 8", "TRACON Radar Room", "Ground Control Station", "Clearance Delivery Desk"],
  },
  AIRPORT_OPERATIONS: {
    weight: 0.10,
    roles: ["OPERATIONS_MANAGER", "SUPERVISOR"],
    tasks: [
      "Airfield friction inspection & FOD sweep",
      "Concourse passenger density monitoring",
      "Stand allocation optimization review",
      "Terminal HVAC and power grid monitoring",
      "Slot compliance performance audit",
    ],
    locations: ["AOCC Central Control", "Terminal 1 Concourse", "Terminal 2 Concourse", "Airfield Operations Center"],
  },
  GROUND_OPERATIONS: {
    weight: 0.18,
    roles: ["GROUND_OPERATOR", "GROUND"],
    tasks: [
      "Connecting towbarless pushback tug to nose gear",
      "Hydrant dispenser jet fuel hookup & pressure test",
      "Aircraft ground power unit (GPU) connection",
      "Potable water and lavatory servicing",
      "Chocks placement and ground safety perimeter check",
      "De-icing fluid spraying inspection",
    ],
    locations: ["Apron Stand A1", "Apron Stand B12", "Apron Stand C2", "North Remote Stands", "Ground Equipment Bay"],
  },
  AIRLINE_OPERATIONS: {
    weight: 0.08,
    roles: ["AIRLINE_OPERATOR", "FLIGHT_DISPATCHER"],
    tasks: [
      "Filing operational flight plan (OFP) with Eurocontrol/FAA",
      "Zero fuel weight & trim balance calculation",
      "En-route weather TAF and NOTAM analysis",
      "ETOPS alternate fuel reserve verification",
      "Slot coordination and crew duty time audit",
    ],
    locations: ["Airline Dispatch Room", "Crew Briefing Room", "Flight Operations Suite"],
  },
  TICKETING: {
    weight: 0.12,
    roles: ["TICKETING_AGENT"],
    tasks: [
      "Processing simulated passenger booking reservation",
      "Re-issuing passenger itinerary with updated seating",
      "Applying simulation credit balance payment",
      "Ticket barcode encryption verification",
      "Handling standby passenger ticket clearance",
    ],
    locations: ["Ticketing Counter 1-4", "Customer Service Desk A", "Fast-Track Reservation Counter"],
  },
  PASSENGER_SERVICES: {
    weight: 0.12,
    roles: ["GATE_AGENT"],
    tasks: [
      "Scanning digital boarding pass QR codes",
      "Announcing Group 1 priority boarding call",
      "Resolving duplicate seat assignment conflict",
      "Special assistance passenger boarding escort",
      "Closing flight gate manifest and handing to flight crew",
    ],
    locations: ["Gate A1", "Gate A4", "Gate B6", "Gate B12", "Gate C2", "Gate D1"],
  },
  SECURITY: {
    weight: 0.10,
    roles: ["SECURITY_OFFICER"],
    tasks: [
      "Monitoring biometric boarding gate lane",
      "Airside security badge credential validation",
      "Concourse sterile perimeter inspection",
      "Hand luggage X-ray trace detection scan",
      "Escorting technical contractors airside",
    ],
    locations: ["Central Security Checkpoint", "Staff Airside Turnstile", "Sterile Concourse Zone", "Perimeter Gate 3"],
  },
  BAGGAGE: {
    weight: 0.08,
    roles: ["BAGGAGE_STAFF"],
    tasks: [
      "Automated baggage sorting barcode scan (BSM)",
      "ULD container loading for flight cargo hold",
      "Baggage makeup carousel reconciliation",
      "Transfer luggage rapid routing to connecting flight",
      "Arrival carousel belt dispatch monitoring",
    ],
    locations: ["Baggage Sorting Hall", "Carousel 1-3", "Carousel 4-6", "Transfer Baggage Center"],
  },
  MAINTENANCE: {
    weight: 0.05,
    roles: ["MAINTENANCE_STAFF"],
    tasks: [
      "Runway centerline lighting photometric inspection",
      "Airframe tire pressure and hydraulic leak check",
      "ILS localizer antenna transmitter frequency calibration",
      "Jet bridge hydraulic lift maintenance",
    ],
    locations: ["Airfield Maintenance Shed", "Hangars Complex", "NavAids Radar Field"],
  },
  EMERGENCY_RESPONSE: {
    weight: 0.03,
    roles: ["OPERATIONS_MANAGER", "SUPERVISOR"],
    tasks: [
      "ARFF Cat 10 foam crash tender response drill",
      "Medical emergency first-responder equipment check",
      "Airfield bird hazard scare patrol dispatch",
      "Hazardous materials containment inspection",
    ],
    locations: ["ARFF Station 1 (Runway 09L)", "Airfield Firehouse", "Emergency Operations Center"],
  },
  ADMINISTRATION: {
    weight: 0.02,
    roles: ["ADMIN", "AIRPORT_ADMIN", "SUPERVISOR"],
    tasks: [
      "Reviewing operational safety performance indicators",
      "Approving aerodrome slot allocations",
      "Staff shift compliance and duty log verification",
    ],
    locations: ["Executive Tower Level 10", "Administration Suite"],
  },
};

export function getRandomElement<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateStaffBatch(count: number, airportCode = "HYD"): Array<{
  employeeId: string;
  fullName: string;
  email: string;
  phone: string;
  department: DepartmentType;
  jobTitle: string;
  role: Role;
  airportCode: string;
  terminal: string;
  gateArea: string;
  shift: string;
  isVirtual: boolean;
  currentTask: string;
  currentLocation: string;
  performanceScore: number;
  tasksCompleted: number;
  tasksFailed: number;
}> {
  const depts = Object.keys(DEPARTMENT_CONFIGS) as DepartmentType[];
  const terminals = ["T1", "T2", "T3"];
  const shifts = ["SHIFT_A", "SHIFT_B", "SHIFT_C"];

  const batch: ReturnType<typeof generateStaffBatch> = [];

  for (let i = 1; i <= count; i++) {
    // Weighted department pick
    const rand = Math.random();
    let accumulated = 0;
    let chosenDept: DepartmentType = "GROUND_OPERATIONS";

    for (const d of depts) {
      accumulated += DEPARTMENT_CONFIGS[d].weight;
      if (rand <= accumulated) {
        chosenDept = d;
        break;
      }
    }

    const config = DEPARTMENT_CONFIGS[chosenDept];
    const role = getRandomElement(config.roles);
    const firstName = getRandomElement(FIRST_NAMES);
    const lastName = getRandomElement(LAST_NAMES);
    const fullName = `${firstName} ${lastName}`;
    const idNum = String(i).padStart(5, "0");
    const employeeId = formatEmployeeId(i, true);
    const email = `vs.${firstName.toLowerCase()}.${lastName.toLowerCase()}.${idNum}@sim.aocc.test`;
    const phone = `+91 ${Math.floor(7000000000 + Math.random() * 2999999999)}`;
    const terminal = getRandomElement(terminals);
    const shift = getRandomElement(shifts);
    const currentTask = getRandomElement(config.tasks);
    const currentLocation = getRandomElement(config.locations);
    const performanceScore = Math.floor(82 + Math.random() * 18);
    const tasksCompleted = Math.floor(10 + Math.random() * 140);
    const tasksFailed = Math.floor(Math.random() * 3);

    batch.push({
      employeeId,
      fullName,
      email,
      phone,
      department: chosenDept,
      jobTitle: `${chosenDept.replace(/_/g, " ")} Specialist`,
      role,
      airportCode,
      terminal,
      gateArea: currentLocation,
      shift,
      isVirtual: true,
      currentTask,
      currentLocation,
      performanceScore,
      tasksCompleted,
      tasksFailed,
    });
  }

  return batch;
}
