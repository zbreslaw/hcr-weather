"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import type { WeatherObs } from "@/lib/data/types";

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function stats(values: Array<number | null | undefined>) {
  const nums = values.filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  if (!nums.length) return null;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const avg = nums.reduce((sum, v) => sum + v, 0) / nums.length;
  return { min, max, avg };
}

function fmtStat(value: number | null) {
  return value == null ? "—" : value.toFixed(1);
}

export default function TempDewChart({ data }: { data: WeatherObs[] }) {
  const tempStats = stats(data.map((d) => d.tempf));
  const dewStats = stats(data.map((d) => d.dewpointf));

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
            <XAxis dataKey="time" tickFormatter={fmtTime} minTickGap={28} />
            <YAxis domain={yDomain} />
            <Tooltip labelFormatter={(v) => new Date(String(v)).toLocaleString()} />
            <Line type="monotone" dataKey="tempf" dot={false} />
            <Line type="monotone" dataKey="dewpointf" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chartStats">
        <div>
          Temp Low {fmtStat(tempStats?.min ?? null)}°F • High {fmtStat(tempStats?.max ?? null)}°F • Average{" "}
          {fmtStat(tempStats?.avg ?? null)}°F
        </div>
        <div>
          Dew Point Low {fmtStat(dewStats?.min ?? null)}°F • High {fmtStat(dewStats?.max ?? null)}°F • Average{" "}
          {fmtStat(dewStats?.avg ?? null)}°F
        </div>
      </div>
    </div>
  );
}
