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

const EVENT_TYPES = new Set([
  "Snow",
  "Lightning",
  "Rain",
  "Hail",
  "Ice",
  "Fog",
  "Temp",
  "Wind",
  "Power outage",
  "Equipment issue",
  "Other"
]);

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

export async function POST(req: Request) {
  const pin = process.env.ANNOTATION_PIN;
  if (!pin) {
    return NextResponse.json({ error: "Missing server PIN" }, { status: 500 });
  }

  const key = getClientKey(req);
  if (!withinRateLimit(key)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
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

  const eventType = String(payload?.eventType ?? "");
  if (!EVENT_TYPES.has(eventType)) {
    return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
  }

  const observedAt =
    payload?.observedAt && !Number.isNaN(new Date(payload.observedAt).getTime())
      ? new Date(payload.observedAt)
      : new Date();

  const description = payload?.description ? String(payload.description).trim() : null;
  const tagsInput = payload?.tags;
  const tags = Array.isArray(tagsInput)
    ? tagsInput.map((t: any) => String(t).trim().toLowerCase()).filter(Boolean)
    : typeof tagsInput === "string"
      ? tagsInput
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
      : [];

  const sql = `
    insert into annotations (event_type, observed_at, description, tags)
    values ($1, $2, $3, $4)
    returning id, event_type, observed_at, description, tags, created_at
  `;
  const params = [eventType, observedAt.toISOString(), description, tags];

  const { rows } = await pool.query(sql, params);
  return NextResponse.json(rows[0], {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json({ error: "Missing from/to" }, { status: 400 });
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return NextResponse.json({ error: "Invalid from/to" }, { status: 400 });
  }

  const sql = `
    select id, event_type, observed_at, description, tags, created_at
    from annotations
    where observed_at >= $1 and observed_at <= $2
    order by observed_at asc
  `;
  const { rows } = await pool.query(sql, [fromDate.toISOString(), toDate.toISOString()]);
  return NextResponse.json(rows, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
