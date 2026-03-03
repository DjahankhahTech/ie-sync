import { NextResponse } from "next/server";
import type { GrayZoneState, GrayZoneIncident, GrayZoneCategory, GrayZoneOverlay } from "@/lib/mock-data";
import type { GCCId } from "@/lib/gcc-config";

const CATEGORY_SEVERITY_WEIGHT: Record<GrayZoneCategory, number> = {
  UNDERSEA_CABLE: 8,
  AIS_ANOMALY: 3,
  FISHING_MILITIA: 5,
  EEZ_VIOLATION: 6,
  ADIZ_INCURSION: 7,
  UAS_INCIDENT: 6,
};

const GCC_INCIDENTS: Partial<Record<GCCId, Array<{ category: GrayZoneCategory; title: string; actor: string; center: [number, number] }>>> = {
  INDOPACOM: [
    { category: "FISHING_MILITIA", title: "Maritime militia cluster detected near Scarborough Shoal", actor: "PRC Maritime Militia", center: [15.2, 117.8] },
    { category: "ADIZ_INCURSION", title: "PLAAF fighter incursion into Taiwan ADIZ", actor: "PRC PLAAF", center: [24.5, 120.5] },
    { category: "EEZ_VIOLATION", title: "PRC survey vessel operating in Philippines EEZ", actor: "PRC Hydrographic Fleet", center: [12.0, 119.5] },
    { category: "UNDERSEA_CABLE", title: "APG cable disruption reported near Taiwan landing", actor: "Unknown (suspected PRC)", center: [25.0, 121.5] },
    { category: "AIS_ANOMALY", title: "AIS dark period for 14 PRC flagged vessels in SCS", actor: "PRC Merchant Marine", center: [16.0, 114.5] },
    { category: "UAS_INCIDENT", title: "Unidentified UAS near Kadena Air Base perimeter", actor: "Unknown", center: [26.4, 127.8] },
    { category: "FISHING_MILITIA", title: "200+ vessels in formation near Whitsun Reef", actor: "PRC Maritime Militia", center: [11.0, 114.5] },
    { category: "ADIZ_INCURSION", title: "PRC H-6K bomber transit through Miyako Strait", actor: "PRC PLAAF", center: [24.8, 125.3] },
  ],
  CENTCOM: [
    { category: "UAS_INCIDENT", title: "Houthi drone intercept over Red Sea shipping lane", actor: "Ansar Allah (Houthi)", center: [14.5, 42.5] },
    { category: "EEZ_VIOLATION", title: "IRGCN fast boats harass commercial vessel Strait of Hormuz", actor: "IRGCN", center: [26.5, 56.5] },
    { category: "AIS_ANOMALY", title: "Iranian tanker AIS spoofing detected in Gulf of Oman", actor: "Iran", center: [25.0, 58.5] },
    { category: "UNDERSEA_CABLE", title: "Red Sea undersea cable damage near Bab al-Mandab", actor: "Unknown (suspected Houthi)", center: [12.5, 43.5] },
    { category: "UAS_INCIDENT", title: "One-way attack drone targeting coalition forces in Syria", actor: "Iran-backed militia", center: [35.5, 40.0] },
  ],
  EUCOM: [
    { category: "UNDERSEA_CABLE", title: "Baltic Sea cable disruption near Finnish EEZ", actor: "Unknown (suspected Russia)", center: [59.5, 22.5] },
    { category: "ADIZ_INCURSION", title: "Russian Tu-95 strategic bomber near Norwegian coast", actor: "Russian VKS", center: [70.0, 15.0] },
    { category: "AIS_ANOMALY", title: "Russian research vessel AIS off near North Sea cables", actor: "Russian Navy", center: [57.5, 3.0] },
    { category: "EEZ_VIOLATION", title: "Russian naval intelligence ship in Swedish territorial waters", actor: "Russian GRU Naval", center: [58.0, 18.5] },
    { category: "UAS_INCIDENT", title: "Unidentified drone near Ramstein Air Base", actor: "Unknown", center: [49.4, 7.6] },
  ],
};

const GCC_OVERLAYS: Partial<Record<GCCId, GrayZoneOverlay>> = {
  INDOPACOM: {
    eezBoundaries: [
      { name: "Philippines EEZ", coordinates: [[21, 115], [5, 115], [5, 127], [21, 127]] },
      { name: "Japan EEZ (Okinawa)", coordinates: [[28, 124], [24, 124], [24, 131], [28, 131]] },
    ],
    adizBoundaries: [
      { name: "Taiwan ADIZ", coordinates: [[29, 117], [21, 117], [21, 126], [29, 126]] },
    ],
    underseaCables: [
      { name: "APG Cable", path: [[25, 121], [22, 118], [14, 114], [1, 104]], status: "DISRUPTED" },
      { name: "SEA-ME-WE-3", path: [[22, 120], [15, 110], [5, 100], [-6, 106]], status: "NORMAL" },
    ],
  },
  EUCOM: {
    eezBoundaries: [
      { name: "Finnish EEZ (Baltic)", coordinates: [[61, 19], [59, 19], [59, 27], [61, 27]] },
    ],
    adizBoundaries: [
      { name: "NATO Baltic ADIZ", coordinates: [[60, 18], [54, 18], [54, 28], [60, 28]] },
    ],
    underseaCables: [
      { name: "C-Lion1 (Helsinki-Rostock)", path: [[60.2, 24.9], [54.2, 12.1]], status: "NORMAL" },
      { name: "Baltic Sea cables", path: [[59.4, 22.5], [55.7, 12.6]], status: "DISRUPTED" },
    ],
  },
  CENTCOM: {
    eezBoundaries: [],
    adizBoundaries: [],
    underseaCables: [
      { name: "AAE-1 (Red Sea)", path: [[30, 32], [12.5, 43.5], [11, 50]], status: "DISRUPTED" },
      { name: "FALCON (Gulf)", path: [[26, 56], [25, 54], [24, 51]], status: "NORMAL" },
    ],
  },
};

function generateIncidents(gcc: GCCId): GrayZoneIncident[] {
  const templates = GCC_INCIDENTS[gcc] ?? [];
  const now = Date.now();

  return templates.map((t, i) => ({
    id: `GZ-${gcc}-${i}`,
    category: t.category,
    title: t.title,
    description: t.title,
    location: [
      t.center[0] + (Math.random() - 0.5) * 2,
      t.center[1] + (Math.random() - 0.5) * 2,
    ] as [number, number],
    timestamp: new Date(now - Math.random() * 7 * 86400000).toISOString(),
    severity: Math.random() > 0.6 ? "HIGH" : Math.random() > 0.3 ? "MEDIUM" : "CRITICAL",
    attributionConfidence: 30 + Math.floor(Math.random() * 60),
    suspectedActor: t.actor,
    status: Math.random() > 0.7 ? "RESOLVED" : Math.random() > 0.4 ? "ACTIVE" : "MONITORING",
  }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gcc = (searchParams.get("gcc") || "INDOPACOM") as GCCId;

  const incidents = generateIncidents(gcc);
  const overlay = GCC_OVERLAYS[gcc] ?? { eezBoundaries: [], adizBoundaries: [], underseaCables: [] };

  // Activity index: severity-weighted, recency-factored
  const now = Date.now();
  const activityIndex = Math.min(100, Math.round(
    incidents.reduce((sum, inc) => {
      const weight = CATEGORY_SEVERITY_WEIGHT[inc.category] || 5;
      const daysAgo = (now - new Date(inc.timestamp).getTime()) / 86400000;
      const recency = Math.max(0.2, 1 - daysAgo / 7);
      return sum + weight * recency;
    }, 0)
  ));

  // Mock correlation score (in production: Pearson between incident freq and sentiment)
  const correlationScore = Math.round((0.2 + Math.random() * 0.5) * 100) / 100;

  const status: GrayZoneState["status"] = activityIndex > 55 ? "RED" : activityIndex > 20 ? "AMBER" : "GREEN";

  const result: GrayZoneState = {
    activityIndex,
    status,
    incidents: incidents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    overlay,
    correlationScore,
    computedAt: new Date().toISOString(),
  };

  return NextResponse.json(result);
}
