import { NextRequest, NextResponse } from "next/server";

// Live flight tracker — adsb.lol community ADS-B (free, no key, datacenter-OK).
// Classifies each aircraft COMMERCIAL / NONCOMMERCIAL / MILITARY and attaches
// departure→destination (via adsbdb) for commercial flights. Within ~250nm of
// the AOR center. Graceful empty + note on error.

export const maxDuration = 30;

const GCC_CENTER: Record<string, [number, number]> = {
  INDOPACOM: [24.5, 121.5],
  CENTCOM: [27, 52],
  EUCOM: [50, 20],
  AFRICOM: [2, 20],
  SOUTHCOM: [-10, -60],
  NORTHCOM: [45, -100],
  SPACECOM: [39, -104],
  CYBERCOM: [39, -77],
};

const UA = { "User-Agent": "IE-Sync/2.0 (OIE decision support)" };

interface Flight {
  icao24: string; callsign: string; id: string;
  lat: number; lng: number; altitude: number | null; velocity: number | null; heading: number | null;
  onGround: boolean; category: "COMMERCIAL" | "NONCOMMERCIAL" | "MILITARY";
  origin?: string; originName?: string; dest?: string; destName?: string;
}

const isAirlineCallsign = (cs: string) => /^[A-Z]{3}\d/.test(cs.trim());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function lookupRoute(callsign: string): Promise<{ origin?: string; originName?: string; dest?: string; destName?: string }> {
  try {
    const r = await fetch(`https://api.adsbdb.com/v0/callsign/${encodeURIComponent(callsign.trim())}`, { headers: UA, signal: AbortSignal.timeout(6000), next: { revalidate: 3600 } });
    if (!r.ok) return {};
    const j = await r.json();
    const fr = j?.response?.flightroute;
    if (!fr) return {};
    return {
      origin: fr.origin?.iata_code || fr.origin?.icao_code,
      originName: fr.origin?.municipality || fr.origin?.name,
      dest: fr.destination?.iata_code || fr.destination?.icao_code,
      destName: fr.destination?.municipality || fr.destination?.name,
    };
  } catch { return {}; }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchArea(lat: number, lng: number): Promise<any[]> {
  try {
    const r = await fetch(`https://api.adsb.lol/v2/lat/${lat}/lon/${lng}/dist/250`, { headers: UA, next: { revalidate: 20 }, signal: AbortSignal.timeout(12000) });
    if (!r.ok) return [];
    const j = await r.json();
    return Array.isArray(j?.ac) ? j.ac : [];
  } catch { return []; }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gcc = searchParams.get("gcc") ?? "INDOPACOM";
  const all = gcc === "ALL";
  // For ALL, sweep every CCMD center; otherwise the single AOR center.
  const centers = all ? Object.values(GCC_CENTER) : [GCC_CENTER[gcc] ?? GCC_CENTER.INDOPACOM];

  try {
    const [areaResults, milRes] = await Promise.all([
      Promise.all(centers.map(([la, ln]) => fetchArea(la, ln))),
      fetch(`https://api.adsb.lol/v2/mil`, { headers: UA, next: { revalidate: 60 }, signal: AbortSignal.timeout(12000) }).catch(() => null),
    ]);
    // Merge + dedupe aircraft by hex across all swept areas.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const byHex = new Map<string, any>();
    areaResults.flat().forEach((a) => {
      if (typeof a?.lat !== "number" || typeof a?.lon !== "number") return;
      const key = String(a.hex ?? `${a.lat},${a.lon}`).toLowerCase();
      if (!byHex.has(key)) byHex.set(key, a);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ac: any[] = Array.from(byHex.values());

    // Military hex set (global mil feed), used to tag aircraft in the area.
    const milHex = new Set<string>();
    if (milRes && milRes.ok) {
      try { const mj = await milRes.json(); (mj?.ac ?? []).forEach((m: { hex?: string }) => m.hex && milHex.add(String(m.hex).toLowerCase())); } catch { /* ignore */ }
    }

    const flights: Flight[] = ac
      .slice(0, all ? 1200 : 500)
      .map((a) => {
        const cs = String(a.flight ?? "").trim();
        const hex = String(a.hex ?? "").toLowerCase();
        const category: Flight["category"] = milHex.has(hex)
          ? "MILITARY"
          : cs && isAirlineCallsign(cs)
            ? "COMMERCIAL"
            : "NONCOMMERCIAL";
        return {
          icao24: hex,
          callsign: cs || String(a.r ?? "").trim() || "—",
          id: [a.r, a.t].filter(Boolean).join(" / ") || hex,
          lat: a.lat, lng: a.lon,
          altitude: typeof a.alt_baro === "number" ? a.alt_baro : null,
          velocity: typeof a.gs === "number" ? a.gs : null,
          heading: typeof a.track === "number" ? a.track : null,
          onGround: a.alt_baro === "ground",
          category,
        };
      });

    // Attach dep→dest for commercial flights (capped to keep latency bounded).
    const commercial = flights.filter((f) => f.category === "COMMERCIAL").slice(0, 30);
    const routes = await Promise.all(commercial.map((f) => lookupRoute(f.callsign)));
    commercial.forEach((f, i) => Object.assign(f, routes[i]));

    const counts = {
      COMMERCIAL: flights.filter((f) => f.category === "COMMERCIAL").length,
      NONCOMMERCIAL: flights.filter((f) => f.category === "NONCOMMERCIAL").length,
      MILITARY: flights.filter((f) => f.category === "MILITARY").length,
    };
    return NextResponse.json({
      gcc, fetchedAt: new Date().toISOString(), total: flights.length, counts, flights,
      source: all ? "adsb.lol ADS-B + adsbdb routes — all CCMD theaters merged" : "adsb.lol ADS-B + adsbdb routes — within 250nm of AOR center",
      note: flights.length === 0 ? "No aircraft returned. Retry shortly." : undefined,
    });
  } catch {
    return NextResponse.json({ gcc, fetchedAt: new Date().toISOString(), total: 0, flights: [], note: "ADS-B feed unreachable or timed out. Retry shortly." });
  }
}
