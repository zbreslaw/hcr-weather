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
        tempf_min,
        tempf_max,
        dewpointf_avg as dewpointf,
        dewpointf_min,
        dewpointf_max,
        humidity_avg as humidity,
        humidity_min,
        humidity_max,
        baromrelin_avg as baromrelin,
        baromrelin_min,
        baromrelin_max,
        windspeedmph_avg as windspeedmph,
        windspeedmph_min,
        windspeedmph_max,
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
        solarradiation_max,
        uv_avg as uv,
        uv_max
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
    tempfMin: r.tempf_min ?? null,
    tempfMax: r.tempf_max ?? null,
    dewpointf: r.dewpointf,
    dewpointfMin: r.dewpointf_min ?? null,
    dewpointfMax: r.dewpointf_max ?? null,
    humidity: r.humidity,
    humidityMin: r.humidity_min ?? null,
    humidityMax: r.humidity_max ?? null,
    baromrelin: r.baromrelin,
    baromrelinMin: r.baromrelin_min ?? null,
    baromrelinMax: r.baromrelin_max ?? null,
    windspeedmph: r.windspeedmph,
    windspeedmphMin: r.windspeedmph_min ?? null,
    windspeedmphMax: r.windspeedmph_max ?? null,
    windgustmph: r.windgustmph,
    winddir: r.winddir,
    dailyrainin: r.dailyrainin,
    solarradiation: r.solarradiation,
    solarradiationMax: r.solarradiation_max ?? null,
    uv: r.uv,
    uvMax: r.uv_max ?? null
  };
}
