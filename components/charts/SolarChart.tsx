"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ReferenceDot } from "recharts";
import type { WeatherObs } from "@/lib/data/types";
import { fmtDay, fmtStat, fmtTime } from "@/lib/utils/format";
import { dailyTicksAtHour, ticksForTimeWindow, timeSpanMs } from "@/lib/utils/dates";
import { stats } from "@/lib/utils/math";
import { totalWhPerM2 } from "@/lib/utils/weather";

export default function SolarChart({
  data,
  highlightTime,
  rangeWindow
}: {
  data: WeatherObs[];
  highlightTime?: string | null;
  rangeWindow?: { from: Date; to: Date } | null;
}) {
  const solarStats = stats(data.map((d) => d.solarradiation));
  const solarTotal = totalWhPerM2(data);
  const statDecimals = 1;
  const spanMs = timeSpanMs(data);
  const windowTicks =
    rangeWindow?.from && rangeWindow?.to
      ? ticksForTimeWindow(rangeWindow.from.toISOString(), rangeWindow.to.toISOString())
      : null;
  const useDailyTicks = windowTicks?.useDailyTicks ?? spanMs > 24 * 60 * 60 * 1000;
  const ticks = windowTicks?.ticks ?? (useDailyTicks ? dailyTicksAtHour(data, 12) : undefined);
  const tickFormatter = useDailyTicks ? fmtDay : fmtTime;

  const solarMax = (() => {
    let max: { time: string; value: number } | null = null;
    for (const entry of data) {
      const value = entry.solarradiation;
      if (value == null || Number.isNaN(value)) continue;
      const time = entry.time;
      if (!time) continue;
      if (!max || value > max.value) max = { time, value };
    }
    return max;
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
            {solarMax ? (
              <ReferenceDot x={solarMax.time} y={solarMax.value} r={5} fill="#f97316" stroke="#0b1220" strokeWidth={1} />
            ) : null}
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
