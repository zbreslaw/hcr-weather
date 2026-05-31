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

export type AircraftPayload = {
  count: number;
  aircraft: AircraftEntry[];
  updatedAt: string;
  radiusNm: number;
  stale?: boolean;
  warning?: string;
};

export function aircraftConfig() {
  const lat = Number(process.env.NEXT_PUBLIC_STATION_LAT ?? "44.05");
  const lon = Number(process.env.NEXT_PUBLIC_STATION_LON ?? "-123.09");
  const radiusNm = Number(process.env.AIRCRAFT_RADIUS_NM ?? "5");
  const listLimit = Number(process.env.AIRCRAFT_LIST_LIMIT ?? "5");
  const cacheTtlMs = Number(process.env.AIRCRAFT_CACHE_TTL_MS ?? "25000");
  const requestTimeoutMs = Number(process.env.AIRCRAFT_REQUEST_TIMEOUT_MS ?? "10000");

  return {
    lat: Number.isFinite(lat) ? lat : 44.05,
    lon: Number.isFinite(lon) ? lon : -123.09,
    radiusNm: Number.isFinite(radiusNm) && radiusNm > 0 ? radiusNm : 5,
    listLimit: Number.isFinite(listLimit) && listLimit > 0 ? Math.min(Math.round(listLimit), 10) : 5,
    cacheTtlMs: Number.isFinite(cacheTtlMs) && cacheTtlMs > 0 ? cacheTtlMs : 25_000,
    requestTimeoutMs: Number.isFinite(requestTimeoutMs) && requestTimeoutMs > 0 ? requestTimeoutMs : 10_000
  };
}

export function aircraftPollIntervalMs() {
  const ms = Number(process.env.NEXT_PUBLIC_AIRCRAFT_POLL_INTERVAL_MS ?? "30000");
  return Number.isFinite(ms) && ms >= 5000 ? ms : 30_000;
}
