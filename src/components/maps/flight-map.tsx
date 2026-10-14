"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { Circle, CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import type { AirportDTO, FlightDTO } from "@/lib/domain";
import { Badge } from "@/components/ui/badge";

export interface FlightMapProps {
  flights: FlightDTO[];
  activeAirport?: AirportDTO;
  selectedFlightId?: string | null;
  onSelectFlight?: (flight: FlightDTO) => void;
}

const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const tileUrl = mapboxToken
  ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}@2x?access_token=${mapboxToken}`
  : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const attribution = mapboxToken
  ? '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// Default: Rajiv Gandhi International Airport (HYD / VOHS)
const DEFAULT_CENTER: [number, number] = [17.2403, 78.4294];

// Convert Nautical Miles to meters for Leaflet Circles
const NM_TO_METERS = 1852;

// Calculate distance between two lat/lon coordinates in Nautical Miles
function calculateDistanceNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // Earth radius in NM
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Project vector endpoint given origin, heading, and speed
function calculateVectorEndpoint(lat: number, lon: number, headingDeg: number, speedKt: number, minutes = 2): [number, number] {
  const distanceNm = (Math.max(120, speedKt) / 60) * minutes;
  const angularDist = distanceNm / 3440.065;
  const radLat = lat * (Math.PI / 180);
  const radLon = lon * (Math.PI / 180);
  const radHeading = headingDeg * (Math.PI / 180);

  const endLat = Math.asin(
    Math.sin(radLat) * Math.cos(angularDist) +
    Math.cos(radLat) * Math.sin(angularDist) * Math.cos(radHeading)
  );
  const endLon = radLon + Math.atan2(
    Math.sin(radHeading) * Math.sin(angularDist) * Math.cos(radLat),
    Math.cos(angularDist) - Math.sin(radLat) * Math.sin(endLat)
  );

  return [endLat * (180 / Math.PI), endLon * (180 / Math.PI)];
}

// Controller to smoothly pan when activeAirport changes
function MapViewSync({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [center[0], center[1], zoom, map]);
  return null;
}

function markerFor(flight: FlightDTO, isSelected: boolean, tcasLevel: "NONE" | "TA" | "RA") {
  let color = "#38bdf8"; // standard radar sky blue
  let glow = "none";

  if (flight.status === "EMERGENCY" || flight.squawk === "7700" || tcasLevel === "RA") {
    color = "#ef4444"; // red alert
    glow = "0 0 10px #ef4444, 0 0 20px #ef4444";
  } else if (flight.status === "HOLDING" || tcasLevel === "TA") {
    color = "#f59e0b"; // amber warning
    glow = "0 0 8px #f59e0b";
  } else if (isSelected) {
    color = "#00f0ff"; // bright cyan
    glow = "0 0 10px #00f0ff";
  }

  const pulseRing = tcasLevel === "RA" || flight.status === "EMERGENCY"
    ? `<div style="position:absolute; width:34px; height:34px; border:2px solid ${color}; border-radius:50%; animation:ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; top:-4px; left:-4px;"></div>`
    : "";

  return L.divIcon({
    className: "aocc-aircraft-marker",
    html: `
      <div style="position:relative; width:26px; height:26px;">
        ${pulseRing}
        <div style="width:26px; height:26px; display:flex; align-items:center; justify-content:center; color:${color}; text-shadow:${glow}; transform: rotate(${flight.headingDeg}deg); font-size:16px; font-weight:bold;">
          ▲
        </div>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

export function FlightMap({
  flights,
  activeAirport,
  selectedFlightId,
  onSelectFlight,
}: FlightMapProps) {
  const center: [number, number] = useMemo(() => {
    if (activeAirport && activeAirport.latitude && activeAirport.longitude) {
      return [activeAirport.latitude, activeAirport.longitude];
    }
    return DEFAULT_CENTER;
  }, [activeAirport]);

  // Compute TCAS Proximity Conflict Status for every flight
  const tcasMap = useMemo(() => {
    const map = new Map<string, "NONE" | "TA" | "RA">();
    const airborne = flights.filter(
      (f) => f.altitudeFt > 400 && f.status !== "LANDED" && f.status !== "AT_GATE"
    );

    for (let i = 0; i < airborne.length; i++) {
      for (let j = i + 1; j < airborne.length; j++) {
        const f1 = airborne[i];
        const f2 = airborne[j];
        const distNm = calculateDistanceNm(f1.latitude, f1.longitude, f2.latitude, f2.longitude);
        const vertSepFt = Math.abs(f1.altitudeFt - f2.altitudeFt);

        if (distNm < 3.0 && vertSepFt < 800) {
          map.set(f1.id, "RA");
          map.set(f2.id, "RA");
        } else if (distNm < 5.0 && vertSepFt < 1200) {
          if (map.get(f1.id) !== "RA") map.set(f1.id, "TA");
          if (map.get(f2.id) !== "RA") map.set(f2.id, "TA");
        }
      }
    }
    return map;
  }, [flights]);

  const airportName = activeAirport?.name || "Hyderabad Rajiv Gandhi Intl";
  const airportIata = activeAirport?.iata || "HYD";

  return (
    <div className="relative h-full min-h-[440px] w-full rounded-lg overflow-hidden border border-border">
      {/* Radar Overlay Metadata Badge */}
      <div className="absolute top-2.5 right-2.5 z-[1000] bg-background/85 backdrop-blur border border-border/80 px-2.5 py-1 rounded text-[11px] font-mono text-muted-foreground flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>RADAR: {airportIata} TMA</span>
        <span className="text-primary font-semibold">({flights.length} TRACKS)</span>
      </div>

      <MapContainer
        center={center}
        zoom={9}
        minZoom={5}
        maxZoom={14}
        scrollWheelZoom
        className="h-full min-h-[440px] w-full rounded-lg bg-[#070b13]"
      >
        <MapViewSync center={center} zoom={9} />

        <TileLayer
          attribution={attribution}
          url={tileUrl}
          tileSize={mapboxToken ? 512 : 256}
          zoomOffset={mapboxToken ? -1 : 0}
        />

        {/* Airport Reference Center Marker */}
        <CircleMarker
          center={center}
          radius={7}
          pathOptions={{ color: "#38bdf8", fillColor: "#0284c7", fillOpacity: 0.9, weight: 2 }}
        >
          <Popup>
            <div className="font-sans text-xs space-y-1">
              <strong className="text-sm font-bold text-foreground">
                {airportIata} — {airportName}
              </strong>
              <p className="text-muted-foreground">Elevation: {activeAirport?.elevationFt ?? 2024} ft MSL</p>
              <p className="text-muted-foreground font-mono">
                Lat: {center[0].toFixed(4)}° | Lon: {center[1].toFixed(4)}°
              </p>
            </div>
          </Popup>
        </CircleMarker>

        {/* Radar Range Rings (10nm, 25nm, 45nm) */}
        <Circle
          center={center}
          radius={10 * NM_TO_METERS}
          pathOptions={{ color: "#38bdf8", weight: 1, dashArray: "3, 5", fillOpacity: 0.03 }}
        />
        <Circle
          center={center}
          radius={25 * NM_TO_METERS}
          pathOptions={{ color: "#0284c7", weight: 1, dashArray: "4, 6", fillOpacity: 0.02 }}
        />
        <Circle
          center={center}
          radius={45 * NM_TO_METERS}
          pathOptions={{ color: "#0369a1", weight: 1, dashArray: "5, 8", fillOpacity: 0.01 }}
        />

        {/* Primary Runway Centerline Orientation Vectors */}
        <Polyline
          positions={[
            calculateVectorEndpoint(center[0], center[1], 93, 100, 3),
            calculateVectorEndpoint(center[0], center[1], 273, 100, 3),
          ]}
          pathOptions={{ color: "#22c55e", weight: 3, opacity: 0.7 }}
        />

        {/* Aircraft Tracks & Projected Velocity Vectors */}
        {flights.map((flight) => {
          const isSelected = flight.id === selectedFlightId;
          const tcasLevel = tcasMap.get(flight.id) || "NONE";
          const vectorEnd = calculateVectorEndpoint(
            flight.latitude,
            flight.longitude,
            flight.headingDeg,
            flight.speedKt,
            2
          );

          return (
            <div key={flight.id}>
              {/* Projected 2-Minute Flight Path Leader Line */}
              <Polyline
                positions={[
                  [flight.latitude, flight.longitude],
                  vectorEnd,
                ]}
                pathOptions={{
                  color: isSelected ? "#00f0ff" : tcasLevel === "RA" ? "#ef4444" : "#38bdf8",
                  weight: isSelected ? 2.5 : 1.5,
                  dashArray: "2, 3",
                  opacity: 0.8,
                }}
              />

              {/* Target Aircraft Marker */}
              <Marker
                position={[flight.latitude, flight.longitude]}
                icon={markerFor(flight, isSelected, tcasLevel)}
                eventHandlers={{
                  click: () => onSelectFlight?.(flight),
                }}
              >
                <Popup>
                  <div className="space-y-2 text-xs font-sans min-w-[200px]">
                    <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-1.5">
                      <div>
                        <strong className="text-sm font-bold text-foreground">{flight.callsign}</strong>
                        {flight.flightNumber && flight.flightNumber !== flight.callsign && (
                          <span className="text-muted-foreground ml-1">({flight.flightNumber})</span>
                        )}
                      </div>
                      <Badge
                        variant={
                          flight.status === "EMERGENCY" || tcasLevel === "RA"
                            ? "destructive"
                            : flight.status === "HOLDING" || tcasLevel === "TA"
                            ? "warning"
                            : "default"
                        }
                        className="text-[10px] px-1.5 py-0"
                      >
                        {tcasLevel === "RA" ? "TCAS RA" : flight.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                      <div>Airline: <strong className="text-foreground">{flight.airline}</strong></div>
                      <div>Type: <strong className="text-foreground">{flight.aircraftType}</strong></div>
                      <div>Alt: <strong className="font-mono text-foreground">{flight.altitudeFt.toLocaleString()} ft</strong></div>
                      <div>Speed: <strong className="font-mono text-foreground">{flight.speedKt} kt</strong></div>
                      <div>Hdg: <strong className="font-mono text-foreground">{flight.headingDeg}°</strong></div>
                      <div>Squawk: <strong className="font-mono text-foreground">{flight.squawk || "1200"}</strong></div>
                    </div>

                    <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                      Phase: <span className="text-foreground font-medium">{flight.phase}</span>
                    </p>

                    {tcasLevel !== "NONE" && (
                      <div className={`p-1.5 rounded text-[10px] font-bold ${
                        tcasLevel === "RA"
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                      }`}>
                        ⚠️ {tcasLevel === "RA" ? "TCAS RESOLUTION ADVISORY" : "TRAFFIC ADVISORY DETECTED"}
                      </div>
                    )}

                    {onSelectFlight && (
                      <button
                        type="button"
                        onClick={() => onSelectFlight(flight)}
                        className="w-full mt-2 py-1 px-2 rounded bg-primary text-primary-foreground text-center font-semibold text-[11px] hover:bg-primary/90 transition-colors"
                      >
                        Select for Tactical Clearance
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}
