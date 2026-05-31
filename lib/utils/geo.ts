const EARTH_RADIUS_NM = 3440.065;

function toRadians(deg: number) {
  return (deg * Math.PI) / 180;
}

function toDegrees(rad: number) {
  return (rad * 180) / Math.PI;
}

/** Great-circle distance in nautical miles. */
export function haversineDistanceNm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const dPhi = toRadians(lat2 - lat1);
  const dLambda = toRadians(lon2 - lon1);

  const a =
    Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_NM * c;
}

/** Initial bearing from point 1 to point 2, degrees clockwise from north (0–360). */
export function initialBearingDeg(lat1: number, lon1: number, lat2: number, lon2: number) {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const dLambda = toRadians(lon2 - lon1);

  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  const theta = Math.atan2(y, x);

  return (toDegrees(theta) + 360) % 360;
}

const CARDINALS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"] as const;

export function bearingToCardinal(deg: number) {
  return CARDINALS[Math.round(deg / 22.5) % 16];
}

export function formatBearing(deg: number) {
  return `${Math.round(deg)}° ${bearingToCardinal(deg)}`;
}
