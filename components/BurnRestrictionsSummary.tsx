"use client";

type BurnRestrictions = {
  areaName: string;
  status: "allowed" | "prohibited";
  mapFillColor: string;
  display: string;
  note: string | null;
  advisoryDate: string | null;
  sourceUrl: string;
};

function formatAdvisoryDate(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function swatchColor(mapFillColor: string, status: BurnRestrictions["status"]) {
  const key = mapFillColor.toLowerCase();
  if (key === "green") return "#22c55e";
  if (key === "red") return "#ef4444";
  return status === "allowed" ? "#22c55e" : "#ef4444";
}

export default function BurnRestrictionsSummary({
  data,
  error,
  loading
}: {
  data: BurnRestrictions | null;
  error?: string | null;
  loading?: boolean;
}) {
  const dateLabel = formatAdvisoryDate(data?.advisoryDate ?? null);

  return (
    <div className="burnRestrictionsSummary">
      <div className="burnRestrictionsHeader">
        <div className="kpiLabel">Burn Restrictions</div>
        {dateLabel ? <div className="burnRestrictionsDate">{dateLabel}</div> : null}
      </div>
      {error ? <div className="burnRestrictionsError">{error}</div> : loading ? <div className="muted">Loading…</div> : null}
      {data ? (
        <div className={`burnRestrictionsCard burnRestrictionsCard--${data.status}`}>
          <div className="burnRestrictionsAreaRow">
            <span
              className="burnRestrictionsSwatch"
              style={{ background: swatchColor(data.mapFillColor, data.status) }}
              aria-hidden="true"
            />
            <span className="burnRestrictionsArea">{data.areaName}</span>
          </div>
          <div className="burnRestrictionsDisplay">{data.display}</div>
          {data.note ? <div className="burnRestrictionsNote">{data.note}</div> : null}
        </div>
      ) : !loading && !error ? (
        <div className="muted">Burn restrictions unavailable.</div>
      ) : null}
      {data?.sourceUrl ? (
        <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer" className="fireDangerSourceLink">
          LRAPA burning overview
        </a>
      ) : null}
    </div>
  );
}
