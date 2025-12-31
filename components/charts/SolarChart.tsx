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

function totalWhPerM2(data: WeatherObs[]) {
  const points = data
    .map((d) => ({ time: new Date(d.time).getTime(), value: d.solarradiation }))
    .filter((d) => Number.isFinite(d.time))
    .sort((a, b) => a.time - b.time);

  if (points.length < 2) return null;

  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    if (prev.value == null || curr.value == null) continue;
    const dtHours = (curr.time - prev.time) / (1000 * 60 * 60);
    if (dtHours <= 0) continue;
    const avg = (prev.value + curr.value) / 2;
    total += avg * dtHours;
  }

  return Number.isFinite(total) ? total : null;
}

function fmtStat(value: number | null) {
  return value == null ? "—" : value.toFixed(1);
}

export default function SolarChart({ data }: { data: WeatherObs[] }) {
  const solarStats = stats(data.map((d) => d.solarradiation));
  const solarTotal = totalWhPerM2(data);
  return (
    <div>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} syncId="weather-24h">
            <XAxis dataKey="time" tickFormatter={fmtTime} minTickGap={28} />
            <YAxis domain={["auto", "auto"]} />
            <Tooltip labelFormatter={(v) => new Date(String(v)).toLocaleString()} />
            <Line type="monotone" dataKey="solarradiation" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chartStats">
        <div>
          Solar High {fmtStat(solarStats?.max ?? null)} W/m² • Average {fmtStat(solarStats?.avg ?? null)} W/m² • Total{" "}
          {fmtStat(solarTotal)} Wh/m²
        </div>
      </div>
    </div>
  );
}
