import { NextResponse } from "next/server";
import { getProvider } from "@/lib/data/provider";

export const dynamic = "force-dynamic";

export async function GET() {
  const provider = getProvider();
  const latest = await provider.latest();

  return NextResponse.json(latest, {
    headers: {
      "Cache-Control": "no-store, max-age=0"
    }
  });
}
