"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";
import type { ElectricUsageDay } from "@/lib/data/electric-types";
import { fmtStat } from "@/lib/utils/format";
import { stats } from "@/lib/utils/math";

type ChartRow = {
  usage_date: string;
  label: string;
  kwh: number | null;
  demand_kw: number | null;
};

function dayLabel(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString([], { month: "numeric", day: "numeric" });
}

function toChartRows(data: ElectricUsageDay[]): ChartRow[] {
  return data.map((entry) => ({
    usage_date: entry.usage_date,
    label: dayLabel(entry.usage_date),
    kwh: entry.kwh,
    demand_kw: entry.demand_kw
  }));
}

export default function ElectricUsageChart({ data }: { data: ElectricUsageDay[] }) {
  const chartData = toChartRows(data);
  const kwhStats = stats(chartData.map((d) => d.kwh));
  const demandStats = stats(chartData.map((d) => d.demand_kw));
  const totalKwh = chartData.reduce((sum, d) => sum + (d.kwh ?? 0), 0);

  const tooltipValue = (value: number | string | null, name: string) => {
    if (typeof value !== "number" || !Number.isFinite(value)) return ["—", name];
    const unit = name === "kwh" ? "kWh" : "kW";
    return [`${value.toFixed(name === "demand_kw" ? 3 : 2)} ${unit}`, name === "kwh" ? "kWh" : "Demand"];
  };

  return (
    <div>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid stroke="rgba(255, 255, 255, 0.06)" vertical={false} />
            <XAxis dataKey="label" minTickGap={12} />
            <YAxis
              yAxisId="kwh"
              orientation="left"
              tickFormatter={(value) => (typeof value === "number" ? value.toFixed(0) : value)}
              width={48}
            />
            <YAxis
              yAxisId="demand"
              orientation="right"
              tickFormatter={(value) => (typeof value === "number" ? value.toFixed(1) : value)}
              width={48}
            />
            <Tooltip
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as ChartRow | undefined;
                return row ? dayLabel(row.usage_date) : "";
              }}
              formatter={(value, name) => tooltipValue(value as number | null, String(name))}
            />
            <Bar
              yAxisId="kwh"
              dataKey="kwh"
              fill="rgba(96, 165, 250, 0.75)"
              radius={[4, 4, 0, 0]}
              maxBarSize={42}
            />
            <Line
              yAxisId="demand"
              type="monotone"
              dataKey="demand_kw"
              stroke="#f97316"
              strokeWidth={2}
              dot={{ r: 3, fill: "#f97316", stroke: "#0b1220", strokeWidth: 1 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="chartStats">
        <div>
          Total {fmtStat(totalKwh, 2)} kWh • Avg {fmtStat(kwhStats?.avg ?? null, 2)} kWh/day • Peak demand{" "}
          {fmtStat(demandStats?.max ?? null, 3)} kW
        </div>
      </div>
    </div>
  );
}
