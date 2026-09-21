"use client";

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

// Section Components
import { OverviewSection } from "./sections/overview-section";
import { LiveTrafficSection } from "./sections/live-traffic-section";
import { AtcOperationsSection } from "./sections/atc-operations-section";
import { GroundOpsSection } from "./sections/ground-ops-section";
import { EmergenciesSection } from "./sections/emergencies-section";
import { WeatherSection } from "./sections/weather-section";
import { AirportsSection } from "./sections/airports-section";
import { RunwaysSection } from "./sections/runways-section";
import { GatesSection } from "./sections/gates-section";
import { FlightsSection } from "./sections/flights-section";
import { AirlinesSection } from "./sections/airlines-section";
import { AircraftSection } from "./sections/aircraft-section";
import { TicketingSection } from "./sections/ticketing-section";
import { BookingsSection } from "./sections/bookings-section";
import { PassengersSection } from "./sections/passengers-section";
import { CheckinSection } from "./sections/checkin-section";
import { VerificationSection } from "./sections/verification-section";
import { BoardingSection } from "./sections/boarding-section";
import { StaffSection } from "./sections/staff-section";
import { DepartmentsSection } from "./sections/departments-section";
import { RolesPermissionsSection } from "./sections/roles-permissions-section";
import { AnalyticsSection } from "./sections/analytics-section";
import { AuditLogsSection } from "./sections/audit-logs-section";
import { SystemSettingsSection } from "./sections/system-settings-section";

const DEFAULT_AIRPORTS: AirportDTO[] = [
  { id: "apt-jfk", iata: "JFK", icao: "KJFK", name: "Kennedy International Simulation Field", city: "New York", country: "USA", latitude: 40.6413, longitude: -73.7781, elevationFt: 13, status: "ACTIVE" },
  { id: "apt-hyd", iata: "HYD", icao: "VOHS", name: "Rajiv Gandhi International Simulation Field", city: "Hyderabad", country: "India", latitude: 17.2403, longitude: 78.4294, elevationFt: 2024, status: "ACTIVE" },
  { id: "apt-bom", iata: "BOM", icao: "VABB", name: "Chhatrapati Shivaji Maharaj Simulation Airport", city: "Mumbai", country: "India", latitude: 19.0896, longitude: 72.8656, elevationFt: 39, status: "ACTIVE" },
  { id: "apt-del", iata: "DEL", icao: "VIDP", name: "Indira Gandhi International Simulation Airport", city: "Delhi", country: "India", latitude: 28.5562, longitude: 77.1000, elevationFt: 777, status: "ACTIVE" },
  { id: "apt-dxb", iata: "DXB", icao: "OMDB", name: "Dubai International Simulation Field", city: "Dubai", country: "UAE", latitude: 25.2532, longitude: 55.3657, elevationFt: 62, status: "ACTIVE" },
  { id: "apt-sin", iata: "SIN", icao: "WSSS", name: "Singapore Changi Simulation Field", city: "Singapore", country: "Singapore", latitude: 1.3644, longitude: 103.9915, elevationFt: 22, status: "ACTIVE" },
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
    airports[0] || DEFAULT_AIRPORTS[0]
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
        return <AtcOperationsSection onOpenConsole={onOpenConsole} />;
      case "ground":
        return <GroundOpsSection onNavigateTo={(sec) => handleNavigateTo(sec)} />;
      case "emergencies":
        return <EmergenciesSection />;
      case "weather":
        return <WeatherSection />;
      case "airports":
        return (
          <AirportsSection
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
            onNavigateToCheckin={(pnr) => handleNavigateTo("checkin", { pnr })}
          />
        );
      case "passengers":
        return <PassengersSection onNavigateTo={handleNavigateTo} />;
      case "checkin":
        return (
          <CheckinSection
            initialPnr={sectionParams.pnr}
          />
        );
      case "verification":
        return <VerificationSection onNavigateTo={handleNavigateTo} />;
      case "boarding":
        return <BoardingSection onNavigateTo={(sec) => handleNavigateTo(sec)} />;
      case "staff":
        return <StaffSection />;
      case "departments":
        return <DepartmentsSection />;
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
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#070b13] text-slate-100 antialiased font-sans">
      {/* Top Authority Header */}
      <AuthorityHeader
        currentUser={currentUser}
        activeAirport={activeAirport}
        airports={airports}
        onSelectAirport={(apt) => setActiveAirport(apt)}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
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

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onSelect={(id) => handleNavigateTo(id)}
      />
    </div>
  );
}
