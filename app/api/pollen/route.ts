import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type PollenTypeCode = "TREE" | "GRASS" | "WEED";

const TYPE_ORDER: PollenTypeCode[] = ["TREE", "GRASS", "WEED"];
const CACHE_TTL_MS = 8 * 60 * 60 * 1000;

type PollenPayload = {
  regionCode: string | null;
  date: { year: number; month: number; day: number } | null;
  types: Array<{
    code: string;
    displayName: string;
    inSeason: boolean | null;
    value: number | null;
    category: string | null;
    color: string | null;
  }>;
};

type CacheEntry = {
  expiresAt: number;
  data: PollenPayload;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<PollenPayload>>();

function rgbFromApiColor(color?: { red?: number; green?: number; blue?: number } | null) {
  if (!color) return null;
  const r = Math.round((color.red ?? 0) * 255);
  const g = Math.round((color.green ?? 0) * 255);
  const b = Math.round((color.blue ?? 0) * 255);
  return `rgb(${r}, ${g}, ${b})`;
}

/** Proto3 JSON omits default scalars: false and 0. Google also omits indexInfo when a type has no data. */
function parseIndexValue(indexInfo: { value?: number } | null | undefined): number | null {
  if (!indexInfo) return null;
  if (typeof indexInfo.value === "number" && Number.isFinite(indexInfo.value)) return indexInfo.value;
  return 0;
}

function parseInSeason(entry: { inSeason?: boolean; indexInfo?: unknown } | null | undefined): boolean | null {
  if (!entry) return null;
  if (typeof entry.inSeason === "boolean") return entry.inSeason;
  return entry.indexInfo ? false : null;
}

async function fetchPollenFromGoogle(lat: string, lon: string, apiKey: string): Promise<PollenPayload> {
  const url = new URL("https://pollen.googleapis.com/v1/forecast:lookup");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("location.latitude", lat);
  url.searchParams.set("location.longitude", lon);
  url.searchParams.set("days", "1");
  url.searchParams.set("plantsDescription", "false");
  url.searchParams.set("languageCode", "en");

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`pollen fetch failed: ${res.status}${body ? ` ${body.slice(0, 200)}` : ""}`);
  }

  const json = await res.json();
  const forecastDay = json?.dailyInfo?.[0] ?? null;
  const byCode = new Map<string, any>();
  for (const entry of forecastDay?.pollenTypeInfo ?? []) {
    if (entry?.code) byCode.set(String(entry.code).toUpperCase(), entry);
  }

  const graminales = (forecastDay?.plantInfo ?? []).find(
    (plant: { code?: string }) => String(plant?.code ?? "").toUpperCase() === "GRAMINALES"
  );

  const types = TYPE_ORDER.map((code) => {
    const entry = byCode.get(code);
    const source = code === "GRASS" && !entry?.indexInfo && graminales?.indexInfo ? graminales : entry;
    const indexInfo = source?.indexInfo ?? null;
    return {
      code,
      displayName: entry?.displayName ?? code.charAt(0) + code.slice(1).toLowerCase(),
      inSeason: parseInSeason(source ?? entry),
      value: parseIndexValue(indexInfo),
      category: indexInfo?.category ?? null,
      color: rgbFromApiColor(indexInfo?.color)
    };
  });

  return {
    regionCode: json?.regionCode ?? null,
    date: forecastDay?.date ?? null,
    types
  };
}

async function getPollenPayload(lat: string, lon: string, apiKey: string) {
  const cacheKey = `${lat},${lon}`;
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.data;

  const pending = inflight.get(cacheKey);
  if (pending) return pending;

  const promise = fetchPollenFromGoogle(lat, lon, apiKey)
    .then((data) => {
      cache.set(cacheKey, { expiresAt: now + CACHE_TTL_MS, data });
      inflight.delete(cacheKey);
      return data;
    })
    .catch((error) => {
      inflight.delete(cacheKey);
      throw error;
    });

  inflight.set(cacheKey, promise);
  return promise;
}

export async function GET() {
  const apiKey = process.env.GOOGLE_POLLEN_API_KEY?.trim();
  const lat = process.env.NEXT_PUBLIC_STATION_LAT ?? "44.05";
  const lon = process.env.NEXT_PUBLIC_STATION_LON ?? "-123.09";

  if (!apiKey) {
    return NextResponse.json({ error: "Missing GOOGLE_POLLEN_API_KEY" }, { status: 500 });
  }

  try {
    const data = await getPollenPayload(lat, lon, apiKey);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=28800, s-maxage=28800, stale-while-revalidate=28800"
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Pollen error" }, { status: 500 });
  }
}
