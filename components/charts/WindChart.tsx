"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import type { WeatherObs } from "@/lib/data/types";
import { fmtDay, fmtStat, fmtTime } from "@/lib/utils/format";
import { dailyTicksAtHour, timeSpanMs } from "@/lib/utils/dates";
import { stats } from "@/lib/utils/math";

export default function WindChart({ data }: { data: WeatherObs[] }) {
  const windStats = stats(data.map((d) => d.windspeedmph));
  const gustStats = stats(data.map((d) => d.windgustmph));
  const statDecimals = 1;
  const spanMs = timeSpanMs(data);
  const useDailyTicks = spanMs > 24 * 60 * 60 * 1000;
  const ticks = useDailyTicks ? dailyTicksAtHour(data, 12) : undefined;
  const tickFormatter = useDailyTicks ? fmtDay : fmtTime;
  return (
    <div>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} syncId="weather-24h">
            <XAxis dataKey="time" tickFormatter={tickFormatter} minTickGap={28} ticks={ticks} />
            <YAxis domain={["auto", "auto"]} />
            <Tooltip labelFormatter={(v) => new Date(String(v)).toLocaleString()} />
            <Legend />
            <Bar dataKey="windspeedmph" name="Wind" fill="#7dd3fc" />
            <Bar dataKey="windgustmph" name="Gust" fill="#fbbf24" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="chartStats">
        <div>
          Wind Low {fmtStat(windStats?.min ?? null, statDecimals)} mph • High{" "}
          {fmtStat(windStats?.max ?? null, statDecimals)} mph • Average{" "}
          {fmtStat(windStats?.avg ?? null, statDecimals)} mph
        </div>
        <div>
          Gust Low {fmtStat(gustStats?.min ?? null, statDecimals)} mph • High{" "}
          {fmtStat(gustStats?.max ?? null, statDecimals)} mph • Average{" "}
          {fmtStat(gustStats?.avg ?? null, statDecimals)} mph
        </div>
      </div>
    </div>
  );
}
