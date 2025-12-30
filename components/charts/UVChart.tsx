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

export default function UVChart({ data }: { data: WeatherObs[] }) {
  const uvStats = stats(data.map((d) => d.uv));
  return (
    <div>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} syncId="weather-24h">
            <XAxis dataKey="time" tickFormatter={fmtTime} minTickGap={28} />
            <YAxis domain={["auto", "auto"]} />
            <Tooltip labelFormatter={(v) => new Date(String(v)).toLocaleString()} />
            <Line type="monotone" dataKey="uv" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chartStats">
        <div>
          UV Low {fmtStat(uvStats?.min ?? null)} UV • High {fmtStat(uvStats?.max ?? null)} UV • Average{" "}
          {fmtStat(uvStats?.avg ?? null)} UV
        </div>
      </div>
    </div>
  );
}
