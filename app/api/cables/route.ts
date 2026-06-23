import { NextResponse } from "next/server";

// Worldwide submarine fiber-optic cables — TeleGeography open dataset
// (submarinecablemap.com). Returns simplified polylines + landing points for
// the leaflet overlay. The information-systems backbone of the IE.

export const maxDuration = 60;

const CABLE_GEO = "https://www.submarinecablemap.com/api/v3/cable/cable-geo.json";
const LANDING_GEO = "https://www.submarinecablemap.com/api/v3/landing-point/landing-point-geo.json";

interface CableLine { name: string; segments: [number, number][][] } // [lat,lng] per point
interface Landing { name: string; lat: number; lng: number }

export async function GET() {
  try {
    const opts = { headers: { "User-Agent": "IE-Sync/2.0 (OIE decision support)" }, next: { revalidate: 604800 }, signal: AbortSignal.timeout(30000) };
    const [cRes, lRes] = await Promise.all([fetch(CABLE_GEO, opts), fetch(LANDING_GEO, opts)]);
    if (!cRes.ok) {
      return NextResponse.json({ error: `Cable dataset returned ${cRes.status}` }, { status: 502 });
    }
    const cableGeo = await cRes.json();
    const cables: CableLine[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const f of (cableGeo?.features ?? []) as any[]) {
      const name = f?.properties?.name ?? "Submarine cable";
      const g = f?.geometry;
      if (!g) continue;
      const toLatLng = (line: number[][]): [number, number][] => line.map((p) => [p[1], p[0]] as [number, number]);
      if (g.type === "MultiLineString") {
        cables.push({ name, segments: (g.coordinates as number[][][]).map(toLatLng) });
      } else if (g.type === "LineString") {
        cables.push({ name, segments: [toLatLng(g.coordinates as number[][])] });
      }
    }

    let landings: Landing[] = [];
    if (lRes.ok) {
      const lg = await lRes.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      landings = ((lg?.features ?? []) as any[])
        .filter((f) => f?.geometry?.type === "Point")
        .map((f) => ({ name: f?.properties?.name ?? "Landing", lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] }));
    }

    return NextResponse.json(
      { fetchedAt: new Date().toISOString(), cableCount: cables.length, landingCount: landings.length, cables, landings, source: "TeleGeography submarinecablemap.com (open data)" },
      { headers: { "Cache-Control": "public, max-age=604800" } }
    );
  } catch {
    return NextResponse.json({ error: "Submarine-cable dataset unreachable." }, { status: 502 });
  }
}
