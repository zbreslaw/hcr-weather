"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import type { WeatherObs } from "@/lib/data/types";
import { fmtDay, fmtStat, fmtTime } from "@/lib/utils/format";
import { dailyTicksAtHour, timeSpanMs } from "@/lib/utils/dates";
import { stats } from "@/lib/utils/math";

export default function PressureChart({ data, highlightTime }: { data: WeatherObs[]; highlightTime?: string | null }) {
  const pressureStats = stats(data.map((d) => d.baromrelin));
  const statDecimals = 2;
  const spanMs = timeSpanMs(data);
  const useDailyTicks = spanMs > 24 * 60 * 60 * 1000;
  const ticks = useDailyTicks ? dailyTicksAtHour(data, 12) : undefined;
  const tickFormatter = useDailyTicks ? fmtDay : fmtTime;
  return (
    <div>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} syncId="weather-24h">
            <XAxis dataKey="time" tickFormatter={tickFormatter} minTickGap={28} ticks={ticks} />
            <YAxis domain={["auto", "auto"]} />
            <Tooltip labelFormatter={(v) => new Date(String(v)).toLocaleString()} />
            {highlightTime ? <ReferenceLine x={highlightTime} stroke="rgba(255, 255, 255, 0.35)" /> : null}
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
