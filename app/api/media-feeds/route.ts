import { NextRequest, NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";
import { GCC_CONFIGS, type GCCId } from "@/lib/gcc-config";
import { MEDIA_FEED_SOURCES, type MediaFeedSource } from "@/lib/media-feed-config";

// ── Types ─────────────────────────────────────────────────────────────────
export interface MediaFeedItem {
  id: string;
  title: string;
  description: string;
  link: string;
  published: string;
  source: string;
  mediaType: "video" | "image";
  thumbnailUrl: string | null;
  mediaUrl: string | null;
  duration: string | null;
  relevanceScore: number;
  matchedKeywords: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getText = (v: any): string => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof v === "object" && "#text" in (v as any)) return String((v as any)["#text"]);
  return String(v);
};

function scoreMediaItem(title: string, description: string, gccKeywords: string[]): { score: number; matched: string[] } {
  const text = `${title} ${description}`.toLowerCase();
  const matched: string[] = [];
  let score = 0;

  for (const kw of gccKeywords) {
    if (text.includes(kw.toLowerCase())) {
      matched.push(kw);
      score += 10;
    }
  }

  // IO keyword bonus
  const ioTerms = ["propaganda", "disinformation", "influence", "narrative", "information warfare", "cyber", "psyop"];
  for (const kw of ioTerms) {
    if (text.includes(kw)) score += 8;
  }

  return { score: Math.min(100, score), matched };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractMediaInfo(item: any): { thumbnailUrl: string | null; mediaUrl: string | null; duration: string | null; mediaType: "video" | "image" } {
  let thumbnailUrl: string | null = null;
  let mediaUrl: string | null = null;
  let duration: string | null = null;
  let mediaType: "video" | "image" = "video";

  // YouTube RSS: media:group > media:thumbnail, media:content
  if (item["media:group"]) {
    const group = item["media:group"];
    if (group["media:thumbnail"]) {
      thumbnailUrl = group["media:thumbnail"]["@_url"] || null;
    }
    if (group["media:content"]) {
      mediaUrl = group["media:content"]["@_url"] || null;
      duration = group["media:content"]["@_duration"] || null;
    }
  }

  // media:thumbnail directly
  if (!thumbnailUrl && item["media:thumbnail"]) {
    thumbnailUrl = item["media:thumbnail"]["@_url"] || null;
  }

  // media:content directly
  if (!mediaUrl && item["media:content"]) {
    const mc = item["media:content"];
    mediaUrl = mc["@_url"] || null;
    const mimeType = mc["@_type"] || mc["@_medium"] || "";
    if (typeof mimeType === "string" && (mimeType.includes("image") || mc["@_medium"] === "image")) {
      mediaType = "image";
    }
  }

  // enclosure
  if (!mediaUrl && item.enclosure) {
    mediaUrl = item.enclosure["@_url"] || null;
    const encType = item.enclosure["@_type"] || "";
    if (typeof encType === "string" && encType.includes("image")) {
      mediaType = "image";
    }
  }

  // Infer thumbnail from YouTube link
  if (!thumbnailUrl) {
    const link = getText(item.link?.["@_href"] || item.link || "");
    const ytMatch = link.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (ytMatch) {
      thumbnailUrl = `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;
    }
  }

  return { thumbnailUrl, mediaUrl, duration, mediaType };
}

async function fetchMediaFeed(
  feedSource: MediaFeedSource,
  gccKeywords: string[]
): Promise<MediaFeedItem[]> {
  try {
    const response = await fetch(feedSource.url, {
      headers: {
        "User-Agent": "IE-Sync/2.0 Media Feed Reader (IO Decision Support)",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
      next: { revalidate: 3600 }, // 1-hour cache for media
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return [];

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

    const items: MediaFeedItem[] = [];

    for (const rawItem of rawItems.slice(0, 15)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const item = rawItem as any;
      const title = getText(item.title).replace(/<[^>]+>/g, "").trim();
      if (!title) continue;

      const description = (
        getText(item.description) ||
        getText(item.summary) ||
        getText(item.content) || ""
      ).replace(/<[^>]+>/g, "").trim().substring(0, 300);

      const link = String(
        item.link?.["@_href"] ?? (getText(item.link) || getText(item.guid) || "#")
      );
      const published = String(
        item.pubDate ?? item.published ?? item.updated ?? new Date().toISOString()
      );

      const { thumbnailUrl, mediaUrl, duration, mediaType } = extractMediaInfo(item);
      const { score, matched } = scoreMediaItem(title, description, gccKeywords);

      // Override media type from feed source config
      const finalMediaType = feedSource.mediaType || mediaType;

      const linkHash = Buffer.from(link).toString("base64").replace(/[+/=]/g, "").slice(0, 24);

      items.push({
        id: `${feedSource.name}-${linkHash}`,
        title,
        description,
        link,
        published,
        source: feedSource.name,
        mediaType: finalMediaType,
        thumbnailUrl,
        mediaUrl,
        duration: duration ? `${Math.floor(Number(duration) / 60)}:${String(Number(duration) % 60).padStart(2, "0")}` : null,
        relevanceScore: score,
        matchedKeywords: matched,
      });
    }

    return items;
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gccId = (searchParams.get("gcc") ?? "INDOPACOM") as GCCId;
  const typeFilter = searchParams.get("type"); // "video" | "image" | null (all)

  const config = GCC_CONFIGS[gccId];
  if (!config) {
    return NextResponse.json({ error: "Invalid GCC" }, { status: 400 });
  }

  const mediaSources = MEDIA_FEED_SOURCES[gccId] || [];

  const results = await Promise.allSettled(
    mediaSources.map((source) => fetchMediaFeed(source, config.keywords))
  );

  let allItems: MediaFeedItem[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      allItems = allItems.concat(result.value);
    }
  }

  // Sort by relevance then recency
  allItems.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
    return new Date(b.published).getTime() - new Date(a.published).getTime();
  });

  // Filter by type if requested
  if (typeFilter === "video" || typeFilter === "image") {
    allItems = allItems.filter((item) => item.mediaType === typeFilter);
  }

  return NextResponse.json({
    gcc: gccId,
    aor: config.aor,
    fetchedAt: new Date().toISOString(),
    total: allItems.length,
    items: allItems.slice(0, 30),
  });
}
