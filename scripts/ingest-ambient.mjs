import dotenv from "dotenv";
import { existsSync } from "fs";

const envPath = existsSync(".env.local") ? ".env.local" : ".env";
dotenv.config({ path: envPath });
import { Pool } from "pg";

const {
  AMBIENT_API_KEY,
  AMBIENT_APP_KEY,
  DATABASE_URL,
  PGSSL
} = process.env;

if (!AMBIENT_API_KEY || !AMBIENT_APP_KEY) {
  throw new Error("Missing AMBIENT_API_KEY or AMBIENT_APP_KEY");
}
if (!DATABASE_URL) {
  throw new Error("Missing DATABASE_URL");
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: PGSSL === "true" ? { rejectUnauthorized: false } : undefined
});

function pickNumber(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Ambient typically returns either an object or an array. Handle both.
function unwrapObservation(deviceJson) {
  return deviceJson[0].lastData;
}

function parseTime(obs) {
  // Ambient commonly provides dateutc as milliseconds since epoch
  // but sometimes seconds. We’ll detect by magnitude.

  const v = obs?.dateutc ?? obs?.dateUTC ?? obs?.date;
  if (v === null || v === undefined) return null;

  const n = Number(v);
  if (!Number.isFinite(n)) return null;

  const ms = n > 1e12 ? n : n * 1000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function bucketStart(date, intervalMinutes) {
  const intervalMs = intervalMinutes * 60 * 1000;
  const ms = date.getTime();
  const bucketMs = Math.floor(ms / intervalMs) * intervalMs;
  return new Date(bucketMs);
}

async function fetchAmbient() {
  const url =
    `https://rt.ambientweather.net/v1/devices` +
    `?apiKey=${encodeURIComponent(AMBIENT_API_KEY)}` +
    `&applicationKey=${encodeURIComponent(AMBIENT_APP_KEY)}`;

  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ambient fetch failed: ${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}

async function upsertRollup(table, start, end) {
  const sql = `
    insert into ${table} (
      bucket,
      tempf_avg, tempf_min, tempf_max,
      dewpointf_avg, dewpointf_min, dewpointf_max,
      humidity_avg, humidity_min, humidity_max,
      baromrelin_avg, baromrelin_min, baromrelin_max,
      windspeedmph_avg, windspeedmph_min, windspeedmph_max,
      windgustmph_max,
      winddir_sin_avg, winddir_cos_avg,
      solarradiation_avg, solarradiation_max,
      uv_avg, uv_max,
      dailyrainin_max
    )
    select
      $1,
      avg(tempf), min(tempf), max(tempf),
      avg(dewpointf), min(dewpointf), max(dewpointf),
      avg(humidity), min(humidity), max(humidity),
      avg(baromrelin), min(baromrelin), max(baromrelin),
      avg(windspeedmph), min(windspeedmph), max(windspeedmph),
      max(windgustmph),
      avg(sin(radians(winddir))), avg(cos(radians(winddir))),
      avg(solarradiation), max(solarradiation),
      avg(uv), max(uv),
      max(dailyrainin)
    from observations
    where time >= $1 and time < $2
    having count(*) > 0
    on conflict (bucket) do update set
      tempf_avg = excluded.tempf_avg,
      tempf_min = excluded.tempf_min,
      tempf_max = excluded.tempf_max,
      dewpointf_avg = excluded.dewpointf_avg,
      dewpointf_min = excluded.dewpointf_min,
      dewpointf_max = excluded.dewpointf_max,
      humidity_avg = excluded.humidity_avg,
      humidity_min = excluded.humidity_min,
      humidity_max = excluded.humidity_max,
      baromrelin_avg = excluded.baromrelin_avg,
      baromrelin_min = excluded.baromrelin_min,
      baromrelin_max = excluded.baromrelin_max,
      windspeedmph_avg = excluded.windspeedmph_avg,
      windspeedmph_min = excluded.windspeedmph_min,
      windspeedmph_max = excluded.windspeedmph_max,
      windgustmph_max = excluded.windgustmph_max,
      winddir_sin_avg = excluded.winddir_sin_avg,
      winddir_cos_avg = excluded.winddir_cos_avg,
      solarradiation_avg = excluded.solarradiation_avg,
      solarradiation_max = excluded.solarradiation_max,
      uv_avg = excluded.uv_avg,
      uv_max = excluded.uv_max,
      dailyrainin_max = excluded.dailyrainin_max
  `;

  await pool.query(sql, [start.toISOString(), end.toISOString()]);
}

async function upsertObservation(obs) {
  const t = parseTime(obs);
  if (!t) throw new Error("Could not parse observation time (dateutc missing/invalid)");

  // Map common Ambient fields -> your table columns
  const row = {
    time: t.toISOString(),
    tempf: pickNumber(obs?.tempf),
    dewpointf: pickNumber(obs?.dewPoint ?? obs?.dewpointf ?? obs?.dewpoint),
    humidity: pickNumber(obs?.humidity),
    baromrelin: pickNumber(obs?.baromrelin ?? obs?.baromrelhpa ?? obs?.baromrel),
    windspeedmph: pickNumber(obs?.windspeedmph ?? obs?.windSpeed),
    windgustmph: pickNumber(obs?.windgustmph ?? obs?.windGust),
    winddir: pickNumber(obs?.winddir ?? obs?.windDir),
    dailyrainin: pickNumber(obs?.dailyrainin ?? obs?.dailyRainin),
    solarradiation: pickNumber(obs?.solarradiation ?? obs?.solarRadiation),
    uv: pickNumber(obs?.uv)
  };

  const sql = `
    insert into observations (
      time, tempf, dewpointf, humidity, baromrelin,
      windspeedmph, windgustmph, winddir,
      dailyrainin, solarradiation, uv
    ) values (
      $1,$2,$3,$4,$5,
      $6,$7,$8,
      $9,$10,$11
    )
    on conflict (time) do update set
      tempf = excluded.tempf,
      dewpointf = excluded.dewpointf,
      humidity = excluded.humidity,
      baromrelin = excluded.baromrelin,
      windspeedmph = excluded.windspeedmph,
      windgustmph = excluded.windgustmph,
      winddir = excluded.winddir,
      dailyrainin = excluded.dailyrainin,
      solarradiation = excluded.solarradiation,
      uv = excluded.uv
  `;

  const params = [
    row.time,
    row.tempf,
    row.dewpointf,
    row.humidity,
    row.baromrelin,
    row.windspeedmph,
    row.windgustmph,
    row.winddir,
    row.dailyrainin,
    row.solarradiation,
    row.uv
  ];

  await pool.query(sql, params);
  return row;
}

async function updateRollups(obsTime) {
  const rollups = [
    { table: "observations_5m", minutes: 5 },
    { table: "observations_15m", minutes: 15 },
    { table: "observations_1h", minutes: 60 },
    { table: "observations_1d", minutes: 24 * 60 }
  ];

  for (const rollup of rollups) {
    const start = bucketStart(obsTime, rollup.minutes);
    const end = new Date(start.getTime() + rollup.minutes * 60 * 1000);
    await upsertRollup(rollup.table, start, end);
  }
}

async function main() {
  try {
    const deviceJson = await fetchAmbient();
    const obs = unwrapObservation(deviceJson);

    if (!obs) throw new Error("No observation found in Ambient response");

    const inserted = await upsertObservation(obs);
    await updateRollups(new Date(inserted.time));
    console.log(`[ok] upserted ${inserted.time} temp=${inserted.tempf} wind=${inserted.windspeedmph} gust=${inserted.windgustmph}`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("[fail]", e);
  process.exit(1);
});
