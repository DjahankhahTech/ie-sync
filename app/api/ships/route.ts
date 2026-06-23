import { NextRequest, NextResponse } from "next/server";

// Live AIS vessel feed — AISStream.io (free API key required, websocket).
// Opens a short collection window against the AOR bounding box, dedupes by
// MMSI, and returns a snapshot. Set AISSTREAM_API_KEY (free at aisstream.io)
// in the environment to enable. Without it, returns an empty set + note.

export const maxDuration = 30;

const GCC_BOUNDS: Record<string, { latMin: number; latMax: number; lngMin: number; lngMax: number }> = {
  INDOPACOM: { latMin: -10, latMax: 55, lngMin: 80, lngMax: 180 },
  CENTCOM: { latMin: 10, latMax: 45, lngMin: 30, lngMax: 75 },
  EUCOM: { latMin: 35, latMax: 72, lngMin: -10, lngMax: 60 },
  AFRICOM: { latMin: -35, latMax: 35, lngMin: -20, lngMax: 55 },
  SOUTHCOM: { latMin: -55, latMax: 25, lngMin: -90, lngMax: -30 },
  NORTHCOM: { latMin: 20, latMax: 75, lngMin: -140, lngMax: -60 },
  // Functional global commands — global vessel bbox.
  SPACECOM: { latMin: -80, latMax: 80, lngMin: -180, lngMax: 180 },
  CYBERCOM: { latMin: -80, latMax: 80, lngMin: -180, lngMax: 180 },
};

interface Ship { mmsi: number; lat: number; lng: number; name: string; sog: number | null; cog: number | null; type: string }

export async function GET(request: NextRequest) {
  const apiKey = process.env.AISSTREAM_API_KEY;
  const { searchParams } = new URL(request.url);
  const gcc = searchParams.get("gcc") ?? "INDOPACOM";
  const b = gcc === "ALL"
    ? { latMin: -85, latMax: 85, lngMin: -180, lngMax: 180 }
    : (GCC_BOUNDS[gcc] ?? GCC_BOUNDS.INDOPACOM);

  if (!apiKey) {
    return NextResponse.json({
      gcc, fetchedAt: new Date().toISOString(), total: 0, ships: [],
      note: "Live AIS not configured — set AISSTREAM_API_KEY (free at aisstream.io) in the environment to enable per-vessel tracking.",
    });
  }

  const ships = new Map<number, Ship>();
  try {
    await new Promise<void>((resolve) => {
      // Node 22+/24 provides a global WebSocket. Frames arrive as ArrayBuffer
      // (binaryType) — AISStream JSON must be decoded, not treated as a string.
      const ws = new WebSocket("wss://stream.aisstream.io/v0/stream");
      ws.binaryType = "arraybuffer";
      const decoder = new TextDecoder();
      const done = () => { try { ws.close(); } catch { /* ignore */ } resolve(); };
      const timer = setTimeout(done, 8000); // collection window
      ws.onopen = () => {
        ws.send(JSON.stringify({
          APIKey: apiKey,
          BoundingBoxes: [[[b.latMin, b.lngMin], [b.latMax, b.lngMax]]],
          FilterMessageTypes: ["PositionReport"],
        }));
      };
      ws.onmessage = (ev: MessageEvent) => {
        try {
          const data = typeof ev.data === "string"
            ? ev.data
            : ev.data instanceof ArrayBuffer ? decoder.decode(ev.data) : "";
          if (!data) return;
          const msg = JSON.parse(data);
          if (msg?.MessageType !== "PositionReport") return;
          const md = msg.MetaData ?? {};
          const pr = msg.Message?.PositionReport ?? {};
          const mmsi = Number(md.MMSI ?? pr.UserID);
          const lat = md.latitude ?? pr.Latitude;
          const lng = md.longitude ?? pr.Longitude;
          if (!mmsi || typeof lat !== "number" || typeof lng !== "number") return;
          ships.set(mmsi, {
            mmsi,
            lat, lng,
            name: String(md.ShipName ?? "").trim() || `MMSI ${mmsi}`,
            sog: typeof pr.Sog === "number" ? pr.Sog : null,
            cog: typeof pr.Cog === "number" ? pr.Cog : null,
            type: "AIS",
          });
          if (ships.size >= 500) { clearTimeout(timer); done(); }
        } catch { /* ignore malformed */ }
      };
      ws.onerror = () => { clearTimeout(timer); done(); };
    });
  } catch {
    return NextResponse.json({ gcc, fetchedAt: new Date().toISOString(), total: 0, ships: [], note: "AIS stream unreachable." });
  }

  const list = Array.from(ships.values());
  return NextResponse.json({
    gcc, fetchedAt: new Date().toISOString(), total: list.length, ships: list,
    source: "AISStream.io (live AIS, 7s window)",
    note: list.length === 0 ? "No AIS reports received in the window — retry, or the AOR may be quiet." : undefined,
  });
}
