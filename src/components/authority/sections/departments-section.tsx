"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  Building,
  CheckCircle2,
  HardHat,
  Luggage,
  Radio,
  Server,
  Shield,
  Siren,
  Users,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface DepartmentInfo {
  id: string;
  name: string;
  icon: typeof Building;
  head: string;
  staffCount: number;
  activeShift: number;
  readiness: number;
  status: "OPTIMAL" | "NOMINAL" | "ALERT";
  description: string;
  keyResponsibilities: string[];
}

const DEPARTMENTS: DepartmentInfo[] = [
  {
    id: "AIRPORT_AUTHORITY",
    name: "Airport Authority & Executive Control",
    icon: Building,
    head: "Capt. Maya Lin (Airport Director)",
    staffCount: 14,
    activeShift: 6,
    readiness: 98,
    status: "OPTIMAL",
    description: "Executive oversight, strategic resource allocation, regulatory compliance, and inter-agency coordination.",
    keyResponsibilities: ["Regulatory compliance", "Airport policy", "Emergency command escalation"],
  },
  {
    id: "FLIGHT_OPERATIONS",
    name: "Flight Operations & Dispatch",
    icon: Activity,
    head: "Marcus Sterling (Chief Dispatcher)",
    staffCount: 28,
    activeShift: 12,
    readiness: 95,
    status: "OPTIMAL",
    description: "Flight plan filing, slot coordination, weight and balance calculations, and dispatch clearances.",
    keyResponsibilities: ["Flight routing", "Payload & fuel planning", "NOTAM promulgation"],
  },
  {
    id: "AIR_TRAFFIC_CONTROL",
    name: "Air Traffic Control (AOCC Tower & TRACON)",
    icon: Radio,
    head: "David Chen (Air Traffic Manager)",
    staffCount: 36,
    activeShift: 14,
    readiness: 100,
    status: "OPTIMAL",
    description: "Runway separation, ground movements, terminal airspace radar sequencing, and radio communications.",
    keyResponsibilities: ["Tower control", "Ground taxi guidance", "Approach sequencing"],
  },
  {
    id: "GROUND_OPERATIONS",
    name: "Ground Handling & Apron Services",
    icon: HardHat,
    head: "Samantha Ross (Apron Supervisor)",
    staffCount: 45,
    activeShift: 20,
    readiness: 92,
    status: "NOMINAL",
    description: "Aircraft marshaling, pushback tug operations, catering, lavatory servicing, and ramp safety.",
    keyResponsibilities: ["Aircraft pushback", "Ramp marshaling", "Apron safety"],
  },
  {
    id: "SECURITY",
    name: "Airport Security & Border Protection",
    icon: Shield,
    head: "Col. James Walker (Security Chief)",
    staffCount: 52,
    activeShift: 22,
    readiness: 96,
    status: "OPTIMAL",
    description: "Access control, passenger biometric screening, sterile area patrol, and threat mitigation.",
    keyResponsibilities: ["Checkpoint screening", "Perimeter security", "Access badge control"],
  },
  {
    id: "ENGINEERING_MAINTENANCE",
    name: "Airfield Engineering & Fleet Maintenance",
    icon: Wrench,
    head: "Elena Rostova (Chief Engineer)",
    staffCount: 30,
    activeShift: 10,
    readiness: 88,
    status: "NOMINAL",
    description: "Runway surface friction monitoring, NAVAID calibration, lighting systems, and line maintenance.",
    keyResponsibilities: ["Runway inspections", "ILS calibration", "AOG rapid response"],
  },
  {
    id: "PASSENGER_SERVICES",
    name: "Passenger Services & Terminal Operations",
    icon: Users,
    head: "Clara Hughes (Terminal Manager)",
    staffCount: 40,
    activeShift: 18,
    readiness: 94,
    status: "OPTIMAL",
    description: "Ticketing counters, gate boarding management, PRM assistance, and terminal concourse flow.",
    keyResponsibilities: ["Check-in counters", "Gate boarding", "Special assistance"],
  },
  {
    id: "BAGGAGE_HANDLING",
    name: "Baggage Reconciliation & Sorting System",
    icon: Luggage,
    head: "Robert Ortiz (Baggage Operations Lead)",
    staffCount: 34,
    activeShift: 15,
    readiness: 91,
    status: "NOMINAL",
    description: "High-speed conveyor sorting, BSM message reconciliation, ULD loading, and carousel delivery.",
    keyResponsibilities: ["Automated sorting", "Baggage tracking", "Transfer sorting"],
  },
  {
    id: "IMMIGRATION_CUSTOMS",
    name: "Immigration, Passport & Customs Enforcement",
    icon: Shield,
    head: "Agent Sarah Jenkins (Director)",
    staffCount: 26,
    activeShift: 12,
    readiness: 97,
    status: "OPTIMAL",
    description: "International arrivals clearance, visa verification, cargo manifest inspection, and biometrics.",
    keyResponsibilities: ["Passport control", "Customs declaration", "Electronic gates"],
  },
  {
    id: "EMERGENCY_SERVICES",
    name: "Airport Rescue & Fire Fighting (ARFF)",
    icon: Siren,
    head: "Chief Thomas Miller (ARFF Commander)",
    staffCount: 22,
    activeShift: 8,
    readiness: 100,
    status: "OPTIMAL",
    description: "Category 10 rapid fire rescue response, foam crash tenders, emergency medical triage, and hazmat response.",
    keyResponsibilities: ["Crash rescue (under 3 min)", "Medical triage", "Hazardous materials"],
  },
  {
    id: "IT_COMMUNICATIONS",
    name: "IT Infrastructure & AODB Systems",
    icon: Server,
    head: "Karan Patel (CTO / Head of IT)",
    staffCount: 18,
    activeShift: 6,
    readiness: 99,
    status: "OPTIMAL",
    description: "Airport Operational Database (AODB), FIDS displays, VHF radio links, and radar data network.",
    keyResponsibilities: ["FIDS telemetry", "Realtime data sync", "VHF/ACARS gateway"],
  },
];

export function DepartmentsSection() {
  const [selectedDept, setSelectedDept] = useState<DepartmentInfo | null>(DEPARTMENTS[0]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building className="h-6 w-6 text-primary" />
            Airport Authority Organizational Departments
          </h2>
          <p className="text-sm text-muted-foreground">
            Overview of the 11 specialized divisions powering seamless aerodrome operations and regulatory compliance.
          </p>
        </div>
        <Badge variant="outline" className="text-xs bg-primary/10 border-primary/40 text-primary">
          11 Departments Active
        </Badge>
      </div>

      {/* Grid of department cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {DEPARTMENTS.map((dept) => {
          const Icon = dept.icon;
          const isSelected = selectedDept?.id === dept.id;
          return (
            <Card
              key={dept.id}
              onClick={() => setSelectedDept(dept)}
              className={`cursor-pointer transition-all border ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                  : "border-border/60 bg-card/70 hover:bg-card hover:border-border"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">{dept.name}</CardTitle>
                      <CardDescription className="text-xs">{dept.head}</CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={
                      dept.status === "OPTIMAL"
                        ? "default"
                        : dept.status === "NOMINAL"
                        ? "secondary"
                        : "destructive"
                    }
                    className="text-[10px] px-1.5 py-0"
                  >
                    {dept.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <p className="text-muted-foreground line-clamp-2">{dept.description}</p>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Roster: {dept.staffCount} Officers</span>
                  <span className="font-semibold text-foreground">On-Duty: {dept.activeShift}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Readiness Rating</span>
                    <span className="font-mono font-semibold text-foreground">{dept.readiness}%</span>
                  </div>
                  <Progress value={dept.readiness} className="h-1.5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected department detail drawer / card */}
      {selectedDept && (
        <Card className="border-border/60 bg-card/80 backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <selectedDept.icon className="h-5 w-5 text-primary" />
                Department Protocol & Operational Matrix: {selectedDept.name}
              </CardTitle>
              <Badge variant="outline" className="font-mono text-xs">
                HEAD: {selectedDept.head}
              </Badge>
            </div>
            <CardDescription className="text-sm text-foreground/80">
              {selectedDept.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                Core Mandatory Standard Operating Procedures (SOP):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {selectedDept.keyResponsibilities.map((resp, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-border/60 bg-background/50 flex items-center gap-2 text-xs font-medium text-foreground"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>{resp}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
