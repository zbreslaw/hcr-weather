"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import type { WeatherObs } from "@/lib/data/types";
import { fmtDay, fmtStat, fmtTime } from "@/lib/utils/format";
import { dailyTicksAtHour, timeSpanMs } from "@/lib/utils/dates";
import { stats } from "@/lib/utils/math";

export default function TempDewChart({ data }: { data: WeatherObs[] }) {
  const tempStats = stats(data.map((d) => d.tempf));
  const dewStats = stats(data.map((d) => d.dewpointf));
  const statDecimals = 1;
  const spanMs = timeSpanMs(data);
  const useDailyTicks = spanMs > 24 * 60 * 60 * 1000;
  const ticks = useDailyTicks ? dailyTicksAtHour(data, 12) : undefined;
  const tickFormatter = useDailyTicks ? fmtDay : fmtTime;

  const values = data
    .flatMap((d) => [d.tempf, d.dewpointf])
    .filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  const yDomain: [number | "auto", number | "auto"] = values.length
    ? [Math.min(...values), Math.max(...values)]
    : ["auto", "auto"];

  return (
    <div>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} syncId="weather-24h">
            <XAxis dataKey="time" tickFormatter={tickFormatter} minTickGap={28} ticks={ticks} />
            <YAxis domain={yDomain} />
            <Tooltip labelFormatter={(v) => new Date(String(v)).toLocaleString()} />
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
