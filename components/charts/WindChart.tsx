"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ReferenceLine, ReferenceDot } from "recharts";
import type { WeatherObs } from "@/lib/data/types";
import { fmtDay, fmtStat, fmtTime } from "@/lib/utils/format";
import { dailyTicksAtHour, ticksForTimeWindow, timeSpanMs } from "@/lib/utils/dates";
import { stats } from "@/lib/utils/math";

export default function WindChart({
  data,
  highlightTime,
  rangeWindow
}: {
  data: WeatherObs[];
  highlightTime?: string | null;
  rangeWindow?: { from: Date; to: Date } | null;
}) {
  const windStats = stats(data.map((d) => d.windspeedmph));
  const gustStats = stats(data.map((d) => d.windgustmph));
  const statDecimals = 1;
  const spanMs = timeSpanMs(data);
  const windowTicks =
    rangeWindow?.from && rangeWindow?.to
      ? ticksForTimeWindow(rangeWindow.from.toISOString(), rangeWindow.to.toISOString())
      : null;
  const useDailyTicks = windowTicks?.useDailyTicks ?? spanMs > 24 * 60 * 60 * 1000;
  const ticks = windowTicks?.ticks ?? (useDailyTicks ? dailyTicksAtHour(data, 12) : undefined);
  const tickFormatter = useDailyTicks ? fmtDay : fmtTime;

  const gustExtrema = (() => {
    let min: { time: string; value: number } | null = null;
    let max: { time: string; value: number } | null = null;
    for (const entry of data) {
      const value = entry.windgustmph;
      if (value == null || Number.isNaN(value)) continue;
      const time = entry.time;
      if (!time) continue;
      if (!min || value < min.value) min = { time, value };
      if (!max || value > max.value) max = { time, value };
    }
    return { min, max };
  })();
  return (
    <div>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} syncId="weather-24h">
            <XAxis dataKey="time" tickFormatter={tickFormatter} minTickGap={28} ticks={ticks} />
            <YAxis domain={["auto", "auto"]} />
            <Tooltip labelFormatter={(v) => new Date(String(v)).toLocaleString()} />
            {highlightTime ? <ReferenceLine x={highlightTime} stroke="rgba(255, 255, 255, 0.35)" /> : null}
            {gustExtrema.max ? (
              <ReferenceDot
                x={gustExtrema.max.time}
                y={gustExtrema.max.value}
                r={5}
                fill="#f97316"
                stroke="#0b1220"
                strokeWidth={1}
              />
            ) : null}
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
