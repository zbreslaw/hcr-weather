"use client";

import { useEffect, useMemo, useState } from "react";
import WeatherMap from "./WeatherMap";
import TempDewChart from "./charts/TempDewChart";
import PressureChart from "./charts/PressureChart";
import WindChart from "./charts/WindChart";
import WindDirectionChart from "./charts/WindDirectionChart";
import HumidityChart from "./charts/HumidityChart";
import SolarChart from "./charts/SolarChart";
import UVChart from "./charts/UVChart";
import RainChart from "./charts/RainChart";
import type { WeatherObs } from "@/lib/data/types";
import { fmt, fmtHighLow, fmtHour, fmtInches, fmtTemp } from "@/lib/utils/format";
import { dateKeyInTimeZone, getRangeWindow } from "@/lib/utils/dates";
import { heatIndexF, precipAmountIn, sumPrecipInches, windChillF } from "@/lib/utils/weather";

function rangeFor(values: WeatherObs[], getter: (d: WeatherObs) => number | null | undefined) {
  let min = Infinity;
  let max = -Infinity;
  for (const entry of values) {
    const value = getter(entry);
    if (value === null || value === undefined || Number.isNaN(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: null, max: null };
  return { min, max };
}

type SparklineProps = {
  values: Array<number | null | undefined>;
  width?: number;
  height?: number;
};

function Sparkline({ values, width = 110, height = 36 }: SparklineProps) {
  const points = values.filter((v) => v !== null && v !== undefined && !Number.isNaN(v)) as number[];
  if (points.length < 2) return null;

  let min = Math.min(...points);
  let max = Math.max(...points);
  if (min === max) {
    min -= 1;
    max += 1;
  }

  const step = width / (points.length - 1);
  const d = points
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / (max - min)) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg className="kpiSpark" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}


export default function Dashboard() {
  const [latest, setLatest] = useState<WeatherObs | null>(null);
  const [series, setSeries] = useState<WeatherObs[]>([]);
  const [rainTotalsSeries, setRainTotalsSeries] = useState<WeatherObs[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState("today");
  const [rangeLoading, setRangeLoading] = useState(false);
  const [forecast, setForecast] = useState<{
    daily: any[];
    hourly: any[];
    grid?: any | null;
    timeZone?: string | null;
  } | null>(null);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"current" | "historical" | "forecasted">("current");
  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertsError, setAlertsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setRangeLoading(true);
        setError(null);
        const { from, to } = getRangeWindow(range);
        const fromISO = from.toISOString();
        const toISO = to.toISOString();

        const [latestRes, rangeRes] = await Promise.all([
          fetch("/api/latest", { cache: "no-store" }),
          fetch(`/api/range?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}`, { cache: "no-store" })
        ]);

        if (!latestRes.ok) throw new Error(`latest error ${latestRes.status}`);
        if (!rangeRes.ok) throw new Error(`range error ${rangeRes.status}`);

        const latestJson = (await latestRes.json()) as WeatherObs;
        const rangeJson = (await rangeRes.json()) as WeatherObs[];

        if (!cancelled) {
          setLatest(latestJson);
          setSeries(rangeJson);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load");
      } finally {
        if (!cancelled) setRangeLoading(false);
      }
    }

    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [range]);

  useEffect(() => {
    let cancelled = false;

    async function loadRainTotals() {
      try {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const ninetyDaysAgo = new Date(now.getTime() - 89 * 24 * 60 * 60 * 1000);
        const start = startOfYear < ninetyDaysAgo ? startOfYear : ninetyDaysAgo;
        const res = await fetch(
          `/api/range?from=${encodeURIComponent(start.toISOString())}&to=${encodeURIComponent(now.toISOString())}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(`rain totals error ${res.status}`);
        const json = (await res.json()) as WeatherObs[];
        if (!cancelled) setRainTotalsSeries(json);
      } catch (e) {
        if (!cancelled) setRainTotalsSeries([]);
      }
    }

    loadRainTotals();
    const id = setInterval(loadRainTotals, 60 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAlerts() {
      try {
        setAlertsError(null);
        const res = await fetch("/api/alerts", { cache: "no-store" });
        if (!res.ok) throw new Error(`alerts error ${res.status}`);
        const json = await res.json();
        if (!cancelled) setAlerts(json?.alerts ?? []);
      } catch (e: any) {
        if (!cancelled) setAlertsError(e?.message ?? "Failed to load alerts");
      }
    }

    loadAlerts();
    const id = setInterval(loadAlerts, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadForecast() {
      try {
        setForecastError(null);
        const res = await fetch("/api/forecast", { cache: "no-store" });
        if (!res.ok) throw new Error(`forecast error ${res.status}`);
        const json = await res.json();
        if (!cancelled) setForecast(json);
      } catch (e: any) {
        if (!cancelled) setForecastError(e?.message ?? "Failed to load forecast");
      }
    }

    loadForecast();
    const id = setInterval(loadForecast, 30 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const stationTimeZone = useMemo(() => forecast?.timeZone ?? null, [forecast?.timeZone]);
  const todayKey = useMemo(() => dateKeyInTimeZone(new Date(), stationTimeZone), [stationTimeZone]);
  const dailyForecast = useMemo(() => {
    const periods = forecast?.daily ?? [];
    if (!periods.length) return [];
    const gridQuant = forecast?.grid?.quantitativePrecipitation;
    const gridValues = gridQuant?.values ?? [];
    const gridUnit = String(gridQuant?.uom ?? gridQuant?.unitCode ?? "");
    const labelOptions = stationTimeZone
      ? ({ month: "numeric", day: "numeric", timeZone: stationTimeZone } as const)
      : ({ month: "numeric", day: "numeric" } as const);

    const summaries: Array<{
      name: string | null;
      dateLabel: string | null;
      dateKey: string | null;
      icon: string | null;
      summary: string | null;
      high: number | null;
      low: number | null;
      tempUnit: string | null;
      rainChance: number | null;
      precipIn: number | null;
      wind: string | null;
    }> = [];

    for (let i = 0; i < periods.length; i += 1) {
      const day = periods[i];
      if (!day?.isDaytime) continue;
      const night = periods[i + 1]?.isDaytime ? null : periods[i + 1];
      const dayChance = day?.probabilityOfPrecipitation?.value;
      const nightChance = night?.probabilityOfPrecipitation?.value;
      const rainChance =
        dayChance === null || dayChance === undefined
          ? nightChance ?? null
          : nightChance === null || nightChance === undefined
            ? dayChance
            : Math.max(dayChance, nightChance);
      const dayPrecip = precipAmountIn(day);
      const nightPrecip = precipAmountIn(night);
      const rangeStart = new Date(day?.startTime ?? "");
      const rangeEnd = new Date(night?.endTime ?? day?.endTime ?? "");
      const gridPrecipIn =
        gridValues.length && !Number.isNaN(rangeStart.getTime()) && !Number.isNaN(rangeEnd.getTime())
          ? sumPrecipInches(gridValues, rangeStart, rangeEnd, gridUnit)
          : null;
      const precipIn =
        gridPrecipIn ??
        (dayPrecip === null && nightPrecip === null ? null : (dayPrecip ?? 0) + (nightPrecip ?? 0));
      const date = day?.startTime ? new Date(day.startTime) : null;
      const dateLabel =
        date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString([], labelOptions) : null;
      const dateKey = date && !Number.isNaN(date.getTime()) ? dateKeyInTimeZone(date, stationTimeZone) : null;

      summaries.push({
        name: day?.name ?? null,
        dateLabel,
        dateKey,
        icon: day?.icon ?? null,
        summary: day?.shortForecast ?? null,
        high: day?.temperature ?? null,
        low: night?.temperature ?? null,
        tempUnit: day?.temperatureUnit ?? night?.temperatureUnit ?? null,
        rainChance: rainChance ?? null,
        precipIn,
        wind: day?.windSpeed ?? night?.windSpeed ?? null
      });

      if (summaries.length >= 7) break;
    }

    const buildSeven = (list: Array<{ dateKey: string | null } & Record<string, any>>) =>
      list.filter((p) => (p?.dateKey ?? "") >= todayKey).slice(0, 7);

    if (summaries.length) {
      return buildSeven(summaries);
    }

    const fallback = periods.map((p) => ({
      name: p?.name ?? null,
      dateLabel: p?.startTime ? new Date(p.startTime).toLocaleDateString([], labelOptions) : null,
      dateKey: p?.startTime ? dateKeyInTimeZone(new Date(p.startTime), stationTimeZone) : null,
      icon: p?.icon ?? null,
      summary: p?.shortForecast ?? null,
      high: p?.temperature ?? null,
      low: null,
      tempUnit: p?.temperatureUnit ?? null,
      rainChance: p?.probabilityOfPrecipitation?.value ?? null,
      precipIn: precipAmountIn(p),
      wind: p?.windSpeed ?? null
    }));
    return buildSeven(fallback);
  }, [forecast, stationTimeZone, todayKey]);

  const hourlyForecast = useMemo(() => (forecast?.hourly ?? []).slice(0, 48), [forecast]);
  const hourlyByDay = useMemo(() => {
    const periods = forecast?.hourly ?? [];
    if (!periods.length) return [];

    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startTomorrow = new Date(startToday.getTime() + 24 * 60 * 60 * 1000);
    const startDayAfter = new Date(startToday.getTime() + 2 * 24 * 60 * 60 * 1000);
    const startFourth = new Date(startToday.getTime() + 3 * 24 * 60 * 60 * 1000);

    const buckets = [
      { label: "Today", start: startToday, end: startTomorrow },
      { label: "Tomorrow", start: startTomorrow, end: startDayAfter },
      { label: startDayAfter.toLocaleDateString([], { weekday: "long" }), start: startDayAfter, end: startFourth }
    ];

    const groups = buckets.map((b) => ({
      label: b.label,
      hours: periods.filter((p) => {
        const t = p?.startTime ? new Date(p.startTime) : null;
        if (!t || Number.isNaN(t.getTime())) return false;
        return t >= b.start && t < b.end;
      })
    }));

    groups[0].hours = groups[0].hours.filter((p) => {
      const t = p?.startTime ? new Date(p.startTime) : null;
      if (!t || Number.isNaN(t.getTime())) return false;
      return t >= now;
    });

    return groups;
  }, [forecast]);
  const todayKeyLocal = useMemo(() => new Date().toDateString(), []);
  const todaySeries = useMemo(
    () => series.filter((d) => new Date(d.time).toDateString() === todayKeyLocal),
    [series, todayKeyLocal]
  );
  const rainyStreak = useMemo(() => {
    if (!rainTotalsSeries.length) return null;
    const maxByDay = new Map<string, number>();
    for (const entry of rainTotalsSeries) {
      if (entry.dailyrainin == null || Number.isNaN(entry.dailyrainin)) continue;
      const dayKey = new Date(entry.time).toDateString();
      const prev = maxByDay.get(dayKey) ?? 0;
      if (entry.dailyrainin > prev) maxByDay.set(dayKey, entry.dailyrainin);
    }

    const ref = latest?.time ? new Date(latest.time) : new Date();
    let streak = 0;

    for (let i = 0; i < 366; i += 1) {
      const day = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - i);
      const key = day.toDateString();
      const max = maxByDay.get(key) ?? 0;
      if (max >= 0.01) {
        streak += 1;
      } else {
        break;
      }
    }

    return streak;
  }, [rainTotalsSeries, latest?.time]);
  const todaySolarTotal = useMemo(() => {
    const points = todaySeries
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
  }, [todaySeries]);
  const todayRanges = useMemo(
    () => ({
      temp: rangeFor(todaySeries, (d) => d.tempf),
      dew: rangeFor(todaySeries, (d) => d.dewpointf),
      rain: rangeFor(todaySeries, (d) => d.dailyrainin),
      pressure: rangeFor(todaySeries, (d) => d.baromrelin),
      wind: rangeFor(todaySeries, (d) => d.windspeedmph),
      humidity: rangeFor(todaySeries, (d) => d.humidity),
      solar: rangeFor(todaySeries, (d) => d.solarradiation),
      uv: rangeFor(todaySeries, (d) => d.uv)
    }),
    [todaySeries]
  );
  const todayForecast = useMemo(() => {
    if (!dailyForecast.length) return null;
    const exact = dailyForecast.find((p) => p?.dateKey === todayKey);
    if (exact) return exact;
    const next = dailyForecast.find((p) => (p?.dateKey ?? "") >= todayKey);
    return next ?? dailyForecast[0];
  }, [dailyForecast, todayKey]);
  const feelsLike = useMemo(() => {
    const windChill = windChillF(latest?.tempf ?? null, latest?.windspeedmph ?? null);
    const heatIndex = heatIndexF(latest?.tempf ?? null, latest?.humidity ?? null);
    if (heatIndex != null) return { value: heatIndex, label: "Heat Index" };
    if (windChill != null) return { value: windChill, label: "Wind Chill" };
    return null;
  }, [latest?.tempf, latest?.windspeedmph, latest?.humidity]);

  return (
    <>
      <div className="tabs">
        <button
          type="button"
          className={`tabButton ${activeTab === "current" ? "tabButtonActive" : ""}`}
          onClick={() => setActiveTab("current")}
        >
          Current
        </button>
        <button
          type="button"
          className={`tabButton ${activeTab === "forecasted" ? "tabButtonActive" : ""}`}
          onClick={() => setActiveTab("forecasted")}
        >
          Forecasted
        </button>
        <button
          type="button"
          className={`tabButton ${activeTab === "historical" ? "tabButtonActive" : ""}`}
          onClick={() => setActiveTab("historical")}
        >
          Historical
        </button>
      </div>

      {activeTab === "current" && (
        <div className="grid">
          <div className="panel">
            <div className="panelHeader">
              <div>Station view</div>
              <div className="muted">
                {latest
                  ? `Updated ${new Date(latest.time).toLocaleString([], {
                      year: "numeric",
                      month: "numeric",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit"
                    })}`
                  : "Loading…"}
              </div>
            </div>
            <WeatherMap
              latest={latest}
              series={series}
              timeZone={stationTimeZone}
              alerts={
                <div className="alertsPanel">
                  <div className="alertsHeader">
                    <div>Weather Alerts</div>
                    <div className="muted">{alertsError ? `Error: ${alertsError}` : " "}</div>
                  </div>
                  <div className="alertsList">
                    {alerts.length ? (
                      alerts.map((alert, idx) => (
                        <div className="alertCard" key={`${alert?.id ?? "alert"}-${idx}`}>
                          <div className="alertTitle">{alert?.event ?? "Alert"}</div>
                          <div className="alertMeta">
                            {alert?.severity ? `Severity: ${alert.severity}` : "Severity: —"}
                            {alert?.effective ? ` • Starts ${new Date(alert.effective).toLocaleString()}` : ""}
                            {alert?.ends ? ` • Ends ${new Date(alert.ends).toLocaleString()}` : ""}
                          </div>
                          {alert?.headline && <div className="alertBody">{alert.headline}</div>}
                        </div>
                      ))
                    ) : (
                      <div className="muted">No active alerts.</div>
                    )}
                  </div>
                </div>
              }
            />
          </div>

          <div className="rightStack">
            <div className="panel">
              <div className="panelHeader">
                <div>Now</div>
                <div className="muted">{error ? `Error: ${error}` : " "}</div>
              </div>

              <div className="panelBody">
                <div className="kpis kpisStacked">
                  <div className="kpi">
                    <div className="kpiRow">
                      <div className="kpiMain">
                        <div className="kpiLabel">Tempature</div>
                        <div className="kpiValue">{fmt(latest?.tempf, "°F")}</div>
                        <div className="kpiMeta">
                          Today {fmtHighLow(todayRanges.temp.min, todayRanges.temp.max, "°F")}
                        </div>
                        <div className="kpiMeta">
                          Forecast {fmtTemp(todayForecast?.high, todayForecast?.tempUnit)} /{" "}
                          {fmtTemp(todayForecast?.low, todayForecast?.tempUnit)}
                        </div>
                        {feelsLike ? (
                          <div className="kpiMeta">
                            Feels Like {fmtTemp(feelsLike.value, "F")} ({feelsLike.label})
                          </div>
                        ) : null}
                      </div>
                      <Sparkline values={todaySeries.map((d) => d.tempf ?? null)} />
                    </div>
                  </div>
                  <div className="kpi">
                    <div className="kpiRow">
                      <div className="kpiMain">
                        <div className="kpiLabel">Dew Point</div>
                        <div className="kpiValue">{fmt(latest?.dewpointf, "°F")}</div>
                        <div className="kpiMeta">
                          Today {fmtHighLow(todayRanges.dew.min, todayRanges.dew.max, "°F")}
                        </div>
                      </div>
                      <Sparkline values={todaySeries.map((d) => d.dewpointf ?? null)} />
                    </div>
                  </div>
                  <div className="kpi">
                    <div className="kpiRow">
                      <div className="kpiMain">
                        <div className="kpiLabel">Today&apos;s Rain</div>
                        <div className="kpiValue">{fmtInches(todayRanges.rain.max)}</div>
                        <div className="kpiMeta">Forecast {fmtInches(todayForecast?.precipIn ?? null)}</div>
                        <div className="kpiMeta">
                          Rainy Day Streak: {rainyStreak == null ? "—" : `${rainyStreak} ${rainyStreak === 1 ? "day" : "days"}`}
                        </div>
                      </div>
                      <Sparkline values={todaySeries.map((d) => d.dailyrainin ?? null)} />
                    </div>
                  </div>
                  <div className="kpi">
                    <div className="kpiRow">
                      <div className="kpiMain">
                        <div className="kpiLabel">Relative Pressure</div>
                        <div className="kpiValue">{fmt(latest?.baromrelin, " inHg")}</div>
                        <div className="kpiMeta">
                          Today {fmtHighLow(todayRanges.pressure.min, todayRanges.pressure.max, " inHg")}
                        </div>
                      </div>
                      <Sparkline values={todaySeries.map((d) => d.baromrelin ?? null)} />
                    </div>
                  </div>
                  <div className="kpi">
                    <div className="kpiRow">
                      <div className="kpiMain">
                        <div className="kpiLabel">Wind</div>
                        <div className="kpiValue">
                          {fmt(latest?.windspeedmph, " mph")}
                          {latest?.windgustmph != null ? ` / G ${fmt(latest.windgustmph, " mph")}` : ""}
                        </div>
                      </div>
                      <Sparkline values={todaySeries.map((d) => d.windspeedmph ?? null)} />
                    </div>
                  </div>
                  <div className="kpi">
                    <div className="kpiRow">
                      <div className="kpiMain">
                        <div className="kpiLabel">Humidity</div>
                        <div className="kpiValue">{fmt(latest?.humidity, "%")}</div>
                        <div className="kpiMeta">
                          Today {fmtHighLow(todayRanges.humidity.min, todayRanges.humidity.max, "%")}
                        </div>
                      </div>
                      <Sparkline values={todaySeries.map((d) => d.humidity ?? null)} />
                    </div>
                  </div>
                  <div className="kpi">
                    <div className="kpiRow">
                      <div className="kpiMain">
                        <div className="kpiLabel">Solar Radiation</div>
                        <div className="kpiValue">{fmt(latest?.solarradiation, " W/m²")}</div>
                        <div className="kpiMeta">
                          Today&apos;s Total {fmt(todaySolarTotal, " Wh/m²")}
                        </div>
                      </div>
                      <Sparkline values={todaySeries.map((d) => d.solarradiation ?? null)} />
                    </div>
                  </div>
                  <div className="kpi">
                    <div className="kpiRow">
                      <div className="kpiMain">
                        <div className="kpiLabel">Ultra-Violet Radiation Index</div>
                        <div className="kpiValue">{fmt(latest?.uv)}</div>
                        <div className="kpiMeta">Today&apos;s Max {todayRanges.uv.max}</div>
                      </div>
                      <Sparkline values={todaySeries.map((d) => d.uv ?? null)} />
                    </div>
                  </div>
                  <div className="kpi kpiEmbed">
                    <div className="kpiMain">
                      <div className="kpiLabel">Air Quality</div>
                    </div>
                    <iframe
                      title="Air Quality Dial"
                      src="https://widget.airnow.gov/aq-dial-widget/?city=Cottage Grove&state=OR&country=USA&transparent=true"
                      className="kpiEmbedFrame"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "forecasted" && (
        <div className="tabContent">
          <div className="panel">
            <div className="panelHeader">
              <div>Forecast</div>
              <div className="muted">{forecastError ? `Error: ${forecastError}` : " "}</div>
            </div>
            <div className="panelBody">
              <div className="forecastSection">
                <div className="forecastTitle">Next {dailyForecast.length} Days</div>
                <div className="forecastDaily">
                  {dailyForecast.length ? (
                    dailyForecast.map((p, idx) => (
                      <div className="forecastCard" key={`${p?.name ?? "day"}-${idx}`}>
                        <div className="forecastName">
                          {p?.name ?? "—"}
                          {p?.dateLabel ? <span className="forecastDate"> {p.dateLabel}</span> : ""}
                        </div>
                        <div className="forecastSummary">{p?.summary ?? "—"}</div>
                        <div className="forecastTemp">
                          High {fmtTemp(p?.high, p?.tempUnit)} / Low {fmtTemp(p?.low, p?.tempUnit)}
                        </div>
                        <div className="forecastMeta">
                          <div>Rain {p?.rainChance != null ? `${p.rainChance}%` : "—"}</div>
                          <div>Precip {fmtInches(p?.precipIn)}</div>
                          <div>Wind {p?.wind ?? "—"}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="muted">Loading…</div>
                  )}
                </div>
              </div>

              <div className="forecastSection">
                <div className="forecastTitle">Hourly Forecast</div>
                <div className="forecastHourlyGrid">
                  {hourlyByDay.some((g) => g.hours.length) ? (
                    hourlyByDay.map((group) => (
                      <div className="forecastDayColumn" key={group.label}>
                        <div className="forecastDayHeader">{group.label}</div>
                        <div className="forecastHourList">
                          {group.hours.length ? (
                            group.hours.map((p, idx) => (
                              <div className="forecastHourRow" key={`${p?.startTime ?? "hour"}-${idx}`}>
                                <div className="forecastHour">{p?.startTime ? fmtHour(p.startTime) : "—"}</div>
                                <div className="forecastTemp">
                                  {p?.temperature != null ? `${p.temperature}°${p.temperatureUnit ?? "F"}` : "—"}
                                </div>
                                <div className="forecastWind">{p?.windSpeed ?? "—"}</div>
                                <div className="forecastPrecip">Precip {fmtInches(precipAmountIn(p))}</div>
                                <div className="forecastSummary">{p?.shortForecast ?? "—"}</div>
                              </div>
                            ))
                          ) : (
                            <div className="muted">No hours</div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="muted">Loading…</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "historical" && (
        <div className="tabContent">
          <div className="panel">
            <div className="panelHeader">
              <div>Historical</div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <label className="muted" htmlFor="rangeSelect">
                  Range
                </label>
                <select
                  id="rangeSelect"
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                  style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    borderRadius: 10,
                    padding: "6px 8px",
                    fontSize: 12
                  }}
                >
                  <option value="today">Today</option>
                  <option value="1h">Past hour</option>
                  <option value="12h">Past 12 hours</option>
                  <option value="24h">Past 24 hours</option>
                  <option value="3d">Past 3 days</option>
                  <option value="7d">Past week</option>
                  <option value="30d">Past month</option>
                  <option value="ytd">Year to date</option>
                  <option value="all">All time</option>
                </select>
                {rangeLoading ? <span className="muted">Loading…</span> : null}
              </div>
            </div>

            <div className="panelBody">
              <div className="panel" style={{ borderRadius: 14 }}>
                <div className="panelHeader">
                  <div>Temp & Dew Point</div>
                  <div className="muted">°F</div>
                </div>
                <div className="panelBody">
                  <TempDewChart data={series} />
                </div>
              </div>

              <div style={{ height: 12 }} />

              <div className="panel" style={{ borderRadius: 14 }}>
                <div className="panelHeader">
                  <div>Daily Rain</div>
                  <div className="muted">in</div>
                </div>
                <div className="panelBody">
                  <RainChart data={series} totalsData={rainTotalsSeries} />
                </div>
              </div>

              <div style={{ height: 12 }} />

              <div className="panel" style={{ borderRadius: 14 }}>
                <div className="panelHeader">
                  <div>Pressure</div>
                  <div className="muted">inHg</div>
                </div>
                <div className="panelBody">
                  <PressureChart data={series} />
                </div>
              </div>

              <div style={{ height: 12 }} />

              <div className="panel" style={{ borderRadius: 14 }}>
                <div className="panelHeader">
                  <div>Wind</div>
                  <div className="muted">mph</div>
                </div>
                <div className="panelBody">
                  <WindChart data={series} />
                </div>
              </div>

              <div style={{ height: 12 }} />

              <div className="panel" style={{ borderRadius: 14 }}>
                <div className="panelHeader">
                  <div>Wind Direction</div>
                  <div className="muted">N / E / S / W</div>
                </div>
                <div className="panelBody">
                  <WindDirectionChart data={series} />
                </div>
              </div>

              <div style={{ height: 12 }} />

              <div className="panel" style={{ borderRadius: 14 }}>
                <div className="panelHeader">
                  <div>Humidity</div>
                  <div className="muted">%</div>
                </div>
                <div className="panelBody">
                  <HumidityChart data={series} />
                </div>
              </div>

              <div style={{ height: 12 }} />

              <div className="panel" style={{ borderRadius: 14 }}>
                <div className="panelHeader">
                  <div>Solar Radiation</div>
                  <div className="muted">W/m²</div>
                </div>
                <div className="panelBody">
                  <SolarChart data={series} />
                </div>
              </div>

              <div style={{ height: 12 }} />

              <div className="panel" style={{ borderRadius: 14 }}>
                <div className="panelHeader">
                  <div>UV Index</div>
                  <div className="muted">UV</div>
                </div>
                <div className="panelBody">
                  <UVChart data={series} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
