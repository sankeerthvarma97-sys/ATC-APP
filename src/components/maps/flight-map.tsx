"use client";

import L from "leaflet";
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import type { FlightDTO } from "@/lib/domain";
import { Badge } from "@/components/ui/badge";

const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const tileUrl = mapboxToken
  ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}@2x?access_token=${mapboxToken}`
  : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const attribution = mapboxToken
  ? '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function markerFor(flight: FlightDTO) {
  const color = flight.status === "EMERGENCY" ? "#ef4444" : flight.status === "HOLDING" ? "#f59e0b" : "#38bdf8";
  return L.divIcon({
    className: "aocc-aircraft-marker",
    html: `<div style="--aircraft-color:${color}; transform: rotate(${flight.headingDeg}deg)">▲</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

export function FlightMap({ flights }: { flights: FlightDTO[] }) {
  return (
    <MapContainer
      center={[40.6413, -73.7781]}
      zoom={9}
      minZoom={7}
      maxZoom={13}
      scrollWheelZoom
      className="h-full min-h-[420px] w-full rounded-lg"
    >
      <TileLayer attribution={attribution} url={tileUrl} tileSize={mapboxToken ? 512 : 256} zoomOffset={mapboxToken ? -1 : 0} />
      <CircleMarker center={[40.6413, -73.7781]} radius={8} pathOptions={{ color: "#22c55e", fillOpacity: 0.6 }}>
        <Popup>KJFK simulation field</Popup>
      </CircleMarker>
      <Polyline
        positions={[
          [40.62, -73.86],
          [40.67, -73.71],
        ]}
        pathOptions={{ color: "#22c55e", weight: 5, opacity: 0.55 }}
      />
      <Polyline
        positions={[
          [40.59, -73.84],
          [40.68, -73.75],
        ]}
        pathOptions={{ color: "#38bdf8", weight: 5, opacity: 0.45 }}
      />
      {flights.map((flight) => (
        <Marker key={flight.id} position={[flight.latitude, flight.longitude]} icon={markerFor(flight)}>
          <Popup>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-3">
                <strong className="text-sm">{flight.callsign}</strong>
                <Badge variant={flight.status === "EMERGENCY" ? "destructive" : flight.status === "HOLDING" ? "warning" : "info"}>
                  {flight.status}
                </Badge>
              </div>
              <div>{flight.airline} {flight.aircraftType}</div>
              <div>{flight.phase}</div>
              <div>ALT {flight.altitudeFt.toLocaleString()} ft · SPD {flight.speedKt} kt · HDG {flight.headingDeg}</div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
