const SOURCE_URL = "https://www.lrapa-or.gov/air-quality-protection/burning-overview/";
const ELSEWHERE_AREA_CODE = "ElsewhereLaneCo";

export type BurnRestrictionsData = {
  areaName: string;
  status: "allowed" | "prohibited";
  mapFillColor: string;
  display: string;
  note: string | null;
  advisoryDate: string | null;
  sourceUrl: string;
};

type OutdoorBurnRecord = {
  AdvisoryAreaCd?: string;
  AdvisoryAreaNm?: string;
  MapFillColor?: string;
  BackyardBurnAdvisoryLevelNm?: string;
  BYBAdvisoryDisplay?: string;
  BackyardBurnAdvisoryMessage?: string | null;
  BackyardBurnAdvisoryBlockAdvisoryDate?: string;
};

function extractOutdoorBurningAdvisory(html: string) {
  const marker = "OutdoorBurningAdvisory = ";
  const start = html.indexOf(marker);
  if (start < 0) throw new Error("OutdoorBurningAdvisory data not found");

  let i = start + marker.length;
  while (i < html.length && html[i] !== "{") i += 1;
  if (html[i] !== "{") throw new Error("OutdoorBurningAdvisory JSON not found");

  let depth = 0;
  const begin = i;
  for (; i < html.length; i += 1) {
    if (html[i] === "{") depth += 1;
    if (html[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(html.slice(begin, i + 1)) as { TheRecords?: OutdoorBurnRecord[] };
      }
    }
  }

  throw new Error("Failed to parse OutdoorBurningAdvisory JSON");
}

function normalizeStatus(color: string | undefined, level: string | undefined, display: string | undefined) {
  const colorKey = (color ?? "").toLowerCase();
  if (colorKey === "red") return "prohibited" as const;
  if (colorKey === "green") return "allowed" as const;

  const text = `${level ?? ""} ${display ?? ""}`.toLowerCase();
  if (text.includes("prohibit")) return "prohibited" as const;
  return "allowed" as const;
}

export function parseBurnRestrictionsHtml(html: string): BurnRestrictionsData {
  const advisory = extractOutdoorBurningAdvisory(html);
  const record = advisory.TheRecords?.find((entry) => entry.AdvisoryAreaCd === ELSEWHERE_AREA_CODE);
  if (!record) {
    throw new Error("Elsewhere in Lane Co. burn restrictions not found");
  }

  const display = record.BYBAdvisoryDisplay?.trim() || record.BackyardBurnAdvisoryLevelNm?.trim() || "—";
  const mapFillColor = record.MapFillColor ?? "Gray";

  return {
    areaName: record.AdvisoryAreaNm ?? "Elsewhere in Lane Co.",
    status: normalizeStatus(mapFillColor, record.BackyardBurnAdvisoryLevelNm, display),
    mapFillColor,
    display,
    note: record.BackyardBurnAdvisoryMessage ?? null,
    advisoryDate: record.BackyardBurnAdvisoryBlockAdvisoryDate ?? null,
    sourceUrl: SOURCE_URL
  };
}

export async function fetchBurnRestrictions(): Promise<BurnRestrictionsData> {
  const res = await fetch(SOURCE_URL, {
    cache: "no-store",
    headers: {
      "User-Agent": "HCR Weather Dashboard (personal weather station)",
      Accept: "text/html"
    }
  });

  if (!res.ok) {
    throw new Error(`burn restrictions fetch failed: ${res.status}`);
  }

  return parseBurnRestrictionsHtml(await res.text());
}
