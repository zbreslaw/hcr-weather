"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ReferenceDot } from "recharts";
import type { WeatherObs } from "@/lib/data/types";
import { fmtDay, fmtStat, fmtTime } from "@/lib/utils/format";
import { dailyTicksAtHour, ticksForTimeWindow, timeSpanMs } from "@/lib/utils/dates";
import { stats } from "@/lib/utils/math";

export default function PressureChart({
  data,
  highlightTime,
  rangeWindow
}: {
  data: WeatherObs[];
  highlightTime?: string | null;
  rangeWindow?: { from: Date; to: Date } | null;
}) {
  const pressureStats = stats(data.map((d) => d.baromrelin));
  const statDecimals = 2;
  const spanMs = timeSpanMs(data);
  const windowTicks =
    rangeWindow?.from && rangeWindow?.to
      ? ticksForTimeWindow(rangeWindow.from.toISOString(), rangeWindow.to.toISOString())
      : null;
  const useDailyTicks = windowTicks?.useDailyTicks ?? spanMs > 24 * 60 * 60 * 1000;
  const ticks = windowTicks?.ticks ?? (useDailyTicks ? dailyTicksAtHour(data, 12) : undefined);
  const tickFormatter = useDailyTicks ? fmtDay : fmtTime;

  const pressureExtrema = (() => {
    let min: { time: string; value: number } | null = null;
    let max: { time: string; value: number } | null = null;
    for (const entry of data) {
      const value = entry.baromrelin;
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
          <LineChart data={data} syncId="weather-24h">
            <XAxis dataKey="time" tickFormatter={tickFormatter} minTickGap={28} ticks={ticks} />
            <YAxis domain={["auto", "auto"]} />
            <Tooltip labelFormatter={(v) => new Date(String(v)).toLocaleString()} />
            {highlightTime ? <ReferenceLine x={highlightTime} stroke="rgba(255, 255, 255, 0.35)" /> : null}
            {pressureExtrema.min ? (
              <ReferenceDot
                x={pressureExtrema.min.time}
                y={pressureExtrema.min.value}
                r={5}
                fill="#60a5fa"
                stroke="#0b1220"
                strokeWidth={1}
              />
            ) : null}
            {pressureExtrema.max ? (
              <ReferenceDot
                x={pressureExtrema.max.time}
                y={pressureExtrema.max.value}
                r={5}
                fill="#f97316"
                stroke="#0b1220"
                strokeWidth={1}
              />
            ) : null}
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
