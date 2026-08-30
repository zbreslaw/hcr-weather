import { decodeCallsign } from "@/lib/data/airline-prefixes";
import { formatBearing, haversineDistanceNm, initialBearingDeg } from "@/lib/utils/geo";
import { AIRCRAFT_PROVIDERS, type AircraftEntry, type AircraftProviderId } from "./config";

/** Raw aircraft object from airplanes.live / adsb.fi `ac` arrays. */
type RawAircraft = {
  hex?: string;
  flight?: string;
  r?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | string;
  gs?: number;
  track?: number;
};

type RawResponse = {
  ac?: RawAircraft[];
  aircraft?: RawAircraft[];
};

function parseAltitude(altBaro: number | string | undefined) {
  if (altBaro === "ground") return { altitudeFt: null, altitudeLabel: "On ground" };
  if (typeof altBaro === "number" && Number.isFinite(altBaro)) {
    return { altitudeFt: altBaro, altitudeLabel: `${Math.round(altBaro).toLocaleString()} ft` };
  }
  return { altitudeFt: null, altitudeLabel: "—" };
}

function parsePosition(raw: RawAircraft) {
  const lat = raw.lat;
  const lon = raw.lon;
  if (typeof lat !== "number" || typeof lon !== "number" || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }
  return { lat, lon };
}

function parseCallsign(raw: RawAircraft) {
  const flight = raw.flight?.trim();
  if (flight) return decodeCallsign(flight);

  const registration = raw.r?.trim();
  if (registration) return { callsign: registration, displayName: registration };

  const hex = raw.hex?.trim();
  if (hex) return { callsign: hex.toUpperCase(), displayName: hex.toUpperCase() };

  return { callsign: "", displayName: "Unknown" };
}

export function parseAircraftResponse(
  json: RawResponse,
  stationLat: number,
  stationLon: number,
  listLimit: number
): { count: number; aircraft: AircraftEntry[] } {
  const rawList = Array.isArray(json?.ac) ? json.ac : Array.isArray(json?.aircraft) ? json.aircraft : [];
  const entries: AircraftEntry[] = [];

  for (const raw of rawList) {
    const position = parsePosition(raw);
    if (!position) continue;

    const hex = raw.hex?.trim()?.toUpperCase();
    if (!hex) continue;

    const { callsign, displayName } = parseCallsign(raw);
    const { altitudeFt, altitudeLabel } = parseAltitude(raw.alt_baro);
    const distanceNm = haversineDistanceNm(stationLat, stationLon, position.lat, position.lon);
    const bearingDeg = initialBearingDeg(stationLat, stationLon, position.lat, position.lon);
    const groundSpeedKt = typeof raw.gs === "number" && Number.isFinite(raw.gs) ? raw.gs : null;
    const trackDeg = typeof raw.track === "number" && Number.isFinite(raw.track) ? raw.track : null;

    entries.push({
      hex,
      callsign,
      displayName,
      altitudeFt,
      altitudeLabel,
      groundSpeedKt,
      trackDeg,
      distanceNm,
      bearingDeg,
      bearingLabel: formatBearing(bearingDeg)
    });
  }

  entries.sort((a, b) => a.distanceNm - b.distanceNm);

  return {
    count: entries.length,
    aircraft: entries.slice(0, listLimit)
  };
}

export async function fetchAircraftFromUpstream(
  lat: number,
  lon: number,
  radiusNm: number,
  timeoutMs: number,
  providerId: AircraftProviderId,
  userAgent: string
): Promise<unknown> {
  const provider = AIRCRAFT_PROVIDERS[providerId];
  const url = provider.pointUrl(lat, lon, radiusNm);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": userAgent
      },
      cache: "no-store"
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`${provider.name} ${res.status}${body ? `: ${body.slice(0, 120)}` : ""}`);
    }

    return res.json();
  } finally {
    clearTimeout(timer);
  }
}
