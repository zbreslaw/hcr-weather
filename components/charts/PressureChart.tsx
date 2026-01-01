"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import type { WeatherObs } from "@/lib/data/types";
import { fmtStat, fmtTime } from "@/lib/utils/format";
import { stats } from "@/lib/utils/math";

export default function PressureChart({ data }: { data: WeatherObs[] }) {
  const pressureStats = stats(data.map((d) => d.baromrelin));
  const statDecimals = 2;
  return (
    <div>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} syncId="weather-24h">
            <XAxis dataKey="time" tickFormatter={fmtTime} minTickGap={28} />
            <YAxis domain={["auto", "auto"]} />
            <Tooltip labelFormatter={(v) => new Date(String(v)).toLocaleString()} />
            <Line type="monotone" dataKey="baromrelin" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chartStats">
        <div>
          Pressure Low {fmtStat(pressureStats?.min ?? null, statDecimals)} inHg • High{" "}
          {fmtStat(pressureStats?.max ?? null, statDecimals)} inHg • Average{" "}
          {fmtStat(pressureStats?.avg ?? null, statDecimals)} inHg
        </div>
      </div>
    </div>
  );
}
