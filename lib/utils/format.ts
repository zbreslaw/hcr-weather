export function fmt(n: number | null | undefined, suffix = "") {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${Math.round(n * 10) / 10}${suffix}`;
}

export function fmtTemp(n: number | null | undefined, unit?: string | null) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${Math.round(n)}°${unit ?? "F"}`;
}

export function fmtInches(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${(Math.round(n * 100) / 100).toFixed(2)} in`;
}

export function fmtHighLow(min: number | null, max: number | null, suffix = "") {
  if (min === null || max === null) return "—";
  return `${Math.round(max * 10) / 10}${suffix} / ${Math.round(min * 10) / 10}${suffix}`;
}

export function fmtHour(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric" });
}

export function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function fmtStat(value: number | null, decimals = 2) {
  return value == null ? "—" : value.toFixed(decimals);
}

export function fmtDir(value: number) {
  if (value === 0 || value === 360) return "N";
  if (value === 90) return "W";
  if (value === 180) return "S";
  if (value === 270) return "E";
  return "";
}
