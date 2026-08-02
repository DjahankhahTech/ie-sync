/**
 * Resolve a threat entity's free-text `location` to real coordinates — or
 * refuse to.
 *
 * Threat entities carry `location` as prose ("Kaliningrad / Western Military
 * District", "Cyberspace — PRC MSS / Chengdu 404"). There is no coordinate in
 * the model's schema and never was. Positions used to be fabricated from the
 * entity's array index and mapped into the AOR bounding box, which produced a
 * marker that moved if the list was reordered.
 *
 * The rule here: a marker is only drawn where the location names a real place.
 * Anything that is non-physical by nature — cyberspace, "global social media",
 * "PRC-directed" — resolves to null and is listed rather than plotted. A
 * coordinate on a tactical map is read as a locational claim, so it has to be
 * one we can defend.
 *
 * Resolved coordinates are deliberately coarse (city, region, country, or sea
 * centroid) and carry their own precision so the UI can say what it actually
 * knows. This is association, not geolocation: "APT28 is a GRU unit associated
 * with Moscow", not "APT28 is at these coordinates".
 */

export type GeoPrecision = "CITY" | "REGION" | "COUNTRY" | "MARITIME";

export interface ResolvedLocation {
  lat: number;
  lng: number;
  /** The gazetteer entry that matched. */
  place: string;
  precision: GeoPrecision;
}

/**
 * Markers of a location that is not a physical place. Checked before the
 * gazetteer, because strings like "Cyberspace — PRC MSS / Chengdu 404" contain
 * a real city name but do not describe a physical position for the entity.
 */
// Note: an attribution phrase like "Russia-directed" is NOT disqualifying on
// its own — "Russia-directed — Sahel / West Africa" names a real operating area
// even though the sponsor is elsewhere. Only genuinely non-physical presence
// disqualifies.
const NON_PHYSICAL = [
  "cyberspace", "cyber domain", "online", "internet", "social media", "social platforms",
  "global social", "global distribution", "worldwide", "multiple platforms", "virtual",
  "platforms", "networks", "network infrastructure", "telecom infrastructure",
];

interface GazetteerEntry {
  place: string;
  lat: number;
  lng: number;
  precision: GeoPrecision;
  /** Lowercase strings that identify this place inside a location string. */
  aliases: string[];
}

// Coarse centroids. Ordered longest-alias-first at match time so "south china
// sea" wins over "china".
const GAZETTEER: GazetteerEntry[] = [
  // ── Maritime ──
  { place: "South China Sea", lat: 13.0, lng: 114.0, precision: "MARITIME", aliases: ["south china sea"] },
  { place: "East China Sea", lat: 29.0, lng: 125.0, precision: "MARITIME", aliases: ["east china sea"] },
  { place: "Taiwan Strait", lat: 24.5, lng: 119.5, precision: "MARITIME", aliases: ["taiwan strait"] },
  { place: "Strait of Hormuz", lat: 26.6, lng: 56.3, precision: "MARITIME", aliases: ["strait of hormuz", "hormuz"] },
  { place: "Bab-el-Mandeb", lat: 12.6, lng: 43.3, precision: "MARITIME", aliases: ["bab-el-mandeb", "bab el mandeb"] },
  { place: "Red Sea", lat: 20.0, lng: 38.5, precision: "MARITIME", aliases: ["red sea"] },
  { place: "Baltic Sea", lat: 57.0, lng: 19.0, precision: "MARITIME", aliases: ["baltic sea", "baltic"] },
  { place: "Black Sea", lat: 43.4, lng: 34.0, precision: "MARITIME", aliases: ["black sea"] },
  { place: "Yellow Sea", lat: 35.5, lng: 123.0, precision: "MARITIME", aliases: ["yellow sea"] },
  { place: "Arabian Gulf", lat: 26.5, lng: 51.5, precision: "MARITIME", aliases: ["arabian gulf", "persian gulf"] },
  { place: "Sea of Japan", lat: 40.0, lng: 135.0, precision: "MARITIME", aliases: ["sea of japan", "east sea"] },
  { place: "Caribbean Sea", lat: 15.0, lng: -75.0, precision: "MARITIME", aliases: ["caribbean"] },

  // ── Sub-national regions ──
  { place: "Kaliningrad", lat: 54.7, lng: 20.5, precision: "REGION", aliases: ["kaliningrad"] },
  { place: "Crimea", lat: 45.3, lng: 34.4, precision: "REGION", aliases: ["crimea"] },
  { place: "Donbas", lat: 48.3, lng: 38.0, precision: "REGION", aliases: ["donbas", "donbass"] },
  { place: "Sahel", lat: 15.0, lng: 3.0, precision: "REGION", aliases: ["sahel"] },
  { place: "West Africa", lat: 10.0, lng: -3.0, precision: "REGION", aliases: ["west africa"] },
  { place: "Horn of Africa", lat: 8.0, lng: 45.0, precision: "REGION", aliases: ["horn of africa"] },
  { place: "Western Military District (RU)", lat: 57.0, lng: 35.0, precision: "REGION", aliases: ["western military district"] },
  { place: "Indo-Pacific", lat: 5.0, lng: 120.0, precision: "REGION", aliases: ["indo-pacific", "indo pacific"] },
  { place: "Korean Peninsula", lat: 38.0, lng: 127.0, precision: "REGION", aliases: ["korean peninsula"] },

  // ── Cities ──
  { place: "Chengdu", lat: 30.66, lng: 104.07, precision: "CITY", aliases: ["chengdu"] },
  { place: "Beijing", lat: 39.90, lng: 116.41, precision: "CITY", aliases: ["beijing"] },
  { place: "Shanghai", lat: 31.23, lng: 121.47, precision: "CITY", aliases: ["shanghai"] },
  { place: "Moscow", lat: 55.76, lng: 37.62, precision: "CITY", aliases: ["moscow"] },
  { place: "St Petersburg", lat: 59.93, lng: 30.34, precision: "CITY", aliases: ["st petersburg", "saint petersburg"] },
  { place: "Tehran", lat: 35.69, lng: 51.39, precision: "CITY", aliases: ["tehran"] },
  { place: "Pyongyang", lat: 39.04, lng: 125.76, precision: "CITY", aliases: ["pyongyang"] },
  { place: "Minsk", lat: 53.90, lng: 27.57, precision: "CITY", aliases: ["minsk"] },
  { place: "Bamako", lat: 12.64, lng: -8.00, precision: "CITY", aliases: ["bamako"] },
  { place: "Caracas", lat: 10.48, lng: -66.90, precision: "CITY", aliases: ["caracas"] },
  { place: "Havana", lat: 23.11, lng: -82.37, precision: "CITY", aliases: ["havana"] },

  // ── Countries ──
  { place: "China (PRC)", lat: 35.0, lng: 105.0, precision: "COUNTRY", aliases: ["china", "prc", "people's republic of china"] },
  { place: "Russia", lat: 60.0, lng: 90.0, precision: "COUNTRY", aliases: ["russia", "russian federation"] },
  { place: "Iran", lat: 32.0, lng: 53.0, precision: "COUNTRY", aliases: ["iran", "islamic republic of iran"] },
  { place: "North Korea (DPRK)", lat: 40.0, lng: 127.0, precision: "COUNTRY", aliases: ["north korea", "dprk"] },
  { place: "Belarus", lat: 53.7, lng: 27.9, precision: "COUNTRY", aliases: ["belarus"] },
  { place: "Ukraine", lat: 48.4, lng: 31.2, precision: "COUNTRY", aliases: ["ukraine"] },
  { place: "Taiwan", lat: 23.7, lng: 121.0, precision: "COUNTRY", aliases: ["taiwan"] },
  { place: "Japan", lat: 36.2, lng: 138.3, precision: "COUNTRY", aliases: ["japan"] },
  { place: "Philippines", lat: 12.9, lng: 121.8, precision: "COUNTRY", aliases: ["philippines"] },
  { place: "Vietnam", lat: 14.1, lng: 108.3, precision: "COUNTRY", aliases: ["vietnam"] },
  { place: "Syria", lat: 34.8, lng: 38.997, precision: "COUNTRY", aliases: ["syria"] },
  { place: "Iraq", lat: 33.2, lng: 43.7, precision: "COUNTRY", aliases: ["iraq"] },
  { place: "Lebanon", lat: 33.9, lng: 35.9, precision: "COUNTRY", aliases: ["lebanon"] },
  { place: "Yemen", lat: 15.6, lng: 48.0, precision: "COUNTRY", aliases: ["yemen"] },
  { place: "Israel", lat: 31.5, lng: 34.9, precision: "COUNTRY", aliases: ["israel"] },
  { place: "Mali", lat: 17.6, lng: -4.0, precision: "COUNTRY", aliases: ["mali"] },
  { place: "Burkina Faso", lat: 12.2, lng: -1.6, precision: "COUNTRY", aliases: ["burkina faso"] },
  { place: "Central African Republic", lat: 6.6, lng: 20.9, precision: "COUNTRY", aliases: ["central african republic", "car "] },
  { place: "Niger", lat: 17.6, lng: 8.1, precision: "COUNTRY", aliases: ["niger"] },
  { place: "Sudan", lat: 12.9, lng: 30.2, precision: "COUNTRY", aliases: ["sudan"] },
  { place: "Libya", lat: 26.3, lng: 17.2, precision: "COUNTRY", aliases: ["libya"] },
  { place: "Venezuela", lat: 6.4, lng: -66.6, precision: "COUNTRY", aliases: ["venezuela"] },
  { place: "Cuba", lat: 21.5, lng: -79.5, precision: "COUNTRY", aliases: ["cuba"] },
  { place: "Nicaragua", lat: 12.9, lng: -85.2, precision: "COUNTRY", aliases: ["nicaragua"] },
  { place: "Lithuania", lat: 55.2, lng: 23.9, precision: "COUNTRY", aliases: ["lithuania"] },
  { place: "Latvia", lat: 56.9, lng: 24.6, precision: "COUNTRY", aliases: ["latvia"] },
  { place: "Estonia", lat: 58.6, lng: 25.0, precision: "COUNTRY", aliases: ["estonia"] },
  { place: "Poland", lat: 51.9, lng: 19.1, precision: "COUNTRY", aliases: ["poland"] },
];

const ALIAS_INDEX: Array<{ alias: string; entry: GazetteerEntry }> = GAZETTEER
  .flatMap((entry) => entry.aliases.map((alias) => ({ alias, entry })));

// Prefer the more specific place, then the one named first. "Kaliningrad /
// Western Military District" should resolve to Kaliningrad, not to a centroid
// in central Russia; "Iraq / Lebanon / Yemen" should take the lead country
// rather than an arbitrary one.
const PRECISION_RANK: Record<GeoPrecision, number> = { CITY: 0, REGION: 1, MARITIME: 2, COUNTRY: 3 };

/**
 * Returns coordinates when the location names a real place, or null when it
 * describes a non-physical presence. Null means "do not put this on a map" —
 * it is a legitimate, common outcome for information-domain actors, not a
 * failure to look up.
 */
export function resolveThreatLocation(location: string | undefined | null): ResolvedLocation | null {
  if (!location) return null;
  const s = location.toLowerCase();

  // A non-physical marker anywhere in the string disqualifies it, even when a
  // real place name also appears ("Cyberspace — PRC MSS / Chengdu 404" names
  // Chengdu, but the entity's presence is not physically there).
  if (NON_PHYSICAL.some((m) => s.includes(m))) return null;

  let best: { entry: GazetteerEntry; at: number; len: number } | null = null;
  for (const { alias, entry } of ALIAS_INDEX) {
    const at = s.indexOf(alias);
    if (at === -1) continue;
    if (
      !best ||
      PRECISION_RANK[entry.precision] < PRECISION_RANK[best.entry.precision] ||
      (PRECISION_RANK[entry.precision] === PRECISION_RANK[best.entry.precision] &&
        (at < best.at || (at === best.at && alias.length > best.len)))
    ) {
      best = { entry, at, len: alias.length };
    }
  }

  if (!best) return null;
  const { lat, lng, place, precision } = best.entry;
  return { lat, lng, place, precision };
}

/** Human-readable caveat for a resolved position, for map popups and lists. */
export function precisionNote(p: GeoPrecision): string {
  switch (p) {
    case "CITY": return "city-level approximation";
    case "REGION": return "regional approximation";
    case "COUNTRY": return "country centroid — not a position";
    case "MARITIME": return "sea-area centroid — not a position";
  }
}
