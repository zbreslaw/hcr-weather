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
    const spanMs = Math.max(0, to.getTime() - from.getTime());
    const dayMs = 24 * 60 * 60 * 1000;
    let table = "observations";
    let isRollup = false;

    if (spanMs > 48 * 60 * 60 * 1000 && spanMs <= 7 * dayMs) {
      table = "observations_5m";
      isRollup = true;
    } else if (spanMs > 7 * dayMs && spanMs <= 31 * dayMs) {
      table = "observations_15m";
      isRollup = true;
    } else if (spanMs > 31 * dayMs && spanMs <= 370 * dayMs) {
      table = "observations_1h";
      isRollup = true;
    } else if (spanMs > 370 * dayMs) {
      table = "observations_1d";
      isRollup = true;
    }

    const q = isRollup
      ? `
      select
        bucket as time,
        tempf_avg as tempf,
        dewpointf_avg as dewpointf,
        humidity_avg as humidity,
        baromrelin_avg as baromrelin,
        windspeedmph_avg as windspeedmph,
        windgustmph_max as windgustmph,
        case
          when winddir_sin_avg is null or winddir_cos_avg is null then null
          else (
            (degrees(atan2(winddir_sin_avg, winddir_cos_avg)) + 360.0) -
            360.0 * floor((degrees(atan2(winddir_sin_avg, winddir_cos_avg)) + 360.0) / 360.0)
          )
        end as winddir,
        dailyrainin_max as dailyrainin,
        solarradiation_avg as solarradiation,
        uv_avg as uv
      from ${table}
      where bucket >= $1 and bucket <= $2
      order by bucket asc
    `
      : `
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
