import type { WeatherObs } from "./types";
import type { WeatherProvider } from "./provider";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined
});

export class PostgresProvider implements WeatherProvider {
  async latest(): Promise<WeatherObs> {
    const q = `
      select time, tempf, dewpointf, humidity, baromrelin, windspeedmph, windgustmph, winddir,
             dailyrainin, solarradiation, uv
      from observations
      order by time desc
      limit 1
    `;
    const { rows } = await pool.query(q);
    if (!rows.length) throw new Error("No observations in DB");
    return rowToObs(rows[0]);
  }

  async range(from: Date, to: Date): Promise<WeatherObs[]> {
    const q = `
      select time, tempf, dewpointf, humidity, baromrelin, windspeedmph, windgustmph, winddir,
             dailyrainin, solarradiation, uv
      from observations
      where time >= $1 and time <= $2
      order by time asc
    `;
    const { rows } = await pool.query(q, [from.toISOString(), to.toISOString()]);
    return rows.map(rowToObs);
  }
}

function rowToObs(r: any): WeatherObs {
  return {
    time: new Date(r.time).toISOString(),
    tempf: r.tempf,
    dewpointf: r.dewpointf,
    humidity: r.humidity,
    baromrelin: r.baromrelin,
    windspeedmph: r.windspeedmph,
    windgustmph: r.windgustmph,
    winddir: r.winddir,
    dailyrainin: r.dailyrainin,
    solarradiation: r.solarradiation,
    uv: r.uv
  };
}
