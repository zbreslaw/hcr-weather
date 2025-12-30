import { NextResponse } from "next/server";

const USER_AGENT = process.env.NEXT_PUBLIC_NWS_USER_AGENT ?? "";

async function fetchJson(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/geo+json"
    }
  });

  if (!res.ok) {
    throw new Error(`alerts fetch failed: ${res.status}`);
  }

  return res.json();
}

export async function GET() {
  const lat = process.env.NEXT_PUBLIC_STATION_LAT ?? "44.05";
  const lon = process.env.NEXT_PUBLIC_STATION_LON ?? "-123.09";

  try {
    const url = `https://api.weather.gov/alerts/active?point=${lat},${lon}`;
    const data = await fetchJson(url);
    const alerts =
      data?.features?.map((f: any) => ({
        id: f?.id ?? null,
        event: f?.properties?.event ?? null,
        severity: f?.properties?.severity ?? null,
        headline: f?.properties?.headline ?? null,
        effective: f?.properties?.effective ?? null,
        ends: f?.properties?.ends ?? null
      })) ?? [];

    return NextResponse.json(
      { alerts },
      {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200"
        }
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Alerts error" }, { status: 500 });
  }
}
