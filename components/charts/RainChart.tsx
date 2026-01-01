"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import type { WeatherObs } from "@/lib/data/types";
import { fmtInches } from "@/lib/utils/format";

function dayLabel(date: Date) {
  return date.toLocaleDateString([], { month: "numeric", day: "numeric" });
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export default function RainChart({ data, totalsData }: { data: WeatherObs[]; totalsData?: WeatherObs[] }) {
  const daily = new Map<string, { date: Date; label: string; max: number }>();

  for (const entry of data) {
    const rain = entry.dailyrainin;
    if (rain === null || rain === undefined || Number.isNaN(rain)) continue;
    const date = new Date(entry.time);
    if (Number.isNaN(date.getTime())) continue;
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const key = dateKey(dayStart);
    const existing = daily.get(key);
    if (!existing || rain > existing.max) {
      daily.set(key, { date: dayStart, label: dayLabel(dayStart), max: rain });
    }
  }

  const dailyData = Array.from(daily.values()).sort((a, b) => a.date.getTime() - b.date.getTime());

  const totalsDaily = new Map<string, { date: Date; label: string; max: number }>();
  const totalsSource = totalsData ?? data;

  for (const entry of totalsSource) {
    const rain = entry.dailyrainin;
    if (rain === null || rain === undefined || Number.isNaN(rain)) continue;
    const date = new Date(entry.time);
    if (Number.isNaN(date.getTime())) continue;
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const key = dateKey(dayStart);
    const existing = totalsDaily.get(key);
    if (!existing || rain > existing.max) {
      totalsDaily.set(key, { date: dayStart, label: dayLabel(dayStart), max: rain });
    }
  }

  const totalsDataByDay = Array.from(totalsDaily.values());
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const msDay = 24 * 60 * 60 * 1000;
  const cutoff7 = new Date(todayStart.getTime() - 6 * msDay);
  const cutoff30 = new Date(todayStart.getTime() - 29 * msDay);
  const cutoff90 = new Date(todayStart.getTime() - 89 * msDay);
  const startOfYear = new Date(todayStart.getFullYear(), 0, 1);

  const totals = totalsDataByDay.reduce(
    (acc, d) => {
      if (d.date >= cutoff7) acc.last7 += d.max;
      if (d.date >= cutoff30) acc.last30 += d.max;
      if (d.date >= cutoff90) acc.last90 += d.max;
      if (d.date >= startOfYear) acc.ytd += d.max;
      return acc;
    },
    { last7: 0, last30: 0, last90: 0, ytd: 0 }
  );

  return (
    <div>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dailyData}>
            <XAxis dataKey="label" minTickGap={12} />
            <YAxis domain={[0, "auto"]} />
            <Tooltip cursor={false} />
            <Bar dataKey="max" fill="rgba(255, 255, 255, 0.6)" activeBar={undefined} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="chartStats">
        <div>
          Past 7 days {fmtInches(Number.isFinite(totals.last7) ? totals.last7 : 0)} • Past 30 days{" "}
          {fmtInches(Number.isFinite(totals.last30) ? totals.last30 : 0)} • Past 90 days{" "}
          {fmtInches(Number.isFinite(totals.last90) ? totals.last90 : 0)} • YTD{" "}
          {fmtInches(Number.isFinite(totals.ytd) ? totals.ytd : 0)}
        </div>
      </div>
    </div>
  );
}
