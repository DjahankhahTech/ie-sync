import { NextResponse } from "next/server";
import type { AdversaryPerceptionState, AdversaryMediaItem, PerceptionShiftEvent, SentimentCategory } from "@/lib/mock-data";
import { classifySentiment } from "@/lib/adversary-sentiment-taxonomy";
import type { GCCId } from "@/lib/gcc-config";

const GCC_MEDIA_TEMPLATES: Partial<Record<GCCId, Array<{ source: string; sourceType: AdversaryMediaItem["sourceType"]; lang: string; headlines: string[] }>>> = {
  INDOPACOM: [
    { source: "Global Times", sourceType: "STATE_MEDIA", lang: "ZH", headlines: [
      "US military expansion in Pacific threatens regional stability and peace",
      "USMC Okinawa presence destabilizes decades of diplomatic progress",
      "Pentagon hegemony containment strategy condemned by regional nations",
      "US naval provocations in South China Sea violate sovereignty",
    ]},
    { source: "CGTN", sourceType: "STATE_MEDIA", lang: "EN", headlines: [
      "Experts warn of US military encirclement strategy in Indo-Pacific",
      "Regional cooperation threatened by aggressive US posture",
      "Diplomatic dialogue preferred over military escalation says analyst",
    ]},
    { source: "Xinhua", sourceType: "STATE_MEDIA", lang: "ZH", headlines: [
      "China urges de-escalation amid US warmongering in region",
      "Territorial integrity non-negotiable says spokesperson",
      "Peaceful resolution of disputes remains China official position",
    ]},
  ],
  CENTCOM: [
    { source: "IRNA", sourceType: "STATE_MEDIA", lang: "FA", headlines: [
      "US imperialism in Middle East faces growing resistance",
      "Regional nations condemn continued US military presence",
      "Iran self-defense capabilities legitimate response to aggression",
    ]},
    { source: "RT", sourceType: "STATE_MEDIA", lang: "RU", headlines: [
      "US destabilization campaign in Middle East continues unabated",
      "Pentagon military expansion threatens regional peace process",
      "Sanctions regime unacceptable violation of international law",
    ]},
  ],
  EUCOM: [
    { source: "TASS", sourceType: "STATE_MEDIA", lang: "RU", headlines: [
      "NATO encirclement of Russia constitutes direct provocation",
      "US military buildup in Eastern Europe escalation risk warns ministry",
      "Russia condemns NATO expansion as threat to European security",
    ]},
    { source: "Sputnik", sourceType: "PROXY_OUTLET", lang: "EN", headlines: [
      "Western hegemony in Europe challenged by multipolar world order",
      "Diplomatic dialogue needed to resolve European security crisis",
      "US sanctions regime damaging European cooperation",
    ]},
  ],
};

function generateMediaItems(gcc: GCCId): AdversaryMediaItem[] {
  const templates = GCC_MEDIA_TEMPLATES[gcc] ?? GCC_MEDIA_TEMPLATES.INDOPACOM!;
  const items: AdversaryMediaItem[] = [];
  const now = Date.now();

  for (const tmpl of templates) {
    for (const headline of tmpl.headlines) {
      const sentiment = -0.3 + (Math.random() - 0.7) * 0.8;
      const clamped = Math.max(-1, Math.min(1, sentiment));
      items.push({
        id: `AP-${gcc}-${items.length}`,
        source: tmpl.source,
        sourceType: tmpl.sourceType,
        title: headline,
        summary: headline,
        url: `https://example.com/${tmpl.source.toLowerCase().replace(/\s/g, "-")}/${items.length}`,
        publishedAt: new Date(now - Math.random() * 72 * 3600000).toISOString(),
        language: tmpl.lang,
        sentiment: Math.round(clamped * 100) / 100,
        sentimentCategory: classifySentiment(clamped) as SentimentCategory,
        matchedKeywords: headline.toLowerCase().split(" ").filter((w) => w.length > 5).slice(0, 3),
        reach: Math.round(100000 + Math.random() * 5000000),
      });
    }
  }

  return items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

function generateShiftEvents(gcc: GCCId): PerceptionShiftEvent[] {
  const triggers = [
    "Military exercise announcement",
    "Diplomatic statement release",
    "Naval transit through disputed waters",
    "Defense agreement signing",
    "Troop rotation announcement",
  ];
  return triggers.slice(0, 2 + Math.floor(Math.random() * 3)).map((trigger, i) => ({
    id: `SHIFT-${gcc}-${i}`,
    timestamp: new Date(Date.now() - (i + 1) * 24 * 3600000).toISOString(),
    triggerEvent: trigger,
    sentimentBefore: Math.round((-0.2 + Math.random() * -0.3) * 100) / 100,
    sentimentAfter: Math.round((-0.5 + Math.random() * -0.4) * 100) / 100,
    magnitude: Math.round(Math.random() * 40 + 10),
    sources: ["Global Times", "TASS", "RT"].slice(0, 1 + Math.floor(Math.random() * 2)),
  }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gcc = (searchParams.get("gcc") || "INDOPACOM") as GCCId;

  const mediaItems = generateMediaItems(gcc);
  const shiftEvents = generateShiftEvents(gcc);

  const avgSentiment = mediaItems.length > 0
    ? Math.round((mediaItems.reduce((s, m) => s + m.sentiment, 0) / mediaItems.length) * 100) / 100
    : 0;

  const escalationIndex = Math.min(100, Math.round(
    Math.abs(avgSentiment) * 50 +
    mediaItems.length * 2 +
    shiftEvents.filter((s) => s.magnitude > 25).length * 15
  ));

  const result: AdversaryPerceptionState = {
    overallSentiment: avgSentiment,
    sentimentCategory: classifySentiment(avgSentiment) as SentimentCategory,
    escalationIndex,
    mediaItems,
    shiftEvents,
    mediaVolume24h: mediaItems.filter(
      (m) => Date.now() - new Date(m.publishedAt).getTime() < 86400000,
    ).length,
    computedAt: new Date().toISOString(),
  };

  return NextResponse.json(result);
}
