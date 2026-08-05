import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { XMLParser } from "fast-xml-parser";
import { GCC_CONFIGS, type GCCId } from "@/lib/gcc-config";
import { ADVERSARY_MEDIA, SPONSOR_META, type AdversaryOutlet, type SponsorId } from "@/lib/adversary-media-config";

// Adversary-narrative reader: live items from the state-controlled outlets
// anti-US audiences in the selected theater are reading. OSINT provenance is
// explicit — every item is tagged with its outlet and state sponsor, and the
// UI presents this as narrative awareness, never as factual reporting.

export const maxDuration = 60;

export interface AdversaryMediaItem {
  id: string;
  title: string;
  summary: string;
  link: string;
  published: string | null;
  outlet: string;
  outletId: string;
  sponsor: SponsorId;
  sponsorLabel: string;
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

function getText(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o["#text"] === "string") return o["#text"] as string;
    if (typeof o["@_href"] === "string") return o["@_href"] as string;
  }
  return "";
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
}

async function fetchOutlet(outlet: AdversaryOutlet): Promise<AdversaryMediaItem[]> {
  try {
    const res = await fetch(outlet.url, {
      headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml, */*" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const parsed = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" }).parse(xml);
    let raw: unknown[] = [];
    if (parsed?.rss?.channel?.item) raw = Array.isArray(parsed.rss.channel.item) ? parsed.rss.channel.item : [parsed.rss.channel.item];
    else if (parsed?.feed?.entry) raw = Array.isArray(parsed.feed.entry) ? parsed.feed.entry : [parsed.feed.entry];

    return raw.slice(0, 25).flatMap((r, i) => {
      const item = r as Record<string, unknown>;
      const title = stripHtml(getText(item.title));
      const link = getText(item.link) || getText(item.guid);
      if (!title || !link.startsWith("http")) return [];
      const publishedRaw = getText(item.pubDate) || getText(item.published) || getText(item.updated) || getText(item["dc:date"]);
      const publishedMs = Date.parse(publishedRaw);
      return [{
        id: `${outlet.id}-${i}-${Buffer.from(link).toString("base64").slice(0, 12)}`,
        title,
        summary: stripHtml(getText(item.description) || getText(item.summary) || getText(item["content:encoded"])).slice(0, 280),
        link,
        published: Number.isFinite(publishedMs) ? new Date(publishedMs).toISOString() : null,
        outlet: outlet.name,
        outletId: outlet.id,
        sponsor: outlet.sponsor,
        sponsorLabel: SPONSOR_META[outlet.sponsor].label,
      }];
    });
  } catch {
    return []; // dead outlet this cycle — honest empty, never fabricated
  }
}

async function collect(gccId: GCCId) {
  const cfg = ADVERSARY_MEDIA[gccId];
  const perOutlet = await Promise.all(cfg.outlets.map(fetchOutlet));
  let items = perOutlet.flat();

  if (cfg.keywords?.length) {
    const kws = cfg.keywords.map((k) => k.toLowerCase());
    items = items.filter((it) => {
      const hay = ` ${it.title.toLowerCase()} ${it.summary.toLowerCase()} `;
      return kws.some((k) => hay.includes(k));
    });
  }

  // Newest first; undated items sink to the bottom rather than faking a date.
  items.sort((a, b) => (b.published ? Date.parse(b.published) : 0) - (a.published ? Date.parse(a.published) : 0));

  return {
    gcc: gccId,
    classification: "UNCLASSIFIED // OSINT — ADVERSARY STATE-CONTROLLED MEDIA",
    provenance:
      "Live output of state-controlled/state-aligned outlets monitored for this theater. Surfaced for narrative awareness only — not factual reporting, not endorsement.",
    fetchedAt: new Date().toISOString(),
    outlets: cfg.outlets.map((o, idx) => ({
      id: o.id, name: o.name, sponsor: o.sponsor, sponsorLabel: SPONSOR_META[o.sponsor].label,
      count: perOutlet[idx].length,
    })),
    items: items.slice(0, 80),
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gccId = (searchParams.get("gcc") ?? "INDOPACOM") as GCCId;
  if (!GCC_CONFIGS[gccId]) return NextResponse.json({ error: "Invalid GCC" }, { status: 400 });
  try {
    // 15-minute shared cache — one fetch sweep serves every reader.
    const data = await unstable_cache(
      () => collect(gccId),
      ["adversary-media", "v1", gccId],
      { revalidate: 900, tags: ["adversary-media"] }
    )();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "fetch failed" }, { status: 502 });
  }
}
