export type AircraftEntry = {
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

export type AircraftProviderId = "adsb.fi" | "airplanes.live";

export type AircraftSource = {
  id: AircraftProviderId;
  name: string;
  homeUrl: string;
  globeBase: string;
};

export type AircraftPayload = {
  count: number;
  aircraft: AircraftEntry[];
  updatedAt: string;
  radiusNm: number;
  source: AircraftSource;
  stale?: boolean;
  warning?: string;
};

export const AIRCRAFT_PROVIDERS: Record<
  AircraftProviderId,
  AircraftSource & { maxRadiusNm: number; pointUrl: (lat: number, lon: number, radiusNm: number) => string }
> = {
  "adsb.fi": {
    id: "adsb.fi",
    name: "adsb.fi",
    homeUrl: "https://adsb.fi",
    globeBase: "https://globe.adsb.fi/?icao=",
    maxRadiusNm: 250,
    pointUrl: (lat, lon, radiusNm) =>
      `https://opendata.adsb.fi/api/v3/lat/${lat}/lon/${lon}/dist/${radiusNm}`
  },
  "airplanes.live": {
    id: "airplanes.live",
    name: "airplanes.live",
    homeUrl: "https://airplanes.live",
    globeBase: "https://globe.airplanes.live/?icao=",
    maxRadiusNm: 250,
    pointUrl: (lat, lon, radiusNm) => `https://api.airplanes.live/v2/point/${lat}/${lon}/${radiusNm}`
  }
};

function parseProviderId(value: string | undefined): AircraftProviderId {
  return value === "airplanes.live" ? "airplanes.live" : "adsb.fi";
}

export function aircraftSource(id: AircraftProviderId): AircraftSource {
  const { name, homeUrl, globeBase } = AIRCRAFT_PROVIDERS[id];
  return { id, name, homeUrl, globeBase };
}

export function aircraftConfig() {
  const lat = Number(process.env.NEXT_PUBLIC_STATION_LAT ?? "44.05");
  const lon = Number(process.env.NEXT_PUBLIC_STATION_LON ?? "-123.09");
  const providerId = parseProviderId(process.env.AIRCRAFT_PROVIDER);
  const provider = AIRCRAFT_PROVIDERS[providerId];
  const radiusNm = Number(process.env.AIRCRAFT_RADIUS_NM ?? "5");
  const listLimit = Number(process.env.AIRCRAFT_LIST_LIMIT ?? "5");
  const cacheTtlMs = Number(process.env.AIRCRAFT_CACHE_TTL_MS ?? "25000");
  const requestTimeoutMs = Number(process.env.AIRCRAFT_REQUEST_TIMEOUT_MS ?? "10000");
  const userAgent =
    process.env.AIRCRAFT_USER_AGENT?.trim() ||
    process.env.NEXT_PUBLIC_NWS_USER_AGENT?.trim() ||
    "HCR Weather (personal non-commercial)";

  return {
    lat: Number.isFinite(lat) ? lat : 44.05,
    lon: Number.isFinite(lon) ? lon : -123.09,
    providerId,
    source: aircraftSource(providerId),
    userAgent,
    radiusNm: Number.isFinite(radiusNm) && radiusNm > 0 ? Math.min(radiusNm, provider.maxRadiusNm) : 5,
    listLimit: Number.isFinite(listLimit) && listLimit > 0 ? Math.min(Math.round(listLimit), 10) : 5,
    cacheTtlMs: Number.isFinite(cacheTtlMs) && cacheTtlMs > 0 ? cacheTtlMs : 25_000,
    requestTimeoutMs: Number.isFinite(requestTimeoutMs) && requestTimeoutMs > 0 ? requestTimeoutMs : 10_000
  };
}

export function aircraftPollIntervalMs() {
  const ms = Number(process.env.NEXT_PUBLIC_AIRCRAFT_POLL_INTERVAL_MS ?? "30000");
  return Number.isFinite(ms) && ms >= 5000 ? ms : 30_000;
}
