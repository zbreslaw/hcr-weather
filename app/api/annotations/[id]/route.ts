import { NextResponse } from "next/server";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined
});

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 3;
const rateLimit = new Map<string, number[]>();

function getClientKey(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

function withinRateLimit(key: string) {
  const now = Date.now();
  const existing = rateLimit.get(key) ?? [];
  const fresh = existing.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (fresh.length >= RATE_LIMIT_MAX) {
    rateLimit.set(key, fresh);
    return false;
  }
  fresh.push(now);
  rateLimit.set(key, fresh);
  return true;
}

export async function DELETE(req: Request, context: { params: { id: string } }) {
  const pin = process.env.ANNOTATION_PIN;
  if (!pin) {
    return NextResponse.json({ error: "Missing server PIN" }, { status: 500 });
  }

  const key = getClientKey(req);
  if (!withinRateLimit(key)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const id = Number(context.params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload?.honeypot) {
    return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  }

  if (payload?.pin !== pin) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  const sql = "delete from annotations where id = $1 returning id";
  const { rows } = await pool.query(sql, [id]);
  if (!rows.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ id }, { headers: { "Cache-Control": "no-store" } });
}
