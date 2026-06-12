import { NextResponse } from "next/server";
import { Pool } from "pg";
import type { ElectricUsageDay } from "@/lib/data/electric-types";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined
});

function toDateKey(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");
}

export async function GET(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json([], {
      headers: { "Cache-Control": "no-store, max-age=0" }
    });
  }

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
    select usage_date::text as usage_date, kwh, demand_kw
    from electric_usage
    where usage_date >= $1::date and usage_date <= $2::date
    order by usage_date asc
  `;

  const { rows } = await pool.query(sql, [toDateKey(fromDate), toDateKey(toDate)]);
  const data: ElectricUsageDay[] = rows.map((row) => ({
    usage_date: row.usage_date,
    kwh: row.kwh == null ? null : Number(row.kwh),
    demand_kw: row.demand_kw == null ? null : Number(row.demand_kw)
  }));

  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store, max-age=0" }
  });
}
