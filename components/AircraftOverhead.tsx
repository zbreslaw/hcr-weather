"use client";

import { useCallback, useEffect, useState } from "react";
import { aircraftPollIntervalMs } from "@/lib/aircraft/config";

type AircraftEntry = {
  hex: string;
  callsign: string;
  displayName: string;
  altitudeFt: number | null;
  altitudeLabel: string;
  groundSpeedKt: number | null;
  trackDeg: number | null;
  distanceNm: number;
  bearingDeg: number;
  bearingLabel: string;
};

type AircraftPayload = {
  count: number;
  aircraft: AircraftEntry[];
  updatedAt: string;
  radiusNm: number;
  source?: {
    name: string;
    homeUrl: string;
    globeBase: string;
  };
  stale?: boolean;
  warning?: string;
};

const DEFAULT_SOURCE = {
  name: "adsb.fi",
  homeUrl: "https://adsb.fi",
  globeBase: "https://globe.adsb.fi/?icao="
};

function formatUpdatedAt(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

function formatDistance(nm: number) {
  return nm < 10 ? `${nm.toFixed(1)} nm` : `${Math.round(nm)} nm`;
}

function formatSpeed(kt: number | null) {
  if (kt == null) return "—";
  return `${Math.round(kt)} kt`;
}

function formatHeading(deg: number | null) {
  if (deg == null) return "—";
  return `${Math.round(deg)}°`;
}

function globeUrlForHex(hex: string, globeBase: string) {
  return `${globeBase}${encodeURIComponent(hex.toLowerCase())}`;
}

export default function AircraftOverhead() {
  const pollMs = aircraftPollIntervalMs();
  const [data, setData] = useState<AircraftPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/aircraft");
      const json = await res.json().catch(() => null);

      if (!res.ok || json?.error) {
        throw new Error(json?.error ?? `Aircraft error ${res.status}`);
      }

      setData(json as AircraftPayload);
      setError(json?.warning ?? null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load aircraft");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      if (cancelled) return;
      await load();
    }

    tick();
    const id = setInterval(tick, pollMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [load, pollMs]);

  const updatedLabel = formatUpdatedAt(data?.updatedAt ?? null);
  const showEmpty = !loading && !error && data?.count === 0;
  const source = data?.source ?? DEFAULT_SOURCE;

  return (
    <div className="panel">
      <div className="panelHeader">
        <div>Aircraft Overhead</div>
        <div className="muted">
          {loading && !data ? "Loading…" : updatedLabel ? `Updated ${updatedLabel}` : " "}
          {data?.stale ? " (cached)" : ""}
        </div>
      </div>
      <div className="panelBody aircraftOverheadBody">
        {error && !data ? <div className="aircraftOverheadError">{error}</div> : null}
        {error && data ? <div className="aircraftOverheadWarning">{error}</div> : null}

        {data && !loading ? (
          <div className="aircraftOverheadCount">
            {data.count} aircraft within {data.radiusNm} nm
          </div>
        ) : null}

        {showEmpty ? <div className="muted">No aircraft overhead right now.</div> : null}

        {data?.aircraft?.length ? (
          <div className="aircraftOverheadList">
            {data.aircraft.map((ac) => (
              <div className="aircraftOverheadItem" key={ac.hex}>
                <div className="aircraftOverheadCallsign">
                  <a
                    href={globeUrlForHex(ac.hex, source.globeBase)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aircraftOverheadCallsignLink"
                  >
                    {ac.displayName || ac.callsign || ac.hex}
                  </a>
                </div>
                <div className="aircraftOverheadMeta">
                  <span>{ac.altitudeLabel}</span>
                  <span>{formatSpeed(ac.groundSpeedKt)}</span>
                  <span>{formatHeading(ac.trackDeg)}</span>
                </div>
                <div className="aircraftOverheadMeta">
                  <span>{formatDistance(ac.distanceNm)} away</span>
                  <span>{ac.bearingLabel}</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="aircraftOverheadFooter">
          Data from{" "}
          <a href={source.homeUrl} target="_blank" rel="noopener noreferrer" className="aircraftOverheadLink">
            {source.name}
          </a>{" "}
          (non-commercial use)
        </div>
      </div>
    </div>
  );
}
