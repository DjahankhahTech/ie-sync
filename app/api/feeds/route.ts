import { NextRequest, NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";
import { GCC_CONFIGS, type GCCId } from "@/lib/gcc-config";

export interface ScoringRubric {
  geoProximity: number;      // 0-30: keyword match against GCC AOR terms
  ioRelevance: number;       // 0-40: IO-specific keyword hits (higher weight)
  threatIndicator: number;   // 0-30: matched threat category terms
  total: number;             // 0-100: capped sum
  confidence: "HIGH" | "MEDIUM" | "LOW";  // based on number of independent signals
  basisNote: string;         // plain-language explanation of what drove the score
}

export interface LiveFeedItem {
  id: string;
  title: string;
  summary: string;
  link: string;
  published: string;
  source: string;
  sourceUrl: string;
  sourceType: "news" | "gov-advisory" | "social" | "academic" | "commercial-intel";
  collectionMethod: "rss" | "api" | "manual";
  collectedAt: string;       // ISO timestamp of when this item was ingested
  category: string;
  relevanceScore: number;
  scoring: ScoringRubric;    // transparent breakdown — not a magic number
  matchedKeywords: string[];
  ioRelevant: boolean;
  threatIndicators: string[];
  verificationState: "UNVERIFIED" | "CORROBORATED" | "REFUTED";
  crossSourceCount: number;  // number of feeds this story appears in (corroboration proxy)
}

// IO-specific keywords that elevate relevance
const IO_KEYWORDS = [
  "disinformation", "misinformation", "propaganda", "influence operation",
  "cyber attack", "cyberattack", "hacking", "espionage", "information war",
  "deepfake", "bot", "social media manipulation", "election interference",
  "narrative", "psyop", "psychological operation", "hybrid warfare",
  "state media", "censorship", "information warfare", "cognitive",
  "troll farm", "fake news campaign", "coordinated inauthentic",
];

// Threat indicators
const THREAT_INDICATORS: Record<string, string[]> = {
  "Cyber Operation": ["hack", "breach", "malware", "ransomware", "cyberattack", "zero-day", "APT"],
  "Disinformation": ["disinformation", "misinformation", "fake", "fabricated", "false narrative", "propaganda"],
  "Influence Op": ["influence", "narrative", "psyop", "information operation", "troll", "bot network"],
  "Kinetic": ["missile", "strike", "attack", "bomb", "explosion", "military action"],
  "Escalation": ["escalation", "provocation", "incursion", "confrontation", "standoff", "clash"],
};

// ── Transparent scoring rubric ────────────────────────────────────────────
// This function documents EXACTLY how scores are derived so analysts can
// challenge, validate, or override any individual score.
//
// Rubric (max 100):
//   Geo/AOR proximity  (max 30): 10 pts per matched GCC keyword, capped at 30
//   IO relevance       (max 40): 8 pts per IO keyword hit, capped at 40
//   Threat indicators  (max 30): 10 pts per matched threat category, capped at 30
//
// Confidence band:
//   HIGH   (≥3 independent signal types triggered)
//   MEDIUM (2 signal types)
//   LOW    (1 signal type, or keyword-only with no IO/threat hits)
//
// Limitations (baked into basisNote):
//   - Keyword matching has high false-positive rate (no NLP/NER)
//   - Does not assess source credibility or publication bias
//   - Cannot detect novel IO TTPs not in keyword list
//   - Analyst review required before any operational use

function scoreFeedItem(title: string, summary: string, gccKeywords: string[]): {
  score: number;
  scoring: ScoringRubric;
  matched: string[];
  ioRelevant: boolean;
  threats: string[];
} {
  const text = `${title} ${summary}`.toLowerCase();
  const matched: string[] = [];

  // ── Geo/AOR proximity (max 30 pts) ───────────────────────────────────
  let geoScore = 0;
  for (const kw of gccKeywords) {
    if (text.includes(kw.toLowerCase())) {
      matched.push(kw);
      geoScore = Math.min(30, geoScore + 10);
    }
  }

  // ── IO keyword relevance (max 40 pts, 8 pts each) ────────────────────
  let ioScore = 0;
  let ioHits = 0;
  for (const kw of IO_KEYWORDS) {
    if (text.includes(kw.toLowerCase())) {
      ioScore = Math.min(40, ioScore + 8);
      ioHits++;
    }
  }

  // ── Threat indicator match (max 30 pts, 10 pts each) ─────────────────
  const threats: string[] = [];
  let threatScore = 0;
  for (const [indicator, terms] of Object.entries(THREAT_INDICATORS)) {
    if (terms.some((t) => text.includes(t.toLowerCase()))) {
      threats.push(indicator);
      threatScore = Math.min(30, threatScore + 10);
    }
  }

  const total = Math.min(100, geoScore + ioScore + threatScore);

  // ── Confidence band ───────────────────────────────────────────────────
  const signalTypes = [geoScore > 0, ioScore > 0, threatScore > 0].filter(Boolean).length;
  const confidence: ScoringRubric["confidence"] =
    signalTypes >= 3 ? "HIGH" : signalTypes === 2 ? "MEDIUM" : "LOW";

  // ── Plain-language basis note ─────────────────────────────────────────
  const basisParts: string[] = [];
  if (geoScore > 0) basisParts.push(`AOR match (${matched.slice(0, 2).join(", ")})`);
  if (ioScore > 0) basisParts.push(`IO keywords ×${ioHits}`);
  if (threats.length > 0) basisParts.push(`threat indicators: ${threats.join(", ")}`);
  const basisNote = basisParts.length > 0
    ? `Score basis: ${basisParts.join("; ")}. LIMITATION: keyword-only scoring — no NLP/entity resolution. Analyst review required.`
    : "No keyword signals matched. Score based on category baseline only. Treat with LOW confidence.";

  const scoring: ScoringRubric = {
    geoProximity: geoScore,
    ioRelevance: ioScore,
    threatIndicator: threatScore,
    total,
    confidence,
    basisNote,
  };

  return {
    score: total,
    scoring,
    matched,
    ioRelevant: ioHits > 0 || threats.length > 0,
    threats,
  };
}

async function fetchRSSFeed(url: string, sourceName: string, category: string, gccKeywords: string[]): Promise<LiveFeedItem[]> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "IE-Sync/2.0 RSS Reader (IO Decision Support)",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
      next: { revalidate: 300 }, // 5-minute cache
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return [];

    const xml = await response.text();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const parsed = parser.parse(xml);

    // Support both RSS 2.0 and Atom
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let items: any[] = [];
    if (parsed?.rss?.channel?.item) {
      const raw = parsed.rss.channel.item;
      items = Array.isArray(raw) ? raw : [raw];
    } else if (parsed?.feed?.entry) {
      const raw = parsed.feed.entry;
      items = Array.isArray(raw) ? raw : [raw];
    }

    const results: LiveFeedItem[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getText = (v: any): string => {
      if (v == null) return "";
      if (typeof v === "string") return v;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof v === "object" && "#text" in (v as any)) return String((v as any)["#text"]);
      return String(v);
    };

    // Per-source index so IDs are always unique even when links are identical
    // (e.g. feed returns same URL for multiple items, or base64 prefix collides)
    let itemIndex = 0;

    for (const rawItem of items.slice(0, 15)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const item = rawItem as any;
      const title = getText(item.title).replace(/<[^>]+>/g, "").trim();

      const summary = (
        getText(item.description) ||
        getText(item.summary) ||
        getText(item.content) || ""
      ).replace(/<[^>]+>/g, "").trim().substring(0, 500);

      const link = String(
        item.link?.["@_href"] ?? (getText(item.link) || getText(item.guid) || "#")
      );

      const published = String(
        item.pubDate ?? item.published ?? item.updated ?? new Date().toISOString()
      );

      if (!title) continue;

      const { score, scoring, matched, ioRelevant, threats } = scoreFeedItem(title, summary, gccKeywords);

      // Infer source type from URL/category heuristics
      const inferredSourceType = ((): LiveFeedItem["sourceType"] => {
        const u = url.toLowerCase();
        if (u.includes(".gov") || u.includes("state.gov") || u.includes("cisa.gov")) return "gov-advisory";
        if (u.includes("academic") || u.includes(".edu") || category === "Academic") return "academic";
        return "news";
      })();

      // Build a collision-resistant ID:
      //   - 24 chars of base64(link) for content-based uniqueness
      //   - itemIndex suffix guarantees uniqueness even when links are identical
      const linkHash = Buffer.from(link).toString("base64").replace(/[+/=]/g, "").slice(0, 24);
      const itemId = `${sourceName}-${linkHash}-${itemIndex}`;
      itemIndex++;

      results.push({
        id: itemId,
        title,
        summary: summary || title,
        link,
        published,
        source: sourceName,
        sourceUrl: url,
        sourceType: inferredSourceType,
        collectionMethod: "rss",
        collectedAt: new Date().toISOString(),
        category,
        relevanceScore: score,
        scoring,
        matchedKeywords: matched,
        ioRelevant,
        threatIndicators: threats,
        verificationState: "UNVERIFIED",  // default — requires analyst action to upgrade
        crossSourceCount: 1,               // will be updated post-dedup if same story appears in multiple feeds
      });
    }

    return results;
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gccId = (searchParams.get("gcc") ?? "INDOPACOM") as GCCId;
  const ioOnly = searchParams.get("ioOnly") === "true";

  const config = GCC_CONFIGS[gccId];
  if (!config) {
    return NextResponse.json({ error: "Invalid GCC" }, { status: 400 });
  }

  // Global military / government / academic OSINT sources — fetched for every
  // CCMD and scored against that AOR's keywords (so only AOR-relevant items
  // surface). Verified RSS endpoints.
  const GLOBAL_SOURCES: { name: string; url: string; category: string }[] = [
    { name: "DoD News", url: "https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=800&Site=945&max=20", category: "Government" },
    { name: "Defense One", url: "https://www.defenseone.com/rss/all/", category: "Military" },
    { name: "USNI News", url: "https://news.usni.org/feed", category: "Military" },
    { name: "War on the Rocks", url: "https://warontherocks.com/feed/", category: "Academic" },
    { name: "ASPI Strategist", url: "https://www.aspistrategist.org.au/feed/", category: "Academic" },
    { name: "CISA Advisories", url: "https://www.cisa.gov/cybersecurity-advisories/all.xml", category: "Government" },
  ];

  // Fetch all feeds in parallel (AOR feeds + global mil/gov/academic feeds)
  const feedPromises = [
    ...config.feeds.map((feed) => fetchRSSFeed(feed.url, feed.name, feed.category, config.keywords)),
    ...GLOBAL_SOURCES.map((feed) => fetchRSSFeed(feed.url, feed.name, feed.category, config.keywords)),
  ];

  const results = await Promise.allSettled(feedPromises);
  let allItems: LiveFeedItem[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      allItems = allItems.concat(result.value);
    }
  }

  // ── Cross-source corroboration: count items with similar titles ──────
  // Simple title-overlap heuristic — first 6 words as a fingerprint
  const titleFingerprint = (title: string) =>
    title.toLowerCase().split(/\s+/).slice(0, 6).join(" ");
  const fingerprintCounts: Record<string, number> = {};
  for (const item of allItems) {
    const fp = titleFingerprint(item.title);
    fingerprintCounts[fp] = (fingerprintCounts[fp] ?? 0) + 1;
  }
  for (const item of allItems) {
    const fp = titleFingerprint(item.title);
    item.crossSourceCount = fingerprintCounts[fp] ?? 1;
    // Upgrade verification state if 2+ sources corroborate
    if (item.crossSourceCount >= 2) {
      item.verificationState = "CORROBORATED";
    }
  }

  // Sort by relevance score descending, then by date
  allItems.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
    return new Date(b.published).getTime() - new Date(a.published).getTime();
  });

  // Filter if ioOnly
  if (ioOnly) {
    allItems = allItems.filter((item) => item.ioRelevant || item.relevanceScore > 20);
  }

  return NextResponse.json({
    gcc: gccId,
    aor: config.aor,
    fetchedAt: new Date().toISOString(),
    total: allItems.length,
    items: allItems.slice(0, 50),
  });
}
