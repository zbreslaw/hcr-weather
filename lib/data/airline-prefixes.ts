/** ICAO 3-letter airline telephony/designator prefixes → display name. Extend as needed. */
export const AIRLINE_PREFIXES: Record<string, string> = {
  AAL: "American",
  AAY: "Allegiant",
  ACA: "Air Canada",
  ASA: "Alaska",
  ASH: "Mesa",
  ATN: "Air Transport Intl",
  BAW: "British Airways",
  BTA: "Breeze",
  CCA: "Air China",
  CPA: "Cathay Pacific",
  DAL: "Delta",
  EDV: "Endeavor",
  EJA: "NetJets",
  ENY: "Envoy",
  ETD: "Etihad",
  EWG: "Eurowings",
  FDX: "FedEx",
  FFT: "Frontier",
  GJS: "GoJet",
  GTI: "Atlas Air",
  HAL: "Hawaiian",
  JBU: "JetBlue",
  JZA: "Jazz",
  KAL: "Korean Air",
  LAN: "LATAM",
  NKS: "Spirit",
  PAI: "PlaneSense",
  QXE: "Horizon",
  RPA: "Republic",
  RYR: "Ryanair",
  SCX: "Sun Country",
  SKW: "SkyWest",
  SWA: "Southwest",
  TAI: "TACA",
  UAL: "United",
  UPS: "UPS",
  VIV: "Viva",
  VOI: "Volaris",
  WJA: "WestJet"
};

export function decodeCallsign(raw: string | null | undefined) {
  const callsign = raw?.trim() ?? "";
  if (!callsign) return { callsign: "", displayName: "" };

  const prefix = callsign.slice(0, 3).toUpperCase();
  if (/^[A-Z]{3}$/.test(prefix) && AIRLINE_PREFIXES[prefix]) {
    const suffix = callsign.slice(3).trim();
    const displayName = suffix ? `${AIRLINE_PREFIXES[prefix]} ${suffix}` : AIRLINE_PREFIXES[prefix];
    return { callsign, displayName };
  }

  return { callsign, displayName: callsign };
}
