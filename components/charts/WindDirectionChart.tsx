"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import type { WeatherObs } from "@/lib/data/types";
import { fmtDay, fmtDir, fmtTime } from "@/lib/utils/format";
import { dailyTicksAtHour, timeSpanMs } from "@/lib/utils/dates";

export default function WindDirectionChart({ data, highlightTime }: { data: WeatherObs[]; highlightTime?: string | null }) {
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
            <YAxis
              domain={[0, 360]}
              ticks={[0, 90, 180, 270, 360]}
              interval={0}
              allowDecimals={false}
              tickFormatter={fmtDir}
            />
            <Tooltip labelFormatter={(v) => new Date(String(v)).toLocaleString()} />
            {highlightTime ? <ReferenceLine x={highlightTime} stroke="rgba(255, 255, 255, 0.35)" /> : null}
            <Line type="monotone" dataKey="winddir" dot stroke="transparent" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
