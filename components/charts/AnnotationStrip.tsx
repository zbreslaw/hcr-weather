"use client";

import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { fmtDay, fmtTime } from "@/lib/utils/format";
import { dailyTicksAtHour, timeSpanMs } from "@/lib/utils/dates";

type Annotation = {
  id: number;
  event_type: string;
  observed_at: string;
  description?: string | null;
  tags?: string[] | null;
};

const EVENT_COLORS: Record<string, string> = {
  Snow: "#93c5fd",
  Lightning: "#facc15",
  Rain: "#60a5fa",
  Hail: "#e5e7eb",
  Ice: "#a5f3fc",
  Fog: "#cbd5f5",
  Temp: "#f97316",
  Wind: "#7dd3fc",
  "Power outage": "#f87171",
  "Equipment issue": "#fbbf24",
  Other: "#e5e7eb"
};

function fmtTooltipLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function AnnotationStrip({
  data,
  onSelect,
  selectedTime,
  onSelectAnnotation
}: {
  data: Annotation[];
  onSelect?: (time: string) => void;
  selectedTime?: string | null;
  onSelectAnnotation?: (annotation: Annotation) => void;
}) {
  const points = data.map((a) => ({
    id: a.id,
    time: a.observed_at,
    y: 1,
    event: a.event_type,
    description: a.description ?? "",
    color: EVENT_COLORS[a.event_type] ?? "#e5e7eb"
  }));
  const spanMs = timeSpanMs(points);
  const useDailyTicks = spanMs > 24 * 60 * 60 * 1000;
  const ticks = useDailyTicks ? dailyTicksAtHour(points, 12) : undefined;
  const tickFormatter = useDailyTicks ? fmtDay : fmtTime;

  return (
    <div style={{ height: 70 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart data={points} syncId="weather-24h">
          <XAxis dataKey="time" tickFormatter={tickFormatter} minTickGap={28} ticks={ticks} />
          <YAxis dataKey="y" hide domain={[0, 2]} />
          <Tooltip
            cursor={{ stroke: "rgba(255, 255, 255, 0.2)" }}
            labelFormatter={(v) => fmtTooltipLabel(String(v))}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const dataPoint = payload[0]?.payload as any;
              const details = dataPoint?.description ? ` — ${dataPoint.description}` : "";
              return (
                <div className="annotationTooltip">
                  <div className="annotationTooltipTitle">
                    {dataPoint?.event ?? "Event"}
                    {details}
                  </div>
                  <div className="annotationTooltipMeta">{fmtTooltipLabel(String(dataPoint?.time))}</div>
                </div>
              );
            }}
          />
          <Scatter
            data={points}
            dataKey="y"
            onClick={(payload) => {
              const time = (payload as any)?.payload?.time;
              if (time && onSelect) onSelect(time);
              const id = (payload as any)?.payload?.id;
              const annotation = data.find((a) => a.id === id);
              if (annotation && onSelectAnnotation) onSelectAnnotation(annotation);
            }}
          >
            {points.map((p) => (
              <Cell key={p.id} fill={p.color} stroke={p.time === selectedTime ? "#ffffff" : "none"} strokeWidth={2} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
