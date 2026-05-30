import { NextResponse } from "next/server";
import { fetchFireDanger, type FireDangerData } from "@/lib/scrape/fire-danger";

export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 60 * 60 * 1000;

type CacheEntry = {
  expiresAt: number;
  data: FireDangerData;
};

let cache: CacheEntry | null = null;
let inflight: Promise<FireDangerData> | null = null;

async function getFireDanger() {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.data;

  if (inflight) return inflight;

  inflight = fetchFireDanger()
    .then((data) => {
      cache = { expiresAt: now + CACHE_TTL_MS, data };
      inflight = null;
      return data;
    })
    .catch((error) => {
      inflight = null;
      throw error;
    });

  return inflight;
}

export async function GET() {
  try {
    const data = await getFireDanger();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200"
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Fire danger error" }, { status: 500 });
  }
}
