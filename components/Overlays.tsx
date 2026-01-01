"use client";
import SunCalc from "suncalc";
import type { WeatherObs } from "@/lib/data/types";
import { fmt } from "@/lib/utils/format";
import { degToCompass, maxGustForDay, meanWindSpeed, windChillF, windRunMilesForDay, windVariabilityDeg } from "@/lib/utils/weather";

type Props = {
  latest: WeatherObs | null;
  series: WeatherObs[];
  stationLat: number;
  stationLon: number;
  timeZone?: string | null;
};

export default function Overlays({ latest, series, stationLat, stationLon, timeZone = null }: Props) {
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
  const moonDistanceKm = Number.isFinite(moon.distance) ? moon.distance : null;
  const moonDistanceMiles = moonDistanceKm == null ? null : moonDistanceKm * 0.621371;
  const moonDistanceLabel =
    moonDistanceMiles == null ? "—" : `${Math.round(moonDistanceMiles).toLocaleString()} mi`;
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
  const moonPhaseLabel = moonPhaseName(moonIllum.phase);
  const nextFullMoon = (() => {
    const startMs = now.getTime();
    const endMs = startMs + 30 * 24 * 60 * 60 * 1000;
    const stepMs = 10 * 60 * 1000;
    let best: Date | null = null;
    let bestDelta = Infinity;
    for (let t = startMs; t <= endMs; t += stepMs) {
      const phase = SunCalc.getMoonIllumination(new Date(t)).phase;
      const delta = Math.abs(phase - 0.5);
      if (delta < bestDelta) {
        bestDelta = delta;
        best = new Date(t);
      }
      if (bestDelta < 0.0005) break;
    }
    return best;
  })();
  const fullMoonLabel = nextFullMoon
    ? nextFullMoon.toLocaleDateString([], timeZone ? { month: "short", day: "numeric", timeZone } : { month: "short", day: "numeric" })
    : "—";

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
          <div className="badge">
            Distance: {moonDistanceLabel}
            {moonOrbitLabel ? ` (${moonOrbitLabel})` : ""}
          </div>
          <div className="badge">Phase: {moonPhaseLabel}</div>
          <div className="badge">
            Next Full Moon: {fullMoonLabel}
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
