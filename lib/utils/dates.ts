export function getRangeWindow(range: string) {
  const to = new Date();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  let from = new Date(to.getTime() - day);

  switch (range) {
    case "1h":
      from = new Date(to.getTime() - hour);
      break;
    case "12h":
      from = new Date(to.getTime() - 12 * hour);
      break;
    case "24h":
      from = new Date(to.getTime() - day);
      break;
    case "today":
      from = new Date(to.getFullYear(), to.getMonth(), to.getDate());
      break;
    case "3d":
      from = new Date(to.getTime() - 3 * day);
      break;
    case "7d":
      from = new Date(to.getTime() - 7 * day);
      break;
    case "30d":
      from = new Date(to.getTime() - 30 * day);
      break;
    case "ytd":
      from = new Date(to.getFullYear(), 0, 1);
      break;
    case "all":
      from = new Date(1970, 0, 1);
      break;
    default:
      from = new Date(to.getTime() - day);
  }

  return { from, to };
}

export function isoDurationToMs(duration: string) {
  const match = duration.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!match) return 0;
  const days = Number(match[1] ?? 0);
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  const seconds = Number(match[4] ?? 0);
  return (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000;
}

export function parseValidTime(validTime: string) {
  const [startStr, durationStr] = validTime.split("/");
  if (!startStr || !durationStr) return null;
  const start = new Date(startStr);
  const durationMs = isoDurationToMs(durationStr);
  if (Number.isNaN(start.getTime()) || durationMs <= 0) return null;
  const end = new Date(start.getTime() + durationMs);
  return { start, end };
}

export function dateKeyInTimeZone(date: Date, timeZone: string | null) {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(timeZone ? { timeZone } : {})
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
