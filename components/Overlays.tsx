"use client";
import SunCalc from "suncalc";
import type { WeatherObs } from "@/lib/data/types";

function degToCompass(deg: number) {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const ix = Math.round(((deg % 360) / 22.5)) % 16;
  return dirs[ix];
}

function fmt(n: number | null | undefined, suffix = "") {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${Math.round(n * 10) / 10}${suffix}`;
}

type Props = {
  latest: WeatherObs | null;
  series: WeatherObs[];
  stationLat: number;
  stationLon: number;
};

function windVariabilityDeg(series: WeatherObs[], refTime: Date, windowMs: number) {
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
  const r = Math.hypot(sumSin, sumCos) / count;
  if (r <= 0) return 180;
  const stdRad = Math.sqrt(-2 * Math.log(r));
  const stdDeg = (stdRad * 180) / Math.PI;
  return Math.min(180, stdDeg);
}

function maxGustForDay(series: WeatherObs[], refTime: Date) {
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

function meanWindSpeed(series: WeatherObs[], refTime: Date, windowMs: number) {
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

function windRunMilesForDay(series: WeatherObs[], refTime: Date) {
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

function windChillF(tempF: number | null | undefined, windMph: number | null | undefined) {
  if (tempF == null || windMph == null || Number.isNaN(tempF) || Number.isNaN(windMph)) return null;
  if (tempF > 50 || windMph <= 3) return null;
  return 35.74 + 0.6215 * tempF - 35.75 * Math.pow(windMph, 0.16) + 0.4275 * tempF * Math.pow(windMph, 0.16);
}

export default function Overlays({ latest, series, stationLat, stationLon }: Props) {
  const now = new Date();
  const refTime = latest?.time ? new Date(latest.time) : now;
  const sun = SunCalc.getPosition(now, stationLat, stationLon);
  const moon = SunCalc.getMoonPosition(now, stationLat, stationLon);
  const moonIllum = SunCalc.getMoonIllumination(now);
  const sunTimes = SunCalc.getTimes(now, stationLat, stationLon);

  // SunCalc azimuth is measured from south and is negative westward; shift to 0..360
  const sunAz = (sun.azimuth * 180) / Math.PI + 180;
  const sunAlt = (sun.altitude * 180) / Math.PI;

  const moonAz = (moon.azimuth * 180) / Math.PI + 180;
  const moonAlt = (moon.altitude * 180) / Math.PI;
  const moonIllumPct = Math.round(moonIllum.fraction * 100);
  const moonPhaseName = (phase: number) => {
    if (phase < 0.03 || phase > 0.97) return "New Moon";
    if (phase < 0.22) return "Waxing Crescent";
    if (phase < 0.28) return "First Quarter";
    if (phase < 0.47) return "Waxing Gibbous";
    if (phase < 0.53) return "Full Moon";
    if (phase < 0.72) return "Waning Gibbous";
    if (phase < 0.78) return "Last Quarter";
    return "Waning Crescent";
  };
  const moonPhaseLabel = moonPhaseName(moonIllum.phase);
  const nextFullMoon = (() => {
    const start = new Date(now);
    let best: Date | null = null;
    let bestDelta = Infinity;
    for (let i = 1; i <= 30 * 24; i += 1) {
      const t = new Date(start.getTime() + i * 60 * 60 * 1000);
      const phase = SunCalc.getMoonIllumination(t).phase;
      const delta = Math.abs(phase - 0.5);
      if (delta < bestDelta) {
        bestDelta = delta;
        best = t;
      }
      if (bestDelta < 0.002) break;
    }
    return best;
  })();

  const windDir = latest?.winddir ?? null;
  const windVar = windVariabilityDeg(series, refTime, 15 * 60 * 1000);
  const windVarLabel = windVar == null ? null : windVar < 10 ? "low" : windVar < 30 ? "med" : "high";
  const maxGustToday = maxGustForDay(series, refTime);
  const meanWind = meanWindSpeed(series, refTime, 15 * 60 * 1000);
  const gustFactor =
    latest?.windgustmph != null && meanWind != null && meanWind > 0 ? latest.windgustmph / meanWind : null;
  const gustFactorLabel =
    gustFactor == null ? null : gustFactor <= 1.3 ? "Smooth" : gustFactor <= 1.6 ? "Gusty" : "Turbulent";
  const windRunToday = windRunMilesForDay(series, refTime);
  const windChill = windChillF(latest?.tempf ?? null, latest?.windspeedmph ?? null);
  const dayLengthMs = sunTimes.sunset.getTime() - sunTimes.sunrise.getTime();
  const dayLengthLabel =
    Number.isFinite(dayLengthMs) && dayLengthMs > 0
      ? `${Math.floor(dayLengthMs / 3_600_000)}h ${Math.round((dayLengthMs % 3_600_000) / 60_000)}m`
      : "—";

  return (
    <div className="overlayStack">
      <div className="overlayCard">
        <div className="row">
          <div>
            <div className="windHeader" style={{ fontWeight: 650 }}>
              Wind
            </div>
            <div className="badge">
              Latest: {windDir != null ? `${windDir}° ${degToCompass(windDir)}` : "—"} @{" "}
              {fmt(latest?.windspeedmph, " mph")}
            </div>
            <div className="badge">Wind Chill: {windChill == null ? "—" : fmt(windChill, "°F")}</div>
            <div className="badge">Today&apos;s Max Gust: {fmt(maxGustToday, " mph")}</div>
            <div className="badge">
              Gust Factor: {gustFactor == null ? "—" : `${fmt(gustFactor)} (${gustFactorLabel})`}
            </div>
            <div className="badge">
              Variability (15m): {windVar == null ? "—" : `${fmt(windVar, "°")} (${windVarLabel})`}
            </div>
            <div className="badge">Wind Run: {windRunToday == null ? "—" : fmt(windRunToday, " mi")}</div>
          </div>
        </div>
      </div>

      <div className="overlayCard">
        <div style={{ fontWeight: 650 }}>Sun</div>
        <div className="badge">Azimuth: {sunAz.toFixed(0)}°</div>
        <div className="badge">Altitude: {sunAlt.toFixed(0)}°</div>
        <div className="badge">Sun Rise: {sunTimes.sunrise.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
        <div className="badge">Sun Set: {sunTimes.sunset.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>     
        <div className="badge">Day Length: {dayLengthLabel}</div>
        <div className="badge">
          Solar Noon: {sunTimes.solarNoon.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      <div className="overlayCard moonCard">
        <div className="moonCardContent">
          <div style={{ fontWeight: 650 }}>Moon</div>
          <div className="badge">Azimuth: {moonAz.toFixed(0)}°</div>
          <div className="badge">Altitude: {moonAlt.toFixed(0)}°</div>
          <div className="badge">Illumination: {moonIllumPct}%</div>
          <div className="badge">Phase: {moonPhaseLabel}</div>
          <div className="badge">
            Next Full Moon: {nextFullMoon ? nextFullMoon.toLocaleDateString([], { month: "short", day: "numeric" }) : "—"}
          </div>
        </div>
        <div className="moonPhaseWrap" aria-hidden="true">
          <div
            className="moonPhase"
            style={{ ["--illum" as any]: `${moonIllumPct}%` }}
            aria-label={`Moon illumination ${moonIllumPct}%`}
          />
        </div>
      </div>
    </div>
  );
}
