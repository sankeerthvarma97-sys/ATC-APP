"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type {
  AirportDTO,
  AirportMetrics,
  FlightCommandInput,
  FlightDTO,
  OperationalEventDTO,
  OperationsSnapshot,
  UserDTO,
} from "@/lib/domain";
import { AuthorityHeader } from "./authority-header";
import { AuthoritySidebar } from "./authority-sidebar";
import { CommandPalette } from "./command-palette";

// Skeleton placeholder for dynamically imported sections
function SectionSkeleton({ name }: { name?: string }) {
  return (
    <div className="space-y-4 font-mono animate-pulse text-slate-100">
      <div className="h-10 w-64 bg-slate-900 rounded-xl border border-slate-800" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-24 bg-slate-900/60 rounded-xl border border-slate-800" />
        <div className="h-24 bg-slate-900/60 rounded-xl border border-slate-800" />
        <div className="h-24 bg-slate-900/60 rounded-xl border border-slate-800" />
      </div>
      <div className="h-80 bg-slate-900/40 rounded-xl border border-slate-800 flex items-center justify-center text-xs text-slate-600">
        Loading {name || "operational module"}...
      </div>
    </div>
  );
}

// Section Components — Dynamically code-split for minimal initial bundle
const OverviewSection = dynamic(() => import("./sections/overview-section").then((m) => m.OverviewSection), {
  loading: () => <SectionSkeleton name="Overview Command" />,
});
const LiveTrafficSection = dynamic(() => import("./sections/live-traffic-section").then((m) => m.LiveTrafficSection), {
  loading: () => <SectionSkeleton name="Radar Traffic" />,
});
const AtcOperationsSection = dynamic(() => import("./sections/atc-operations-section").then((m) => m.AtcOperationsSection), {
  loading: () => <SectionSkeleton name="ATC Radar & Sequencing" />,
});
const GroundOpsSection = dynamic(() => import("./sections/ground-ops-section").then((m) => m.GroundOpsSection), {
  loading: () => <SectionSkeleton name="Ground & Turnaround" />,
});
const BaggageSection = dynamic(() => import("./sections/baggage-section").then((m) => m.BaggageSection), {
  loading: () => <SectionSkeleton name="Baggage Handling BHS" />,
});
const EmergenciesSection = dynamic(() => import("./sections/emergencies-section").then((m) => m.EmergenciesSection), {
  loading: () => <SectionSkeleton name="Emergency Crisis Drills" />,
});
const WeatherSection = dynamic(() => import("./sections/weather-section").then((m) => m.WeatherSection), {
  loading: () => <SectionSkeleton name="METAR & Crosswind Station" />,
});
const AirportsSection = dynamic(() => import("./sections/airports-section").then((m) => m.AirportsSection), {
  loading: () => <SectionSkeleton name="Airports Infrastructure" />,
});
const RunwaysSection = dynamic(() => import("./sections/runways-section").then((m) => m.RunwaysSection), {
  loading: () => <SectionSkeleton name="Runways & Surface Mu" />,
});
const GatesSection = dynamic(() => import("./sections/gates-section").then((m) => m.GatesSection), {
  loading: () => <SectionSkeleton name="Gates & Stands" />,
});
const FlightsSection = dynamic(() => import("./sections/flights-section").then((m) => m.FlightsSection), {
  loading: () => <SectionSkeleton name="Flight Manifest" />,
});
const AirlinesSection = dynamic(() => import("./sections/airlines-section").then((m) => m.AirlinesSection), {
  loading: () => <SectionSkeleton name="Airlines Network" />,
});
const AircraftSection = dynamic(() => import("./sections/aircraft-section").then((m) => m.AircraftSection), {
  loading: () => <SectionSkeleton name="Aircraft Fleet" />,
});
const TicketingSection = dynamic(() => import("./sections/ticketing-section").then((m) => m.TicketingSection), {
  loading: () => <SectionSkeleton name="Ticketing & Fares" />,
});
const BookingsSection = dynamic(() => import("./sections/bookings-section").then((m) => m.BookingsSection), {
  loading: () => <SectionSkeleton name="Bookings Database" />,
});
const PassengersSection = dynamic(() => import("./sections/passengers-section").then((m) => m.PassengersSection), {
  loading: () => <SectionSkeleton name="Passengers Directory" />,
});
const CheckinSection = dynamic(() => import("./sections/checkin-section").then((m) => m.CheckinSection), {
  loading: () => <SectionSkeleton name="Check-in & Boarding Passes" />,
});
const VerificationSection = dynamic(() => import("./sections/verification-section").then((m) => m.VerificationSection), {
  loading: () => <SectionSkeleton name="Ticket QR Verification" />,
});
const BoardingSection = dynamic(() => import("./sections/boarding-section").then((m) => m.BoardingSection), {
  loading: () => <SectionSkeleton name="Boarding Turnstile" />,
});
const StaffSection = dynamic(() => import("./sections/staff-section").then((m) => m.StaffSection), {
  loading: () => <SectionSkeleton name="Staff Directory" />,
});
const DepartmentsSection = dynamic(() => import("./sections/departments-section").then((m) => m.DepartmentsSection), {
  loading: () => <SectionSkeleton name="Departments" />,
});
const RolesPermissionsSection = dynamic(() => import("./sections/roles-permissions-section").then((m) => m.RolesPermissionsSection), {
  loading: () => <SectionSkeleton name="RBAC Matrix" />,
});
const AnalyticsSection = dynamic(() => import("./sections/analytics-section").then((m) => m.AnalyticsSection), {
  loading: () => <SectionSkeleton name="Analytics & Throughput" />,
});
const AuditLogsSection = dynamic(() => import("./sections/audit-logs-section").then((m) => m.AuditLogsSection), {
  loading: () => <SectionSkeleton name="Audit Logs" />,
});
const SystemSettingsSection = dynamic(() => import("./sections/system-settings-section").then((m) => m.SystemSettingsSection), {
  loading: () => <SectionSkeleton name="System Settings" />,
});
const SimulationControlSection = dynamic(() => import("./sections/simulation-control-section").then((m) => m.SimulationControlSection), {
  loading: () => <SectionSkeleton name="24/7 Operations & Simulation Control" />,
});
const VirtualStaffSection = dynamic(() => import("./sections/virtual-staff-section").then((m) => m.VirtualStaffSection), {
  loading: () => <SectionSkeleton name="2,000 Virtual Staff Operations Roster" />,
});
const AccountsFinanceSection = dynamic(() => import("./sections/accounts-finance-section").then((m) => m.AccountsFinanceSection), {
  loading: () => <SectionSkeleton name="Accounts, Finance & Treasury Control" />,
});

const DEFAULT_AIRPORTS: AirportDTO[] = [
  { id: "apt-hyd", iata: "HYD", icao: "VOHS", name: "Rajiv Gandhi International Airport", city: "Hyderabad", country: "India", latitude: 17.2403, longitude: 78.4294, elevationFt: 2024, status: "ACTIVE" },
  { id: "apt-bom", iata: "BOM", icao: "VABB", name: "Chhatrapati Shivaji Maharaj International Airport", city: "Mumbai", country: "India", latitude: 19.0896, longitude: 72.8656, elevationFt: 39, status: "ACTIVE" },
  { id: "apt-del", iata: "DEL", icao: "VIDP", name: "Indira Gandhi International Airport", city: "Delhi", country: "India", latitude: 28.5562, longitude: 77.1000, elevationFt: 777, status: "ACTIVE" },
  { id: "apt-blr", iata: "BLR", icao: "VOBL", name: "Kempegowda International Airport", city: "Bengaluru", country: "India", latitude: 13.1986, longitude: 77.7066, elevationFt: 3000, status: "ACTIVE" },
  { id: "apt-maa", iata: "MAA", icao: "VOMM", name: "Chennai International Airport", city: "Chennai", country: "India", latitude: 12.9941, longitude: 80.1709, elevationFt: 52, status: "ACTIVE" },
  { id: "apt-ccu", iata: "CCU", icao: "VECC", name: "Netaji Subhas Chandra Bose International Airport", city: "Kolkata", country: "India", latitude: 22.6547, longitude: 88.4467, elevationFt: 16, status: "ACTIVE" },
  { id: "apt-cok", iata: "COK", icao: "VOCI", name: "Cochin International Airport", city: "Kochi", country: "India", latitude: 10.1520, longitude: 76.4019, elevationFt: 30, status: "ACTIVE" },
  { id: "apt-goi", iata: "GOI", icao: "VOGO", name: "Goa International Airport", city: "Goa", country: "India", latitude: 15.3808, longitude: 73.8314, elevationFt: 184, status: "ACTIVE" },
  { id: "apt-pnq", iata: "PNQ", icao: "VAPO", name: "Pune Airport", city: "Pune", country: "India", latitude: 18.5822, longitude: 73.9197, elevationFt: 1942, status: "ACTIVE" },
  { id: "apt-amd", iata: "AMD", icao: "VAAH", name: "Sardar Vallabhbhai Patel International Airport", city: "Ahmedabad", country: "India", latitude: 23.0772, longitude: 72.6347, elevationFt: 189, status: "ACTIVE" },
  { id: "apt-jai", iata: "JAI", icao: "VIJP", name: "Jaipur International Airport", city: "Jaipur", country: "India", latitude: 26.8242, longitude: 75.8122, elevationFt: 1263, status: "ACTIVE" },
  { id: "apt-lko", iata: "LKO", icao: "VILK", name: "Chaudhary Charan Singh International Airport", city: "Lucknow", country: "India", latitude: 26.7606, longitude: 80.8893, elevationFt: 123, status: "ACTIVE" },
  { id: "apt-bbi", iata: "BBI", icao: "VEBS", name: "Biju Patnaik International Airport", city: "Bhubaneswar", country: "India", latitude: 20.2444, longitude: 85.8178, elevationFt: 138, status: "ACTIVE" },
  { id: "apt-vtz", iata: "VTZ", icao: "VOVZ", name: "Visakhapatnam International Airport", city: "Visakhapatnam", country: "India", latitude: 17.7212, longitude: 83.2245, elevationFt: 45, status: "ACTIVE" },
  { id: "apt-tir", iata: "TIR", icao: "VOTP", name: "Tirupati International Airport", city: "Tirupati", country: "India", latitude: 13.6325, longitude: 79.5433, elevationFt: 350, status: "ACTIVE" },
];

export function AuthorityControlCenter({
  currentUser,
  initialAirports = DEFAULT_AIRPORTS,
  initialSnapshot,
  onOpenConsole,
}: {
  currentUser: UserDTO;
  initialAirports?: AirportDTO[];
  initialSnapshot?: OperationsSnapshot;
  onOpenConsole?: () => void;
}) {
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [airports, setAirports] = useState<AirportDTO[]>(
    initialAirports && initialAirports.length > 0 ? initialAirports : DEFAULT_AIRPORTS
  );
  const [activeAirport, setActiveAirport] = useState<AirportDTO>(
    airports.find((a) => a.iata === "HYD") || airports[0] || DEFAULT_AIRPORTS[0]
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [sectionParams, setSectionParams] = useState<Record<string, string>>({});

  const [flights, setFlights] = useState<FlightDTO[]>(initialSnapshot?.flights || []);
  const [events, setEvents] = useState<OperationalEventDTO[]>(initialSnapshot?.events || []);
  const [metrics, setMetrics] = useState<AirportMetrics>(
    initialSnapshot?.metrics || {
      activeFlights: 0,
      airborne: 0,
      arrivalsInWindow: 0,
      departuresInWindow: 0,
      emergencyCount: 0,
      holdingCount: 0,
      runwayUtilization: 0,
      averageRisk: 0,
      averageDelayMin: 0,
      throughputPerHour: 0,
      totalBookings: 0,
      todayPassengers: 0,
      availableGates: 18,
      occupiedGates: 6,
      activeControllers: 4,
      activeGroundStaff: 12,
    }
  );

  const handleNavigateTo = (section: string, params?: Record<string, string>) => {
    setActiveSection(section);
    if (params) {
      setSectionParams(params);
    }
  };

  const handleRefreshFlights = async () => {
    try {
      const res = await fetch("/api/operations/snapshot");
      if (res.ok) {
        const data = await res.json();
        if (data.flights) setFlights(data.flights);
        if (data.events) setEvents(data.events);
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch (err) {
      console.error("Failed to refresh operations snapshot", err);
    }
  };

  const handleSendCommand = async (command: FlightCommandInput) => {
    try {
      const res = await fetch("/api/operations/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.snapshot) {
          setFlights(data.snapshot.flights);
          setEvents(data.snapshot.events);
          setMetrics(data.snapshot.metrics);
        }
      }
    } catch (err) {
      console.error("Failed to send command", err);
    }
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case "overview":
        return (
          <OverviewSection
            flights={flights}
            events={events}
            metrics={metrics}
            activeAirport={activeAirport}
            onNavigate={(sec) => handleNavigateTo(sec)}
          />
        );
      case "traffic":
        return (
          <LiveTrafficSection
            flights={flights}
            onSendCommand={handleSendCommand}
          />
        );
      case "atc":
        return <AtcOperationsSection onOpenConsole={onOpenConsole} activeAirport={activeAirport} />;
      case "ground":
        return <GroundOpsSection onNavigateTo={(sec) => handleNavigateTo(sec)} />;
      case "baggage":
        return <BaggageSection onNavigateTo={(sec) => handleNavigateTo(sec)} />;
      case "emergencies":
        return <EmergenciesSection />;
      case "weather":
        return <WeatherSection />;
      case "airports":
        return (
          <AirportsSection
            activeStation={activeAirport?.iata}
            onSelectStation={(iata) => {
              const apt = airports.find((a) => a.iata === iata);
              if (apt) setActiveAirport(apt);
            }}
          />
        );
      case "runways":
        return <RunwaysSection activeStation={activeAirport.iata} />;
      case "gates":
        return <GatesSection activeStation={activeAirport.iata} />;
      case "flights":
        return (
          <FlightsSection
            flights={flights}
            onRefresh={handleRefreshFlights}
          />
        );
      case "airlines":
        return <AirlinesSection />;
      case "aircraft":
        return <AircraftSection />;
      case "ticketing":
        return (
          <TicketingSection
            flights={flights}
            onBookingSuccess={() => handleNavigateTo("bookings")}
          />
        );
      case "bookings":
        return (
          <BookingsSection
            onNavigateToCheckin={(pnr: string) => handleNavigateTo("checkin", { pnr })}
          />
        );
      case "passengers":
        return <PassengersSection onNavigateTo={handleNavigateTo} />;
      case "checkin":
        return (
          <CheckinSection
            initialPnr={sectionParams.pnr}
            onNavigateTo={handleNavigateTo}
          />
        );
      case "verification":
        return <VerificationSection onNavigateTo={handleNavigateTo} />;
      case "boarding":
        return (
          <BoardingSection
            key={`${sectionParams.flight ?? ""}:${sectionParams.pnr ?? ""}`}
            onNavigateTo={(sec: string, params?: Record<string, string>) => handleNavigateTo(sec, params)}
            initialFlight={sectionParams.flight}
            initialPnr={sectionParams.pnr}
          />
        );
      case "staff":
        return <StaffSection />;
      case "departments":
        return <DepartmentsSection />;
      case "simulation":
        return <SimulationControlSection onNavigateTo={(sec) => handleNavigateTo(sec)} />;
      case "virtual-staff":
        return <VirtualStaffSection />;
      case "finance":
        return <AccountsFinanceSection initialSubTab="overview" />;
      case "finance-accounts":
        return <AccountsFinanceSection initialSubTab="accounts" />;
      case "finance-ledger":
        return <AccountsFinanceSection initialSubTab="ledger" />;
      case "finance-expenses":
        return <AccountsFinanceSection initialSubTab="expenses" />;
      case "finance-payroll":
        return <AccountsFinanceSection initialSubTab="payroll" />;
      case "finance-salaries":
        return <AccountsFinanceSection initialSubTab="salaries" />;
      case "finance-calendar":
        return <AccountsFinanceSection initialSubTab="calendar" />;
      case "finance-wallet":
        return <AccountsFinanceSection initialSubTab="wallet-activity" />;
      case "roles":
        return <RolesPermissionsSection />;
      case "analytics":
        return <AnalyticsSection />;
      case "audit":
        return <AuditLogsSection />;
      case "settings":
        return <SystemSettingsSection />;
      default:
        return (
          <OverviewSection
            flights={flights}
            events={events}
            metrics={metrics}
            activeAirport={activeAirport}
            onNavigate={(sec) => handleNavigateTo(sec)}
          />
        );
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#070b13] text-slate-100 font-sans select-text antialiased">
      {/* Top Application Header */}
      <AuthorityHeader
        currentUser={currentUser}
        activeAirport={activeAirport}
        airports={airports}
        onSelectAirport={(apt) => setActiveAirport(apt)}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        emergencyCount={metrics.emergencyCount}
      />

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation Sidebar */}
        <AuthoritySidebar
          activeSection={activeSection}
          onSelectSection={(id) => handleNavigateTo(id)}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Dynamic Section Content Canvas */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-[#090d16]/70">
          <div className="mx-auto max-w-7xl">
            {renderActiveSection()}
          </div>
        </main>
      </div>

      {/* Bottom Telemetry Status Bar */}
      <footer className="h-7 border-t border-slate-800/80 bg-slate-950 px-4 flex items-center justify-between text-[10px] font-mono text-slate-400 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>LIVE · COMMAND CENTER ONLINE</span>
          </div>
          <span className="text-slate-700">|</span>
          <span>STATION: {activeAirport.iata} ({activeAirport.icao})</span>
          <span className="text-slate-700 hidden sm:inline">|</span>
          <span className="hidden sm:inline">RADAR FEEDS: NORMAL</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-500">API: 200 OK</span>
          <span className="text-slate-700">|</span>
          <span className="text-emerald-400">DB: HEALTHY</span>
          <span className="text-slate-700">|</span>
          <span className="text-slate-500">v0.1.0 PROD</span>
        </div>
      </footer>

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onSelect={(id) => handleNavigateTo(id)}
      />
    </div>
  );
}
