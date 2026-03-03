import { NextResponse } from "next/server";
import type { MissileEvent, MissileType, ABMDState } from "@/lib/mock-data";
import { computeDedupHash, deduplicateEvents } from "@/lib/abmd-dedup";
import { computeConfidence, computeEscalationIndex } from "@/lib/abmd-scoring";
import type { GCCId } from "@/lib/gcc-config";

const MISSILE_TYPES: MissileType[] = [
  "BALLISTIC_SHORT", "BALLISTIC_MEDIUM", "BALLISTIC_INTERMEDIATE",
  "CRUISE", "HYPERSONIC", "UAV_DRONE",
];

const SOURCES = [
  { name: "CSIS Missile Defense Project", reliability: 85 },
  { name: "Oryx OSINT", reliability: 80 },
  { name: "ACLED Conflict Data", reliability: 75 },
  { name: "Social media geolocation", reliability: 50 },
  { name: "Reuters/AP wire", reliability: 90 },
  { name: "Seismic detection network", reliability: 70 },
];

// GCC-specific launch zones (approximate lat/lng centers)
const GCC_LAUNCH_ZONES: Partial<Record<GCCId, Array<{ center: [number, number]; label: string }>>> = {
  CENTCOM: [
    { center: [32.0, 53.0], label: "Western Iran" },
    { center: [15.5, 44.0], label: "Yemen/Houthi" },
    { center: [33.0, 44.0], label: "Central Iraq" },
  ],
  INDOPACOM: [
    { center: [39.0, 125.5], label: "DPRK West Coast" },
    { center: [40.5, 127.0], label: "DPRK East Coast" },
    { center: [25.0, 121.0], label: "Taiwan Strait" },
  ],
  EUCOM: [
    { center: [48.5, 37.5], label: "Eastern Ukraine" },
    { center: [55.0, 37.0], label: "Western Russia" },
  ],
};

function generateMockEvents(gcc: GCCId): MissileEvent[] {
  const zones = GCC_LAUNCH_ZONES[gcc];
  if (!zones || zones.length === 0) return [];

  const events: MissileEvent[] = [];
  const now = Date.now();
  const eventCount = 8 + Math.floor(Math.random() * 12);

  for (let i = 0; i < eventCount; i++) {
    const zone = zones[Math.floor(Math.random() * zones.length)];
    const lat = zone.center[0] + (Math.random() - 0.5) * 4;
    const lng = zone.center[1] + (Math.random() - 0.5) * 4;
    const hoursAgo = Math.random() * 168; // up to 7 days
    const ts = new Date(now - hoursAgo * 3600000).toISOString();
    const missileType = MISSILE_TYPES[Math.floor(Math.random() * MISSILE_TYPES.length)];
    const source = SOURCES[Math.floor(Math.random() * SOURCES.length)];
    const crossCount = 1 + Math.floor(Math.random() * 4);
    const confidence = computeConfidence(crossCount, source.reliability);
    const interceptClaimed = Math.random() > 0.5;

    events.push({
      id: `ABM-${gcc}-${i.toString().padStart(3, "0")}`,
      missileType,
      launchLocation: [lat, lng],
      targetLocation: Math.random() > 0.3
        ? [lat + (Math.random() - 0.5) * 6, lng + (Math.random() - 0.5) * 6]
        : undefined,
      timestamp: ts,
      source: source.name,
      sourceReliability: source.reliability,
      crossSourceCount: crossCount,
      confidenceScore: confidence,
      interceptClaimed,
      interceptSource: interceptClaimed ? SOURCES[Math.floor(Math.random() * SOURCES.length)].name : undefined,
      dedupHash: computeDedupHash(lat, lng, ts, missileType),
      status: confidence >= 75 ? "CONFIRMED" : confidence >= 50 ? "PROBABLE" : "UNCONFIRMED",
    });
  }

  return events;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gcc = (searchParams.get("gcc") || "CENTCOM") as GCCId;

  const rawEvents = generateMockEvents(gcc);
  const events = deduplicateEvents(rawEvents).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  // Compute metrics
  const confirmedOrProbable = events.filter((e) => e.status !== "RETRACTED" && e.status !== "UNCONFIRMED");
  const intercepted = confirmedOrProbable.filter((e) => e.interceptClaimed);
  const interceptRate = confirmedOrProbable.length > 0
    ? intercepted.length / confirmedOrProbable.length
    : 0;
  const avgConfidence = events.length > 0
    ? Math.round(events.reduce((s, e) => s + e.confidenceScore, 0) / events.length)
    : 0;
  const escalationIndex = computeEscalationIndex(events);

  // Build 7-day timeline
  const timeline: ABMDState["timeline"] = [];
  const now = Date.now();
  for (let d = 6; d >= 0; d--) {
    const dayStart = now - (d + 1) * 86400000;
    const dayEnd = now - d * 86400000;
    const dayEvents = events.filter((e) => {
      const t = new Date(e.timestamp).getTime();
      return t >= dayStart && t < dayEnd;
    });
    timeline.push({
      date: new Date(dayEnd).toISOString().slice(0, 10),
      launches: dayEvents.length,
      intercepts: dayEvents.filter((e) => e.interceptClaimed).length,
    });
  }

  const status: ABMDState["status"] =
    escalationIndex > 60 ? "RED" : escalationIndex > 25 ? "AMBER" : "GREEN";

  const state: ABMDState = {
    metrics: {
      launchFrequency7d: events.length,
      interceptRate: Math.round(interceptRate * 100) / 100,
      escalationIndex,
      avgConfidence,
    },
    events,
    status,
    timeline,
    computedAt: new Date().toISOString(),
  };

  return NextResponse.json(state);
}
