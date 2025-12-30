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
  return value == null ? "—" : value.toFixed(2);
}

export default function PressureChart({ data }: { data: WeatherObs[] }) {
  const pressureStats = stats(data.map((d) => d.baromrelin));
  return (
    <div>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} syncId="weather-24h">
            <XAxis dataKey="time" tickFormatter={fmtTime} minTickGap={28} />
            <YAxis domain={["auto", "auto"]} />
            <Tooltip labelFormatter={(v) => new Date(String(v)).toLocaleString()} />
            <Line type="monotone" dataKey="baromrelin" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chartStats">
        <div>
          Pressure Low {fmtStat(pressureStats?.min ?? null)} inHg • High {fmtStat(pressureStats?.max ?? null)} inHg •
          Average {fmtStat(pressureStats?.avg ?? null)} inHg
        </div>
      </div>
    </div>
  );
}
