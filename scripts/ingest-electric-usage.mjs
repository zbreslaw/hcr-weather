/**
 * Lane Electric SmartHub — daily kWh and demand (kW) ingest
 *
 * Logs in, fetches yesterday's usage from utility-usage/poll, and upserts into
 * electric_usage. Re-running for the same date updates values; no duplicate rows.
 *
 * Env: SMARTHUB_USERNAME, SMARTHUB_PASSWORD, SMARTHUB_ACCT_NBR,
 *      SMARTHUB_SRV_LOC, DATABASE_URL, PGSSL
 * Optional: SMARTHUB_START_DATE (YYYY-MM-DD) or --start YYYY-MM-DD
 *   When set, fetches every day from that date through yesterday.
 */

import dotenv from "dotenv";
import { existsSync } from "fs";
import { Pool } from "pg";

const envPath = existsSync(".env.local") ? ".env.local" : ".env";
dotenv.config({ path: envPath });

const API_HOST = "laneelectric.smarthub.coop";
const BASE_URL = `https://${API_HOST}/services`;
const POLL_MAX_ATTEMPTS = 15;
const POLL_DELAY_MS = 1000;
const MAX_RANGE_DAYS = 45;

const {
  SMARTHUB_USERNAME,
  SMARTHUB_PASSWORD,
  SMARTHUB_ACCT_NBR,
  SMARTHUB_SRV_LOC,
  DATABASE_URL,
  PGSSL
} = process.env;

if (!SMARTHUB_USERNAME || !SMARTHUB_PASSWORD) {
  throw new Error("Missing SMARTHUB_USERNAME or SMARTHUB_PASSWORD");
}
if (!SMARTHUB_ACCT_NBR || !SMARTHUB_SRV_LOC) {
  throw new Error("Missing SMARTHUB_ACCT_NBR or SMARTHUB_SRV_LOC");
}
if (!DATABASE_URL) {
  throw new Error("Missing DATABASE_URL");
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: PGSSL === "true" ? { rejectUnauthorized: false } : undefined
});

class SmartHubClient {
  static LOGIN_URL = `${BASE_URL}/oauth/auth/v2`;
  static USAGE_POLL_URL = `${BASE_URL}/secured/utility-usage/poll`;

  constructor(userId, password, accountNumber, serviceLocationNumber) {
    this.userId = userId;
    this.password = password;
    this.accountNumber = accountNumber;
    this.serviceLocationNumber = serviceLocationNumber;
    this.authToken = null;
  }

  async login() {
    const response = await fetch(SmartHubClient.LOGIN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        CassandraCacheable: "USE_CACHE",
        authority: API_HOST
      },
      body: new URLSearchParams({
        userId: this.userId,
        password: this.password
      }).toString()
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Login failed: ${response.status} ${response.statusText} ${text}`);
    }

    const data = await response.json();
    this.authToken = data.authorizationToken;
    if (!this.authToken) {
      throw new Error(`Login failed — no token in response: ${JSON.stringify(data)}`);
    }

    console.log(
      `[auth] Logged in as ${data.username ?? this.userId}. Token expires in ${data.expiresIn ?? "?"}s`
    );
  }

  apiHeaders() {
    return {
      authority: API_HOST,
      authorization: `Bearer ${this.authToken}`,
      "x-nisc-smarthub-username": this.userId,
      "content-type": "application/json"
    };
  }

  buildPollPayload(startDateTime, endDateTime) {
    return {
      timeFrame: "DAILY",
      userId: this.userId,
      screen: "USAGE_EXPLORER",
      includeDemand: true,
      serviceLocationNumber: this.serviceLocationNumber,
      accountNumber: this.accountNumber,
      industries: ["ELECTRIC"],
      startDateTime,
      endDateTime
    };
  }

  async fetchDailyUsage(startDate, endDate) {
    const { startDateTime, endDateTime } = rangeBounds(startDate, endDate);
    const payload = this.buildPollPayload(startDateTime, endDateTime);

    for (let attempt = 1; attempt <= POLL_MAX_ATTEMPTS; attempt++) {
      const response = await fetch(SmartHubClient.USAGE_POLL_URL, {
        method: "POST",
        headers: this.apiHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`Usage fetch failed: ${response.status} ${response.statusText} ${text}`);
      }

      const data = await response.json();
      if (data.status === "COMPLETE") {
        return data;
      }

      console.log(`[poll] Data pending (attempt ${attempt}/${POLL_MAX_ATTEMPTS})`);
      await sleep(POLL_DELAY_MS);
    }

    throw new Error("Usage data was not ready before polling timed out");
  }
}

function rangeBounds(startDate, endDate) {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59);
  return {
    startDateTime: start.getTime(),
    endDateTime: end.getTime()
  };
}

function parseUsageResponse(raw) {
  const electric = raw.data?.ELECTRIC ?? [];
  const usageEntry = electric.find((entry) => entry.type === "USAGE");
  const demandEntry = electric.find((entry) => entry.type === "DEMAND");

  const kwhData = new Map();
  const kwData = new Map();

  for (const series of usageEntry?.series ?? []) {
    for (const point of series.data ?? []) {
      if (point?.y != null) {
        kwhData.set(point.x, point.y);
      }
    }
  }

  for (const series of demandEntry?.series ?? []) {
    for (const point of series.data ?? []) {
      if (point?.y != null) {
        kwData.set(point.x, point.y);
      }
    }
  }

  const timestamps = [...new Set([...kwhData.keys(), ...kwData.keys()])].sort((a, b) => a - b);
  const records = [];

  for (const ts of timestamps) {
    records.push({
      date: timestampToDate(ts),
      kwh: kwhData.get(ts) ?? null,
      demand_kw: kwData.has(ts) ? roundKw(kwData.get(ts)) : null
    });
  }

  return records;
}

function timestampToDate(ts) {
  const d = new Date(ts);
  return [
    d.getUTCFullYear(),
    String(d.getUTCMonth() + 1).padStart(2, "0"),
    String(d.getUTCDate()).padStart(2, "0")
  ].join("-");
}

function roundKw(value) {
  if (value == null) return null;
  return Math.round(value * 1000) / 1000;
}

function formatLocalDate(d) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-");
}

function yesterdayLocal() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDateArg(value, label) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`Invalid ${label} (expected YYYY-MM-DD): ${value}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const d = new Date(year, month - 1, day);
  d.setHours(0, 0, 0, 0);

  if (formatLocalDate(d) !== value) {
    throw new Error(`Invalid ${label}: ${value}`);
  }

  return d;
}

function readCliStartDate() {
  const startFlagIndex = process.argv.indexOf("--start");
  if (startFlagIndex !== -1) {
    return process.argv[startFlagIndex + 1];
  }

  const startArg = process.argv.find((arg) => arg.startsWith("--start="));
  return startArg?.slice("--start=".length);
}

function resolveDateRange() {
  const startRaw = readCliStartDate() ?? process.env.SMARTHUB_START_DATE;
  const yesterday = yesterdayLocal();

  if (!startRaw) {
    return { startDate: yesterday, endDate: yesterday };
  }

  const startDate = parseDateArg(startRaw, "start date");
  if (startDate > yesterday) {
    throw new Error(
      `Start date ${formatLocalDate(startDate)} is after yesterday (${formatLocalDate(yesterday)})`
    );
  }

  return { startDate, endDate: yesterday };
}

function* dateChunks(startDate, endDate) {
  let chunkStart = new Date(startDate);

  while (chunkStart <= endDate) {
    const chunkEnd = new Date(chunkStart);
    chunkEnd.setDate(chunkEnd.getDate() + MAX_RANGE_DAYS - 1);
    if (chunkEnd > endDate) {
      chunkEnd.setTime(endDate.getTime());
    }

    yield {
      start: new Date(chunkStart),
      end: new Date(chunkEnd)
    };

    chunkStart = new Date(chunkEnd);
    chunkStart.setDate(chunkStart.getDate() + 1);
    chunkStart.setHours(0, 0, 0, 0);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function saveToDb(records) {
  if (!records.length) {
    console.log("[db] No records to save");
    return;
  }

  const sql = `
    insert into electric_usage (usage_date, kwh, demand_kw)
    values ($1, $2, $3)
    on conflict (usage_date) do update set
      kwh = excluded.kwh,
      demand_kw = excluded.demand_kw
  `;

  for (const record of records) {
    await pool.query(sql, [record.date, record.kwh, record.demand_kw]);
    console.log(`[db] upserted ${record.date} kwh=${record.kwh} demand_kw=${record.demand_kw}`);
  }
}

async function run(startDate, endDate) {
  const client = new SmartHubClient(
    SMARTHUB_USERNAME,
    SMARTHUB_PASSWORD,
    SMARTHUB_ACCT_NBR,
    SMARTHUB_SRV_LOC
  );

  const startLabel = formatLocalDate(startDate);
  const endLabel = formatLocalDate(endDate);
  console.log(`[main] Fetching daily usage from ${startLabel} to ${endLabel}`);

  await client.login();

  let totalRecords = 0;
  for (const chunk of dateChunks(startDate, endDate)) {
    const chunkStart = formatLocalDate(chunk.start);
    const chunkEnd = formatLocalDate(chunk.end);
    console.log(`[main] Requesting ${chunkStart} to ${chunkEnd}`);

    const raw = await client.fetchDailyUsage(chunk.start, chunk.end);
    const records = parseUsageResponse(raw);
    console.log(`[main] Parsed ${records.length} daily record(s) for ${chunkStart} to ${chunkEnd}`);

    await saveToDb(records);
    totalRecords += records.length;
  }

  console.log(`[main] Done (${totalRecords} record(s) total)`);
}

async function main() {
  try {
    const { startDate, endDate } = resolveDateRange();
    await run(startDate, endDate);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[fail]", err);
  process.exit(1);
});
