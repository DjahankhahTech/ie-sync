import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

// Latest IO-relevant Science & Technology research, white papers, and analysis —
// aggregated from public research/strategy RSS feeds. Powers the S&T tab.

export const maxDuration = 30;

const SOURCES: { name: string; url: string }[] = [
  { name: "War on the Rocks", url: "https://warontherocks.com/feed/" },
  { name: "ASPI Strategist", url: "https://www.aspistrategist.org.au/feed/" },
  { name: "RAND — Information Operations", url: "https://www.rand.org/topics/information-operations.xml" },
  { name: "arXiv cs.SI (Social & Information Networks)", url: "http://export.arxiv.org/rss/cs.SI" },
  { name: "Texas National Security Review", url: "https://tnsr.org/feed/" },
];

interface STItem { title: string; summary: string; link: string; source: string; published: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const txt = (v: any): string => (v == null ? "" : typeof v === "string" ? v : typeof v === "object" && "#text" in v ? String(v["#text"]) : String(v));

async function fetchFeed(name: string, url: string): Promise<STItem[]> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "IE-Sync/2.0 S&T Reader" }, next: { revalidate: 3600 }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const xml = await res.text();
    const parsed = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" }).parse(xml);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let raw: any[] = [];
    if (parsed?.rss?.channel?.item) raw = Array.isArray(parsed.rss.channel.item) ? parsed.rss.channel.item : [parsed.rss.channel.item];
    else if (parsed?.feed?.entry) raw = Array.isArray(parsed.feed.entry) ? parsed.feed.entry : [parsed.feed.entry];
    else if (parsed?.["rdf:RDF"]?.item) raw = Array.isArray(parsed["rdf:RDF"].item) ? parsed["rdf:RDF"].item : [parsed["rdf:RDF"].item];
    return raw.slice(0, 10).map((it) => {
      const title = txt(it.title).replace(/<[^>]+>/g, "").trim();
      const summary = (txt(it.description) || txt(it.summary) || txt(it.content)).replace(/<[^>]+>/g, "").trim().slice(0, 300);
      const link = String(it.link?.["@_href"] ?? (txt(it.link) || txt(it.guid) || "#"));
      const published = String(it.pubDate ?? it.published ?? it.updated ?? it["dc:date"] ?? "");
      return { title, summary, link, source: name, published };
    }).filter((i) => i.title);
  } catch { return []; }
}

export async function GET() {
  const results = await Promise.allSettled(SOURCES.map((s) => fetchFeed(s.name, s.url)));
  let items: STItem[] = [];
  for (const r of results) if (r.status === "fulfilled") items = items.concat(r.value);
  items.sort((a, b) => {
    const ta = Date.parse(a.published) || 0, tb = Date.parse(b.published) || 0;
    return tb - ta;
  });
  return NextResponse.json({ fetchedAt: new Date().toISOString(), total: items.length, items: items.slice(0, 40) });
}
