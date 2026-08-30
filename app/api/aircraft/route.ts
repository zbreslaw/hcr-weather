import { NextResponse } from "next/server";
import { aircraftConfig, type AircraftPayload } from "@/lib/aircraft/config";
import { fetchAircraftFromUpstream, parseAircraftResponse } from "@/lib/aircraft/fetch";

export const dynamic = "force-dynamic";

type CacheEntry = {
  expiresAt: number;
  data: AircraftPayload;
};

let cache: CacheEntry | null = null;
let lastGood: AircraftPayload | null = null;
let inflight: Promise<AircraftPayload> | null = null;

function buildPayload(
  parsed: { count: number; aircraft: AircraftPayload["aircraft"] },
  radiusNm: number,
  source: AircraftPayload["source"],
  extra?: Pick<AircraftPayload, "stale" | "warning">
): AircraftPayload {
  return {
    count: parsed.count,
    aircraft: parsed.aircraft,
    updatedAt: new Date().toISOString(),
    radiusNm,
    source,
    ...extra
  };
}

async function loadAircraft(): Promise<AircraftPayload> {
  const { lat, lon, radiusNm, listLimit, cacheTtlMs, requestTimeoutMs, providerId, source, userAgent } =
    aircraftConfig();
  const now = Date.now();

  if (cache && cache.expiresAt > now) return cache.data;

  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const json = (await fetchAircraftFromUpstream(
        lat,
        lon,
        radiusNm,
        requestTimeoutMs,
        providerId,
        userAgent
      )) as Parameters<typeof parseAircraftResponse>[0];
      const parsed = parseAircraftResponse(json, lat, lon, listLimit);
      const data = buildPayload(parsed, radiusNm, source);
      cache = { expiresAt: now + cacheTtlMs, data };
      lastGood = data;
      return data;
    } catch (error: any) {
      if (lastGood) {
        return buildPayload(
          { count: lastGood.count, aircraft: lastGood.aircraft },
          radiusNm,
          lastGood.source ?? source,
          { stale: true, warning: error?.message ?? "Upstream fetch failed" }
        );
      }
      throw error;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export async function GET() {
  const { cacheTtlMs } = aircraftConfig();

  try {
    const data = await loadAircraft();
    const maxAge = Math.max(1, Math.round(cacheTtlMs / 1000));

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": `public, max-age=${maxAge}, s-maxage=${maxAge}`
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Aircraft data unavailable" },
      { status: 502 }
    );
  }
}
