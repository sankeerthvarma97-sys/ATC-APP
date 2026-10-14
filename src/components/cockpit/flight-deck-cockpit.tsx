"use client";

import { useState, useCallback } from "react";
import type { FlightDTO } from "@/lib/domain";
import { useOperationalPolling } from "@/lib/hooks/use-operational-polling";
import { PrimaryFlightDisplay } from "./primary-flight-display";

export function FlightDeckCockpit({
  initialFlights = [],
}: {
  initialFlights?: FlightDTO[];
}) {
  const [flights, setFlights] = useState<FlightDTO[]>(initialFlights);
  const [selectedFlightId, setSelectedFlightId] = useState<string>("");

  const fetchFlights = useCallback(async () => {
    try {
      const res = await fetch("/api/flights");
      if (res.ok) {
        const data = await res.json();
        if (data.flights) {
          setFlights(data.flights);
          if (!selectedFlightId && data.flights.length > 0) {
            const defaultFlight =
              data.flights.find((f: FlightDTO) => f.callsign === "SC101") || data.flights[0];
            setSelectedFlightId(defaultFlight.id);
          }
        }
      }
    } catch {
      // Fallback gracefully
    }
  }, [selectedFlightId]);

  useOperationalPolling(fetchFlights, 4000);

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
