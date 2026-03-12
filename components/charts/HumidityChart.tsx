"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ReferenceDot } from "recharts";
import type { WeatherObs } from "@/lib/data/types";
import { fmtDay, fmtStat, fmtTime } from "@/lib/utils/format";
import { dailyTicksAtHour, ticksForTimeWindow, timeSpanMs } from "@/lib/utils/dates";
import { stats } from "@/lib/utils/math";

export default function HumidityChart({
  data,
  highlightTime,
  rangeWindow
}: {
  data: WeatherObs[];
  highlightTime?: string | null;
  rangeWindow?: { from: Date; to: Date } | null;
}) {
  const humidityStats = stats(data.map((d) => d.humidity));
  const statDecimals = 1;
  const spanMs = timeSpanMs(data);
  const windowTicks =
    rangeWindow?.from && rangeWindow?.to
      ? ticksForTimeWindow(rangeWindow.from.toISOString(), rangeWindow.to.toISOString())
      : null;
  const useDailyTicks = windowTicks?.useDailyTicks ?? spanMs > 24 * 60 * 60 * 1000;
  const ticks = windowTicks?.ticks ?? (useDailyTicks ? dailyTicksAtHour(data, 12) : undefined);
  const tickFormatter = useDailyTicks ? fmtDay : fmtTime;

  const humidityMin = (() => {
    let min: { time: string; value: number } | null = null;
    for (const entry of data) {
      const value = entry.humidity;
      if (value == null || Number.isNaN(value)) continue;
      const time = entry.time;
      if (!time) continue;
      if (!min || value < min.value) min = { time, value };
    }
    return min;
  })();
  return (
    <div>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} syncId="weather-24h">
            <XAxis dataKey="time" tickFormatter={tickFormatter} minTickGap={28} ticks={ticks} />
            <YAxis domain={["auto", "auto"]} />
            <Tooltip labelFormatter={(v) => new Date(String(v)).toLocaleString()} />
            {highlightTime ? <ReferenceLine x={highlightTime} stroke="rgba(255, 255, 255, 0.35)" /> : null}
            {humidityMin ? (
              <ReferenceDot x={humidityMin.time} y={humidityMin.value} r={5} fill="#60a5fa" stroke="#0b1220" strokeWidth={1} />
            ) : null}
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
