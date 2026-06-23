import { NextRequest, NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";
import { GCC_CONFIGS, type GCCId } from "@/lib/gcc-config";

// ── Types ─────────────────────────────────────────────────────────────────
export interface INFSUMEvent {
  title: string;
  summary: string;
  source: string;
  link: string;
  published: string;
  relevanceScore: number;
  threatIndicators: string[];
  ioRelevant: boolean;
}

export interface ThreatCategoryCounts {
  "Cyber Operation": number;
  "Disinformation": number;
  "Influence Op": number;
  "Kinetic": number;
  "Escalation": number;
}

export interface DailyINFSUM {
  gcc: GCCId;
  aor: string;
  dtg: string;
  classification: string;
  period: string;
  generatedAt: string;
  topEvents: INFSUMEvent[];
  ioActivity: INFSUMEvent[];
  threatCounts: ThreatCategoryCounts;
  narrativeTrends: string[];
  watchItems: INFSUMEvent[];
  totalArticlesIngested: number;
  sourcesQueried: number;
  feedHealth: { name: string; status: "OK" | "FAILED" }[];
}

// ── Reuse scoring logic from feeds route ──────────────────────────────────
const IO_KEYWORDS = [
  "disinformation", "misinformation", "propaganda", "influence operation",
  "cyber attack", "cyberattack", "hacking", "espionage", "information war",
  "deepfake", "bot", "social media manipulation", "election interference",
  "narrative", "psyop", "psychological operation", "hybrid warfare",
  "state media", "censorship", "information warfare", "cognitive",
  "troll farm", "fake news campaign", "coordinated inauthentic",
];

const THREAT_INDICATORS: Record<string, string[]> = {
  "Cyber Operation": ["hack", "breach", "malware", "ransomware", "cyberattack", "zero-day", "APT"],
  "Disinformation": ["disinformation", "misinformation", "fake", "fabricated", "false narrative", "propaganda"],
  "Influence Op": ["influence", "narrative", "psyop", "information operation", "troll", "bot network"],
  "Kinetic": ["missile", "strike", "attack", "bomb", "explosion", "military action"],
  "Escalation": ["escalation", "provocation", "incursion", "confrontation", "standoff", "clash"],
};

function scoreFeedItem(title: string, summary: string, gccKeywords: string[]) {
  const text = `${title} ${summary}`.toLowerCase();
  const matched: string[] = [];

  let geoScore = 0;
  for (const kw of gccKeywords) {
    if (text.includes(kw.toLowerCase())) {
      matched.push(kw);
      geoScore = Math.min(30, geoScore + 10);
    }
  }

  let ioScore = 0;
  let ioHits = 0;
  for (const kw of IO_KEYWORDS) {
    if (text.includes(kw.toLowerCase())) {
      ioScore = Math.min(40, ioScore + 8);
      ioHits++;
    }
  }

  const threats: string[] = [];
  let threatScore = 0;
  for (const [indicator, terms] of Object.entries(THREAT_INDICATORS)) {
    if (terms.some((t) => text.includes(t.toLowerCase()))) {
      threats.push(indicator);
      threatScore = Math.min(30, threatScore + 10);
    }
  }

  const total = Math.min(100, geoScore + ioScore + threatScore);

  return {
    score: total,
    matched,
    ioRelevant: ioHits > 0 || threats.length > 0,
    threats,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getText = (v: any): string => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof v === "object" && "#text" in (v as any)) return String((v as any)["#text"]);
  return String(v);
};

interface RawFeedItem {
  title: string;
  summary: string;
  link: string;
  published: string;
  source: string;
  score: number;
  threats: string[];
  ioRelevant: boolean;
}

async function fetchAndScoreFeed(
  url: string,
  sourceName: string,
  gccKeywords: string[]
): Promise<{ items: RawFeedItem[]; ok: boolean }> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "IE-Sync/2.0 INFSUM Generator (IO Decision Support)",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      next: { revalidate: 86400 }, // 24-hour cache for daily summary
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return { items: [], ok: false };

    const xml = await response.text();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const parsed = parser.parse(xml);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rawItems: any[] = [];
    if (parsed?.rss?.channel?.item) {
      const raw = parsed.rss.channel.item;
      rawItems = Array.isArray(raw) ? raw : [raw];
    } else if (parsed?.feed?.entry) {
      const raw = parsed.feed.entry;
      rawItems = Array.isArray(raw) ? raw : [raw];
    }

    const items: RawFeedItem[] = [];
    for (const rawItem of rawItems.slice(0, 20)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const item = rawItem as any;
      const title = getText(item.title).replace(/<[^>]+>/g, "").trim();
      const summary = (
        getText(item.description) ||
        getText(item.summary) ||
        getText(item.content) || ""
      ).replace(/<[^>]+>/g, "").trim().substring(0, 400);

      const link = String(
        item.link?.["@_href"] ?? (getText(item.link) || getText(item.guid) || "#")
      );
      const published = String(
        item.pubDate ?? item.published ?? item.updated ?? new Date().toISOString()
      );

      if (!title) continue;

      const { score, threats, ioRelevant } = scoreFeedItem(title, summary, gccKeywords);
      items.push({ title, summary, link, published, source: sourceName, score, threats, ioRelevant });
    }

    return { items, ok: true };
  } catch {
    return { items: [], ok: false };
  }
}

// ── Narrative trend extraction ────────────────────────────────────────────
// Extracts recurring keyword clusters from all feed items
function extractNarrativeTrends(items: RawFeedItem[], gccKeywords: string[]): string[] {
  const wordCounts: Record<string, number> = {};
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "was", "are", "were", "be",
    "been", "being", "have", "has", "had", "do", "does", "did", "will",
    "would", "could", "should", "may", "might", "shall", "can", "need",
    "it", "its", "that", "this", "these", "those", "he", "she", "they",
    "we", "his", "her", "their", "our", "my", "your", "not", "no",
    "all", "each", "every", "both", "few", "more", "most", "other",
    "some", "such", "than", "too", "very", "also", "just", "about",
    "new", "said", "says", "over", "after", "into", "up", "out",
  ]);

  for (const item of items) {
    const text = `${item.title} ${item.summary}`.toLowerCase();
    const words = text.split(/\s+/).filter((w) => w.length > 3 && !stopWords.has(w));
    for (const word of words) {
      const clean = word.replace(/[^a-z-]/g, "");
      if (clean.length > 3) {
        wordCounts[clean] = (wordCounts[clean] || 0) + 1;
      }
    }
  }

  // Filter out GCC keywords (they're expected) and return top recurring themes
  const gccLower = new Set(gccKeywords.map((k) => k.toLowerCase()));
  return Object.entries(wordCounts)
    .filter(([word, count]) => count >= 3 && !gccLower.has(word))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word, count]) => `${word} (${count})`);
}

// ── DTG formatting ────────────────────────────────────────────────────────
function formatDTG(date: Date = new Date()): string {
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  return `${dd}${hh}${mm}Z ${months[date.getUTCMonth()]} ${String(date.getUTCFullYear()).slice(-2)}`;
}

// ── Main handler ──────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gccId = (searchParams.get("gcc") ?? "INDOPACOM") as GCCId;

  const config = GCC_CONFIGS[gccId];
  if (!config) {
    return NextResponse.json({ error: "Invalid GCC" }, { status: 400 });
  }

  // Fetch all feeds in parallel
  const feedResults = await Promise.allSettled(
    config.feeds.map((feed) =>
      fetchAndScoreFeed(feed.url, feed.name, config.keywords)
    )
  );

  let allItems: RawFeedItem[] = [];
  const feedHealth: DailyINFSUM["feedHealth"] = [];

  config.feeds.forEach((feed, i) => {
    const result = feedResults[i];
    if (result.status === "fulfilled") {
      allItems = allItems.concat(result.value.items);
      feedHealth.push({ name: feed.name, status: result.value.ok ? "OK" : "FAILED" });
    } else {
      feedHealth.push({ name: feed.name, status: "FAILED" });
    }
  });

  // Sort by score descending
  allItems.sort((a, b) => b.score - a.score);

  // Build threat counts
  const threatCounts: ThreatCategoryCounts = {
    "Cyber Operation": 0,
    "Disinformation": 0,
    "Influence Op": 0,
    "Kinetic": 0,
    "Escalation": 0,
  };
  for (const item of allItems) {
    for (const t of item.threats) {
      if (t in threatCounts) {
        threatCounts[t as keyof ThreatCategoryCounts]++;
      }
    }
  }

  const toEvent = (item: RawFeedItem): INFSUMEvent => ({
    title: item.title,
    summary: item.summary,
    source: item.source,
    link: item.link,
    published: item.published,
    relevanceScore: item.score,
    threatIndicators: item.threats,
    ioRelevant: item.ioRelevant,
  });

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const infsum: DailyINFSUM = {
    gcc: gccId,
    aor: config.aor,
    dtg: formatDTG(now),
    classification: "UNCLASSIFIED // FOUO",
    period: `${formatDTG(yesterday)} to ${formatDTG(now)}`,
    generatedAt: now.toISOString(),
    topEvents: allItems.slice(0, 5).map(toEvent),
    ioActivity: allItems.filter((i) => i.ioRelevant).slice(0, 8).map(toEvent),
    threatCounts,
    narrativeTrends: extractNarrativeTrends(allItems, config.keywords),
    watchItems: allItems.filter((i) => i.score >= 50).slice(0, 5).map(toEvent),
    totalArticlesIngested: allItems.length,
    sourcesQueried: config.feeds.length,
    feedHealth,
  };

  return NextResponse.json(infsum);
}
