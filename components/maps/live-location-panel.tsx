"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

type LocationState =
  | {
      status: "idle";
    }
  | {
      status: "requesting";
    }
  | {
      status: "tracking";
      latitude: number;
      longitude: number;
      accuracyMeters: number | null;
      updatedAt: number;
    }
  | {
      status: "error";
      message: string;
    };

const LiveLocationMap = dynamic(
  () =>
    import("@/components/maps/live-location-map").then((module) => module.LiveLocationMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-72 items-center justify-center rounded-[1.5rem] border border-[var(--line)] bg-white/70 text-sm text-[var(--muted)]">
        Loading map...
      </div>
    ),
  },
);

function getLocationErrorMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) {
    return "Location permission was denied. Enable it in your browser settings and try again.";
  }

  if (error.code === error.POSITION_UNAVAILABLE) {
    return "Your location is unavailable right now. Try moving to a clearer area.";
  }

  if (error.code === error.TIMEOUT) {
    return "Location request timed out. Try again with a better signal.";
  }

  return "Unable to read your location right now.";
}

export function LiveLocationPanel() {
  const [locationState, setLocationState] = useState<LocationState>({
    status: "idle",
  });
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const handleEnableLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocationState({
        status: "error",
        message: "Geolocation is not supported in this browser.",
      });
      return;
    }

    setLocationState({
      status: "requesting",
    });

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setLocationState({
          status: "tracking",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: Number.isFinite(position.coords.accuracy)
            ? position.coords.accuracy
            : null,
          updatedAt: position.timestamp,
        });
      },
      (error) => {
        setLocationState({
          status: "error",
          message: getLocationErrorMessage(error),
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      },
    );
  };

  return (
    <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Your location</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Request permission, then keep watching your exact current position
            on the map.
          </p>
        </div>
        <button
          type="button"
          onClick={handleEnableLocation}
          className="min-h-12 rounded-2xl bg-[var(--brand)] px-4 text-sm font-semibold text-white"
        >
          {locationState.status === "requesting"
            ? "Requesting..."
            : locationState.status === "tracking"
              ? "Refresh tracking"
              : "Enable location"}
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {locationState.status === "idle" ? (
          <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
            This asks the browser for location access only after you tap the
            button. On iPhone Safari and Chrome mobile, location requires HTTPS
            and a user gesture.
          </div>
        ) : null}

        {locationState.status === "requesting" ? (
          <div className="rounded-[1.5rem] border border-[var(--line)] bg-white/75 px-4 py-3 text-sm text-[var(--muted)]">
            Waiting for location permission and GPS fix...
          </div>
        ) : null}

        {locationState.status === "error" ? (
          <div className="rounded-[1.5rem] border border-[#d8a39a] bg-[#fff2ef] px-4 py-3 text-sm text-[#9d3b28]">
            {locationState.message}
          </div>
        ) : null}

        {locationState.status === "tracking" ? (
          <>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-white/75 p-3">
                <p className="font-semibold text-[var(--brand-strong)]">Latitude</p>
                <p className="mt-2 text-[var(--muted)]">
                  {locationState.latitude.toFixed(6)}
                </p>
              </div>
              <div className="rounded-2xl bg-white/75 p-3">
                <p className="font-semibold text-[var(--brand-strong)]">Longitude</p>
                <p className="mt-2 text-[var(--muted)]">
                  {locationState.longitude.toFixed(6)}
                </p>
              </div>
              <div className="rounded-2xl bg-white/75 p-3">
                <p className="font-semibold text-[var(--brand-strong)]">Accuracy</p>
                <p className="mt-2 text-[var(--muted)]">
                  {locationState.accuracyMeters
                    ? `${Math.round(locationState.accuracyMeters)} m`
                    : "Unknown"}
                </p>
              </div>
              <div className="rounded-2xl bg-white/75 p-3">
                <p className="font-semibold text-[var(--brand-strong)]">Updated</p>
                <p className="mt-2 text-[var(--muted)]">
                  {new Date(locationState.updatedAt).toLocaleTimeString()}
                </p>
              </div>
            </div>

            <LiveLocationMap
              latitude={locationState.latitude}
              longitude={locationState.longitude}
              accuracyMeters={locationState.accuracyMeters}
            />
          </>
        ) : null}
      </div>
    </section>
  );
}
