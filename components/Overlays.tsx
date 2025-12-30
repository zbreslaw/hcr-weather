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
  stationLat: number;
  stationLon: number;
};

export default function Overlays({ latest, stationLat, stationLon }: Props) {
  const now = new Date();
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

  const windDir = latest?.winddir ?? null;

  return (
    <div className="overlayStack">
      <div className="overlayCard">
        <div className="row">
          <div>
            <div style={{ fontWeight: 650 }}>Wind</div>
            <div className="badge">
              Dir: {windDir != null ? `${windDir}° ${degToCompass(windDir)}` : "—"} • {fmt(latest?.windspeedmph, " mph")} • Gust{" "}
              {fmt(latest?.windgustmph, " mph")}
            </div>
          </div>
        </div>
      </div>

      <div className="overlayCard">
        <div style={{ fontWeight: 650 }}>Sun</div>
        <div className="badge">
          Az {sunAz.toFixed(0)}° • Alt {sunAlt.toFixed(0)}°
        </div>
        <div className="badge">
          Rise {sunTimes.sunrise.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • Set{" "}
          {sunTimes.sunset.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div className="badge">
          UV {fmt(latest?.uv)} • Solar {fmt(latest?.solarradiation, " W/m^2")}
        </div>
      </div>

      <div className="overlayCard">
        <div style={{ fontWeight: 650 }}>Moon</div>
        <div className="badge">
          Az {moonAz.toFixed(0)}° • Alt {moonAlt.toFixed(0)}° • Illum {moonIllumPct}%
        </div>
        <div className="moonPhase" style={{ ["--illum" as any]: `${moonIllumPct}%` }} aria-label={`Moon illumination ${moonIllumPct}%`} />
      </div>
    </div>
  );
}
