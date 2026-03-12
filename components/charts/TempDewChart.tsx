"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import { ReferenceDot } from "recharts";
import type { WeatherObs } from "@/lib/data/types";
import { fmtDay, fmtStat, fmtTime } from "@/lib/utils/format";
import { dailyTicksAtHour, ticksForTimeWindow, timeSpanMs } from "@/lib/utils/dates";
import { stats } from "@/lib/utils/math";

export default function TempDewChart({
  data,
  highlightTime,
  rangeWindow
}: {
  data: WeatherObs[];
  highlightTime?: string | null;
  rangeWindow?: { from: Date; to: Date } | null;
}) {
  const tempStats = stats(data.map((d) => d.tempf));
  const dewStats = stats(data.map((d) => d.dewpointf));
  const statDecimals = 2;
  const tooltipValue = (value: any) =>
    typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : value;
  const axisValue = (value: any) =>
    typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : value;
  const spanMs = timeSpanMs(data);
  const windowTicks =
    rangeWindow?.from && rangeWindow?.to
      ? ticksForTimeWindow(rangeWindow.from.toISOString(), rangeWindow.to.toISOString())
      : null;
  const useDailyTicks = windowTicks?.useDailyTicks ?? spanMs > 24 * 60 * 60 * 1000;
  const ticks = windowTicks?.ticks ?? (useDailyTicks ? dailyTicksAtHour(data, 12) : undefined);
  const tickFormatter = useDailyTicks ? fmtDay : fmtTime;

  const values = data
    .flatMap((d) => [d.tempf, d.dewpointf])
    .filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  const yDomain: [number | "auto", number | "auto"] = values.length
    ? [Math.min(...values), Math.max(...values)]
    : ["auto", "auto"];

  const tempExtrema = (() => {
    let min: { time: string; value: number } | null = null;
    let max: { time: string; value: number } | null = null;
    for (const entry of data) {
      const value = entry.tempf;
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
            <YAxis domain={yDomain} tickFormatter={axisValue} />
            <Tooltip
              labelFormatter={(v) => new Date(String(v)).toLocaleString()}
              formatter={(value) => tooltipValue(value)}
            />
            {highlightTime ? <ReferenceLine x={highlightTime} stroke="rgba(255, 255, 255, 0.35)" /> : null}
            {tempExtrema.min ? (
              <ReferenceDot
                x={tempExtrema.min.time}
                y={tempExtrema.min.value}
                r={5}
                fill="#60a5fa"
                stroke="#0b1220"
                strokeWidth={1}
              />
            ) : null}
            {tempExtrema.max ? (
              <ReferenceDot
                x={tempExtrema.max.time}
                y={tempExtrema.max.value}
                r={5}
                fill="#f97316"
                stroke="#0b1220"
                strokeWidth={1}
              />
            ) : null}
            <Line type="monotone" dataKey="tempf" dot={false} />
            <Line type="monotone" dataKey="dewpointf" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chartStats">
        <div>
          Temp Low {fmtStat(tempStats?.min ?? null, statDecimals)}°F • High{" "}
          {fmtStat(tempStats?.max ?? null, statDecimals)}°F • Average{" "}
          {fmtStat(tempStats?.avg ?? null, statDecimals)}°F
        </div>
        <div>
          Dew Point Low {fmtStat(dewStats?.min ?? null, statDecimals)}°F • High{" "}
          {fmtStat(dewStats?.max ?? null, statDecimals)}°F • Average{" "}
          {fmtStat(dewStats?.avg ?? null, statDecimals)}°F
        </div>
      </div>
    </div>
  );
}
