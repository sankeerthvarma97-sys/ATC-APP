"use client";

import { useEffect, useState } from "react";
import type { FlightDTO } from "@/lib/domain";
import { PrimaryFlightDisplay } from "./primary-flight-display";

export function FlightDeckCockpit({
  initialFlights = [],
}: {
  initialFlights?: FlightDTO[];
}) {
  const [flights, setFlights] = useState<FlightDTO[]>(initialFlights);
  const [selectedFlightId, setSelectedFlightId] = useState<string>("");

  useEffect(() => {
    let active = true;
    const fetchFlights = async () => {
      try {
        const res = await fetch("/api/flights");
        if (res.ok) {
          const data = await res.json();
          if (active && data.flights) {
            setFlights(data.flights);
            if (!selectedFlightId && data.flights.length > 0) {
              // Default to SC101 or the first active flight
              const defaultFlight =
                data.flights.find((f: FlightDTO) => f.callsign === "SC101") || data.flights[0];
              setSelectedFlightId(defaultFlight.id);
            }
          }
        }
      } catch {
        // Fallback gracefully
      }
    };

    fetchFlights();
    const interval = setInterval(fetchFlights, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedFlightId]);

  const activeFlight = flights.find((f) => f.id === selectedFlightId) || flights[0];

  return (
    <div className="space-y-4">
      <PrimaryFlightDisplay
        flight={activeFlight}
        allFlights={flights}
        onSelectFlight={setSelectedFlightId}
      />
    </div>
  );
}
