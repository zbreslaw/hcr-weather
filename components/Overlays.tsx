"use client";

import SunCalc from "suncalc";
import type { WeatherObs } from "@/lib/data/types";
import { useMounted } from "@/lib/hooks/useMounted";
import { fmt } from "@/lib/utils/format";
import { degToCompass, maxGustForDay, meanWindSpeed, windChillF, windRunMilesForDay, windVariabilityDeg } from "@/lib/utils/weather";

const STATION_TIME_ZONE =
  process.env.NEXT_PUBLIC_STATION_TIMEZONE ?? "America/Los_Angeles";

type Props = {
  latest: WeatherObs | null;
  series: WeatherObs[];
  stationLat: number;
  stationLon: number;
  timeZone?: string | null;
};

function formatStationTime(date: Date, timeZone: string) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    timeZone
  });
}

function formatStationDate(date: Date, timeZone: string) {
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    timeZone
  });
}

export default function Overlays({ latest, series, stationLat, stationLon, timeZone = null }: Props) {
  const mounted = useMounted();
  const displayTimeZone = timeZone ?? STATION_TIME_ZONE;
  const now = mounted ? new Date() : null;
  const refTime = latest?.time ? new Date(latest.time) : now ?? new Date(0);

  const windDir = latest?.winddir ?? null;
  const windVar = mounted ? windVariabilityDeg(series, refTime, 15 * 60 * 1000) : null;
  const windVarLabel = windVar == null ? null : windVar < 10 ? "low" : windVar < 30 ? "med" : "high";
  const maxGustToday = mounted ? maxGustForDay(series, refTime) : null;
  const meanWind = mounted ? meanWindSpeed(series, refTime, 15 * 60 * 1000) : null;
  const gustFactor =
    latest?.windgustmph != null && meanWind != null && meanWind > 0 ? latest.windgustmph / meanWind : null;
  const gustFactorLabel =
    gustFactor == null ? null : gustFactor <= 1.3 ? "Smooth" : gustFactor <= 1.6 ? "Gusty" : "Turbulent";
  const windRunToday = mounted ? windRunMilesForDay(series, refTime) : null;
  const windChill = windChillF(latest?.tempf ?? null, latest?.windspeedmph ?? null);

  const sunMoon = (() => {
    if (!now) return null;

    const sun = SunCalc.getPosition(now, stationLat, stationLon);
    const moon = SunCalc.getMoonPosition(now, stationLat, stationLon);
    const moonIllum = SunCalc.getMoonIllumination(now);
    const sunTimes = SunCalc.getTimes(now, stationLat, stationLon);

    const sunAz = (sun.azimuth * 180) / Math.PI + 180;
    const sunAlt = (sun.altitude * 180) / Math.PI;
    const moonAz = (moon.azimuth * 180) / Math.PI + 180;
    const moonAlt = (moon.altitude * 180) / Math.PI;
    const moonDistanceKm = Number.isFinite(moon.distance) ? moon.distance : null;
    const moonDistanceMiles = moonDistanceKm == null ? null : moonDistanceKm * 0.621371;
    const moonDistanceLabel =
      moonDistanceMiles == null ? "—" : `${Math.round(moonDistanceMiles).toLocaleString("en-US")} mi`;
    const moonOrbitLabel =
      moonDistanceKm == null
        ? null
        : moonDistanceKm <= 365000
          ? "Perigee"
          : moonDistanceKm >= 405000
            ? "Apogee"
            : null;
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

    const startMs = now.getTime();
    const endMs = startMs + 30 * 24 * 60 * 60 * 1000;
    const stepMs = 10 * 60 * 1000;
    let nextFullMoon: Date | null = null;
    let bestDelta = Infinity;
    for (let t = startMs; t <= endMs; t += stepMs) {
      const phase = SunCalc.getMoonIllumination(new Date(t)).phase;
      const delta = Math.abs(phase - 0.5);
      if (delta < bestDelta) {
        bestDelta = delta;
        nextFullMoon = new Date(t);
      }
      if (bestDelta < 0.0005) break;
    }

    const dayLengthMs = sunTimes.sunset.getTime() - sunTimes.sunrise.getTime();

    return {
      sunAz,
      sunAlt,
      moonAz,
      moonAlt,
      moonDistanceLabel,
      moonOrbitLabel,
      moonIllumPct,
      moonPhaseLabel: moonPhaseName(moonIllum.phase),
      fullMoonLabel: nextFullMoon ? formatStationDate(nextFullMoon, displayTimeZone) : "—",
      sunriseLabel: formatStationTime(sunTimes.sunrise, displayTimeZone),
      sunsetLabel: formatStationTime(sunTimes.sunset, displayTimeZone),
      solarNoonLabel: formatStationTime(sunTimes.solarNoon, displayTimeZone),
      dayLengthLabel:
        Number.isFinite(dayLengthMs) && dayLengthMs > 0
          ? `${Math.floor(dayLengthMs / 3_600_000)}h ${Math.round((dayLengthMs % 3_600_000) / 60_000)}m`
          : "—"
    };
  })();

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
        <div className="badge">Azimuth: {sunMoon ? `${sunMoon.sunAz.toFixed(0)}°` : "—"}</div>
        <div className="badge">Altitude: {sunMoon ? `${sunMoon.sunAlt.toFixed(0)}°` : "—"}</div>
        <div className="badge">Sun Rise: {sunMoon?.sunriseLabel ?? "—"}</div>
        <div className="badge">Sun Set: {sunMoon?.sunsetLabel ?? "—"}</div>
        <div className="badge">Day Length: {sunMoon?.dayLengthLabel ?? "—"}</div>
        <div className="badge">Solar Noon: {sunMoon?.solarNoonLabel ?? "—"}</div>
      </div>

      <div className="overlayCard moonCard">
        <div className="moonCardContent">
          <div style={{ fontWeight: 650 }}>Moon</div>
          <div className="badge">Azimuth: {sunMoon ? `${sunMoon.moonAz.toFixed(0)}°` : "—"}</div>
          <div className="badge">Altitude: {sunMoon ? `${sunMoon.moonAlt.toFixed(0)}°` : "—"}</div>
          <div className="badge">Illumination: {sunMoon ? `${sunMoon.moonIllumPct}%` : "—"}</div>
          <div className="badge">
            Distance: {sunMoon?.moonDistanceLabel ?? "—"}
            {sunMoon?.moonOrbitLabel ? ` (${sunMoon.moonOrbitLabel})` : ""}
          </div>
          <div className="badge">Phase: {sunMoon?.moonPhaseLabel ?? "—"}</div>
          <div className="badge">Next Full Moon: {sunMoon?.fullMoonLabel ?? "—"}</div>
        </div>
        <div className="moonPhaseWrap" aria-hidden="true">
          <div
            className="moonPhase"
            style={{ ["--illum" as any]: `${sunMoon?.moonIllumPct ?? 0}%` }}
            aria-label={sunMoon ? `Moon illumination ${sunMoon.moonIllumPct}%` : "Moon illumination"}
          />
        </div>
      </div>
    </div>
  );
}
