import { NextResponse } from "next/server";
import { getProvider } from "@/lib/data/provider";

export async function GET() {
  const provider = getProvider();
  const latest = await provider.latest();

  return NextResponse.json(latest, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60"
    }
  });
}
