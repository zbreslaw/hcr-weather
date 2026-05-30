import { NextResponse } from "next/server";
import { fetchBurnRestrictions, type BurnRestrictionsData } from "@/lib/scrape/burn-restrictions";

export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 60 * 60 * 1000;

type CacheEntry = {
  expiresAt: number;
  data: BurnRestrictionsData;
};

let cache: CacheEntry | null = null;
let inflight: Promise<BurnRestrictionsData> | null = null;

async function getBurnRestrictions() {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.data;

  if (inflight) return inflight;

  inflight = fetchBurnRestrictions()
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
    const data = await getBurnRestrictions();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200"
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Burn restrictions error" }, { status: 500 });
  }
}
