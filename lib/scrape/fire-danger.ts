const SOURCE_URL = "https://www.southlanefire.org/burning-information";
const LEVELS = new Set(["Low", "Moderate", "High", "Extreme"]);

export type FireDangerData = {
  level: string | null;
  imageUrl: string | null;
  sourceUrl: string;
};

function enhanceImageUrl(src: string) {
  return src
    .replace(/\/fill\/w_\d+,h_\d+,/, "/fill/w_280,h_200,")
    .replace(/blur_2,/, "")
    .replace(/enc_avif/, "enc_auto");
}

export function parseFireDangerHtml(html: string): FireDangerData {
  const ratingMatch = html.match(
    /<picture>\s*<img[^>]*alt="(Low|Moderate|High|Extreme)"[^>]*src="([^"]+)"[^>]*>/i
  );
  const ratingMatchAltOrder = html.match(
    /<picture>\s*<img[^>]*src="([^"]+)"[^>]*alt="(Low|Moderate|High|Extreme)"[^>]*>/i
  );

  let level: string | null = null;
  let imageUrl: string | null = null;

  if (ratingMatch) {
    level = ratingMatch[1];
    imageUrl = enhanceImageUrl(ratingMatch[2]);
  } else if (ratingMatchAltOrder) {
    imageUrl = enhanceImageUrl(ratingMatchAltOrder[1]);
    level = ratingMatchAltOrder[2];
  } else {
    const imgMatch = html.match(/<img[^>]*alt="(Low|Moderate|High|Extreme)"[^>]*>/i);
    if (imgMatch) {
      level = imgMatch[1];
      const srcMatch = imgMatch[0].match(/src="([^"]+)"/i);
      imageUrl = srcMatch ? enhanceImageUrl(srcMatch[1]) : null;
    }
  }

  if (level && !LEVELS.has(level)) level = null;

  return {
    level,
    imageUrl,
    sourceUrl: SOURCE_URL
  };
}

export async function fetchFireDanger(): Promise<FireDangerData> {
  const res = await fetch(SOURCE_URL, {
    cache: "no-store",
    headers: {
      "User-Agent": "HCR Weather Dashboard (personal weather station)",
      Accept: "text/html"
    }
  });

  if (!res.ok) {
    throw new Error(`fire danger fetch failed: ${res.status}`);
  }

  const html = await res.text();
  const parsed = parseFireDangerHtml(html);

  if (!parsed.imageUrl || !parsed.level) {
    throw new Error("Fire danger image not found on source page");
  }

  return parsed;
}
