"use client";

import { formatPollenDate } from "@/lib/utils/dates";

type PollenType = {
  code: string;
  displayName: string;
  inSeason: boolean | null;
  value: number | null;
  category: string | null;
  color: string | null;
};

function valueLabel(type: PollenType) {
  if (type.value == null) return type.inSeason === false ? "Out of season" : "No data";
  if (type.value === 0) return "None";
  return `${type.value}`;
}

function categoryLabel(type: PollenType) {
  if (type.category) return type.category;
  if (type.value === 0) return "None";
  if (type.value == null) return type.inSeason === false ? "Out of season" : "No data";
  return " ";
}

export default function PollenSummary({
  types,
  date,
  error,
  loading
}: {
  types: PollenType[];
  date?: { year?: number; month?: number; day?: number } | null;
  error?: string | null;
  loading?: boolean;
}) {
  const dateLabel = formatPollenDate(date ?? null);
  const defaultTypes: PollenType[] = [
    { code: "TREE", displayName: "Tree", inSeason: null, value: null, category: null, color: null },
    { code: "GRASS", displayName: "Grass", inSeason: null, value: null, category: null, color: null },
    { code: "WEED", displayName: "Weed", inSeason: null, value: null, category: null, color: null }
  ];
  const rows = types.length ? types : defaultTypes;

  return (
    <div className="pollenSummary">
      <div className="pollenHeader">
        <div className="kpiLabel">Pollen (UPI)</div>
        {dateLabel ? <div className="pollenDate">{dateLabel}</div> : null}
      </div>
      {error ? <div className="pollenError">{error}</div> : loading ? <div className="pollenDate">Loading…</div> : null}
      <div className="pollenGrid">
        {rows.map((type) => (
          <div className="pollenItem" key={type.code}>
            <div className="pollenTypeRow">
              <span
                className="pollenSwatch"
                style={{ background: type.color ?? "rgba(255, 255, 255, 0.15)" }}
                aria-hidden="true"
              />
              <span className="pollenTypeName">{type.displayName}</span>
            </div>
            <div className="pollenValue">{loading && !types.length ? "—" : valueLabel(type)}</div>
            <div className="pollenCategory">{categoryLabel(type)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
