"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import type { WeatherObs } from "@/lib/data/types";

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDir(value: number) {
  if (value === 0 || value === 360) return "N";
  if (value === 90) return "W";
  if (value === 180) return "S";
  if (value === 270) return "E";
  return "";
}

export default function WindDirectionChart({ data }: { data: WeatherObs[] }) {
  return (
    <div>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} syncId="weather-24h">
            <XAxis dataKey="time" tickFormatter={fmtTime} minTickGap={28} />
            <YAxis
              domain={[0, 360]}
              ticks={[0, 90, 180, 270, 360]}
              interval={0}
              allowDecimals={false}
              tickFormatter={fmtDir}
            />
            <Tooltip labelFormatter={(v) => new Date(String(v)).toLocaleString()} />
            <Line type="monotone" dataKey="winddir" dot stroke="transparent" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
