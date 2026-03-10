"use client";

import { useEffect, useMemo } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";

import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MAP_ATTRIBUTION,
  MAP_TILE_URL,
} from "@/lib/maps/provider";

type LiveLocationMapProps = {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
};

const markerIcon = L.divIcon({
  className: "live-location-marker",
  html: '<span class="live-location-marker__dot"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function RecenterMap({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([latitude, longitude], Math.max(map.getZoom(), 16), {
      duration: 0.75,
    });
  }, [latitude, longitude, map]);

  return null;
}

export function LiveLocationMap({
  latitude,
  longitude,
  accuracyMeters,
}: LiveLocationMapProps) {
  const position = useMemo(
    () => ({ lat: latitude, lng: longitude }),
    [latitude, longitude],
  );

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-[var(--line)]">
      <MapContainer
        center={DEFAULT_MAP_CENTER}
        zoom={DEFAULT_MAP_ZOOM}
        scrollWheelZoom={false}
        className="h-72 w-full"
      >
        <TileLayer attribution={MAP_ATTRIBUTION} url={MAP_TILE_URL} />
        <RecenterMap latitude={latitude} longitude={longitude} />
        <Marker position={position} icon={markerIcon}>
          <Popup>
            You are here
            {accuracyMeters ? ` (${Math.round(accuracyMeters)}m accuracy)` : ""}
          </Popup>
        </Marker>
        {accuracyMeters ? (
          <Circle
            center={position}
            radius={accuracyMeters}
            pathOptions={{
              color: "#165d59",
              fillColor: "#165d59",
              fillOpacity: 0.12,
              weight: 1.5,
            }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}
