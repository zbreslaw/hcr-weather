"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import type { WeatherObs } from "@/lib/data/types";
import { fmtStat, fmtTime } from "@/lib/utils/format";
import { stats } from "@/lib/utils/math";

export default function HumidityChart({ data }: { data: WeatherObs[] }) {
  const humidityStats = stats(data.map((d) => d.humidity));
  const statDecimals = 1;
  return (
    <div>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} syncId="weather-24h">
            <XAxis dataKey="time" tickFormatter={fmtTime} minTickGap={28} />
            <YAxis domain={["auto", "auto"]} />
            <Tooltip labelFormatter={(v) => new Date(String(v)).toLocaleString()} />
            <Line type="monotone" dataKey="humidity" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chartStats">
        <div>
          Humidity Low {fmtStat(humidityStats?.min ?? null, statDecimals)}% • High{" "}
          {fmtStat(humidityStats?.max ?? null, statDecimals)}% • Average{" "}
          {fmtStat(humidityStats?.avg ?? null, statDecimals)}%
        </div>
      </div>
    </div>
  );
}
