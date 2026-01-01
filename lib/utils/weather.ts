import type { WeatherObs } from "@/lib/data/types";
import { parseValidTime } from "./dates";

export function degToCompass(deg: number) {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const ix = Math.round(((deg % 360) / 22.5)) % 16;
  return dirs[ix];
}

export function windVariabilityDeg(series: WeatherObs[], refTime: Date, windowMs: number) {
  const cutoff = refTime.getTime() - windowMs;
  let sumSin = 0;
  let sumCos = 0;
  let count = 0;

  for (const entry of series) {
    const dir = entry.winddir;
    if (dir === null || dir === undefined || Number.isNaN(dir)) continue;
    const t = new Date(entry.time).getTime();
    if (!Number.isFinite(t) || t < cutoff || t > refTime.getTime()) continue;
    const rad = (dir * Math.PI) / 180;
    sumSin += Math.sin(rad);
    sumCos += Math.cos(rad);
    count += 1;
  }

  if (count < 2) return null;
  const rRaw = Math.hypot(sumSin, sumCos) / count;
  if (!Number.isFinite(rRaw)) return null;
  const r = Math.min(1, Math.max(0, rRaw));
  if (r >= 1) return 0;
  if (r <= 0) return 180;
  const stdRad = Math.sqrt(-2 * Math.log(r));
  const stdDeg = (stdRad * 180) / Math.PI;
  return Math.min(180, stdDeg);
}

export function maxGustForDay(series: WeatherObs[], refTime: Date) {
  const start = new Date(refTime.getFullYear(), refTime.getMonth(), refTime.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  let max = -Infinity;

  for (const entry of series) {
    const gust = entry.windgustmph;
    if (gust === null || gust === undefined || Number.isNaN(gust)) continue;
    const t = new Date(entry.time).getTime();
    if (!Number.isFinite(t) || t < start.getTime() || t >= end.getTime()) continue;
    if (gust > max) max = gust;
  }

  return Number.isFinite(max) ? max : null;
}

export function meanWindSpeed(series: WeatherObs[], refTime: Date, windowMs: number) {
  const cutoff = refTime.getTime() - windowMs;
  let total = 0;
  let count = 0;

  for (const entry of series) {
    const speed = entry.windspeedmph;
    if (speed === null || speed === undefined || Number.isNaN(speed)) continue;
    const t = new Date(entry.time).getTime();
    if (!Number.isFinite(t) || t < cutoff || t > refTime.getTime()) continue;
    total += speed;
    count += 1;
  }

  return count ? total / count : null;
}

export function windRunMilesForDay(series: WeatherObs[], refTime: Date) {
  const start = new Date(refTime.getFullYear(), refTime.getMonth(), refTime.getDate()).getTime();
  const end = start + 24 * 60 * 60 * 1000;
  const points = series
    .map((entry) => ({
      time: new Date(entry.time).getTime(),
      speed: entry.windspeedmph
    }))
    .filter((entry) => Number.isFinite(entry.time) && entry.time >= start && entry.time < end && entry.speed != null)
    .sort((a, b) => a.time - b.time);

  if (points.length < 2) return null;

  let miles = 0;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const dtHours = (curr.time - prev.time) / (1000 * 60 * 60);
    if (dtHours <= 0) continue;
    const prevSpeed = prev.speed ?? 0;
    const currSpeed = curr.speed ?? 0;
    const avgSpeed = (prevSpeed + currSpeed) / 2;
    miles += avgSpeed * dtHours;
  }

  return Number.isFinite(miles) ? miles : null;
}

export function windChillF(tempF: number | null | undefined, windMph: number | null | undefined) {
  if (tempF == null || windMph == null || Number.isNaN(tempF) || Number.isNaN(windMph)) return null;
  if (tempF > 50 || windMph <= 3) return null;
  return 35.74 + 0.6215 * tempF - 35.75 * Math.pow(windMph, 0.16) + 0.4275 * tempF * Math.pow(windMph, 0.16);
}

export function heatIndexF(tempF: number | null | undefined, humidity: number | null | undefined) {
  if (tempF == null || humidity == null || Number.isNaN(tempF) || Number.isNaN(humidity)) return null;
  if (tempF < 80 || humidity < 40) return null;
  const t = tempF;
  const rh = humidity;
  return (
    -42.379 +
    2.04901523 * t +
    10.14333127 * rh -
    0.22475541 * t * rh -
    0.00683783 * t * t -
    0.05481717 * rh * rh +
    0.00122874 * t * t * rh +
    0.00085282 * t * rh * rh -
    0.00000199 * t * t * rh * rh
  );
}

export function precipValueToInches(value: number, unitCode: string) {
  const unit = unitCode.toLowerCase();
  if (unit.includes("mm")) return value / 25.4;
  if (unit.includes("cm")) return value / 2.54;
  if (unit.includes("in")) return value;
  return value / 25.4;
}

export function sumPrecipInches(values: any[], rangeStart: Date, rangeEnd: Date, unitCode: string) {
  if (!values?.length) return null;
  const startMs = rangeStart.getTime();
  const endMs = rangeEnd.getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;

  let totalBase = 0;

  for (const entry of values) {
    const value = entry?.value;
    if (value === null || value === undefined || Number.isNaN(value)) continue;
    const range = parseValidTime(entry?.validTime ?? "");
    if (!range) continue;
    const entryStart = range.start.getTime();
    const entryEnd = range.end.getTime();
    if (entryEnd <= entryStart) continue;
    const overlap = Math.max(0, Math.min(entryEnd, endMs) - Math.max(entryStart, startMs));
    if (overlap <= 0) continue;
    const portion = overlap / (entryEnd - entryStart);
    totalBase += value * portion;
  }

  if (!Number.isFinite(totalBase)) return null;
  return precipValueToInches(totalBase, unitCode);
}

export function precipAmountIn(period: any) {
  const amount = period?.quantitativePrecipitation ?? period?.precipitationAmount;
  const value = amount?.value;
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const unitCode = String(amount?.unitCode ?? amount?.uom ?? "").toLowerCase();
  if (unitCode.includes("mm")) return value / 25.4;
  return value;
}

export function totalWhPerM2(data: WeatherObs[]) {
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
