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
    throw new Error(`forecast fetch failed: ${res.status}`);
  }

  return res.json();
}

export async function GET() {
  const lat = process.env.NEXT_PUBLIC_STATION_LAT ?? "44.05";
  const lon = process.env.NEXT_PUBLIC_STATION_LON ?? "-123.09";

  try {
    const points = await fetchJson(`https://api.weather.gov/points/${lat},${lon}`);
    const forecastUrl = points?.properties?.forecast;
    const hourlyUrl = points?.properties?.forecastHourly;
    const gridUrl = points?.properties?.forecastGridData;
    const timeZone = points?.properties?.timeZone ?? null;

    if (!forecastUrl || !hourlyUrl || !gridUrl) {
      return NextResponse.json({ error: "Missing forecast endpoints" }, { status: 502 });
    }

    const [daily, hourly, grid] = await Promise.all([
      fetchJson(forecastUrl),
      fetchJson(hourlyUrl),
      fetchJson(gridUrl)
    ]);

    return NextResponse.json(
      {
        daily: daily?.properties?.periods ?? [],
        hourly: hourly?.properties?.periods ?? [],
        grid: grid?.properties ?? null,
        timeZone
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800"
        }
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Forecast error" }, { status: 500 });
  }
}
