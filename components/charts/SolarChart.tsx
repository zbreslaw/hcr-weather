"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import type { WeatherObs } from "@/lib/data/types";
import { fmtStat, fmtTime } from "@/lib/utils/format";
import { stats } from "@/lib/utils/math";
import { totalWhPerM2 } from "@/lib/utils/weather";

export default function SolarChart({ data }: { data: WeatherObs[] }) {
  const solarStats = stats(data.map((d) => d.solarradiation));
  const solarTotal = totalWhPerM2(data);
  const statDecimals = 1;
  return (
    <div>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} syncId="weather-24h">
            <XAxis dataKey="time" tickFormatter={fmtTime} minTickGap={28} />
            <YAxis domain={["auto", "auto"]} />
            <Tooltip labelFormatter={(v) => new Date(String(v)).toLocaleString()} />
            <Line type="monotone" dataKey="solarradiation" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chartStats">
        <div>
          Solar High {fmtStat(solarStats?.max ?? null, statDecimals)} W/m² • Average{" "}
          {fmtStat(solarStats?.avg ?? null, statDecimals)} W/m² • Total{" "}
          {fmtStat(solarTotal, statDecimals)} Wh/m²
        </div>
      </div>
    </div>
  );
}
