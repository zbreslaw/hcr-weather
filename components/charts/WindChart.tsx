"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
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

export default function WindChart({ data }: { data: WeatherObs[] }) {
  const windStats = stats(data.map((d) => d.windspeedmph));
  const gustStats = stats(data.map((d) => d.windgustmph));
  return (
    <div>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} syncId="weather-24h">
            <XAxis dataKey="time" tickFormatter={fmtTime} minTickGap={28} />
            <YAxis domain={["auto", "auto"]} />
            <Tooltip labelFormatter={(v) => new Date(String(v)).toLocaleString()} />
            <Legend />
            <Bar dataKey="windspeedmph" name="Wind" fill="#7dd3fc" />
            <Bar dataKey="windgustmph" name="Gust" fill="#fbbf24" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="chartStats">
        <div>
          Wind Low {fmtStat(windStats?.min ?? null)} mph • High {fmtStat(windStats?.max ?? null)} mph • Average{" "}
          {fmtStat(windStats?.avg ?? null)} mph
        </div>
        <div>
          Gust Low {fmtStat(gustStats?.min ?? null)} mph • High {fmtStat(gustStats?.max ?? null)} mph • Average{" "}
          {fmtStat(gustStats?.avg ?? null)} mph
        </div>
      </div>
    </div>
  );
}
