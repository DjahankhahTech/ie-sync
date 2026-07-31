import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";
import { GCC_CONFIGS, type GCCId } from "@/lib/gcc-config";
import { AI_MODEL, aiEffort, cachedSystem } from "@/lib/ai-config";
import { DOCTRINE_LIBRARY_PROMPT } from "@/lib/military-library";

// AI-generated executive Daily Information Summary (INFSUM). Generated once per
// ET-day and cached (Vercel Data Cache) so it does NOT regenerate on every page
// refresh; the /api/infsum-cron job warms it at 06:00 ET daily. Synthesizes the
// live OSINT into a commander's read + linked references.
// UNCLASSIFIED // OSINT — AI DRAFT, requires human analyst validation.

export const maxDuration = 120;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    bluf: { type: "string" },
    keyDevelopments: { type: "array", items: { type: "string" } },
    ioThreatActivity: { type: "array", items: { type: "string" } },
    narrativeTrends: { type: "array", items: { type: "string" } },
    assessment: { type: "string" },
    watchItems: { type: "array", items: { type: "string" } },
  },
  required: ["bluf", "keyDevelopments", "ioThreatActivity", "narrativeTrends", "assessment", "watchItems"],
} as const;

const SYSTEM_PROMPT = `You are an OIE (Operations in the Information Environment) watch analyst. Write a concise commander's Daily Information Summary (INFSUM) synthesizing the supplied open-source reporting for the named AOR.

Produce:
- bluf: 2-3 sentence Bottom Line Up Front — the single most important read of the information environment right now.
- keyDevelopments: 3-6 one-line bullets (most significant events/reporting).
- ioThreatActivity: 2-5 bullets on information-operations / cyber / influence / threat activity.
- narrativeTrends: 2-4 bullets on dominant narratives and how they are trending.
- assessment: 2-4 sentence analyst assessment (so-what for the command).
- watchItems: 2-4 bullets — what to watch over the next 24-72 hours.

Rules: ground everything in the supplied OSINT; do not invent events. Be concise and operational; use proper IO/OIE vernacular. Classification UNCLASSIFIED // OSINT; this is an AI-generated DRAFT requiring human analyst validation.`;

// The catalogued military-library research corpus, appended once so the whole
// system block stays a stable prefix that the prompt cache can reuse.
const GROUNDED_SYSTEM_PROMPT = `${SYSTEM_PROMPT}\n\n${DOCTRINE_LIBRARY_PROMPT}`;

interface FeedItem { title: string; summary?: string; source?: string; link?: string; published?: string }

async function generate(gccId: GCCId, origin: string) {
  const config = GCC_CONFIGS[gccId];
  // Pull the live OSINT for this AOR (server-side self-call to the public feed route).
  let items: FeedItem[] = [];
  try {
    const fr = await fetch(`${origin}/api/feeds?gcc=${gccId}&ioOnly=true`, { signal: AbortSignal.timeout(20000) });
    if (fr.ok) { const fj = await fr.json(); items = (fj.items ?? []).slice(0, 40); }
  } catch { /* fall through to empty */ }

  if (items.length === 0) {
    return { gcc: gccId, generatedAt: new Date().toISOString(), error: "No OSINT available for this AOR right now.", summary: null, references: [] };
  }

  const references = items.slice(0, 12).map((it) => ({ title: it.title, source: it.source ?? "", url: it.link ?? "", published: it.published ?? "" }));
  const osint = items.map((it, i) => `[${i + 1}] ${it.title}${it.source ? ` (${it.source})` : ""}\n${(it.summary ?? "").slice(0, 300)}`).join("\n\n");
  const userPrompt = `AOR: ${config.name} (${config.aor})
COUNTRIES OF INTEREST: ${config.countries.join(", ")}

LIVE OSINT (${items.length} items ingested from public feeds):

${osint}

Write the Daily Information Summary for this AOR, grounded in the OSINT above.`;

  const client = new Anthropic();
  const stream = client.messages.stream({
    model: AI_MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: { effort: aiEffort("infsum"), format: { type: "json_schema", schema: SCHEMA } },
    system: cachedSystem(GROUNDED_SYSTEM_PROMPT),
    messages: [{ role: "user", content: userPrompt }],
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") {
    return { gcc: gccId, generatedAt: new Date().toISOString(), error: "The model declined this request.", summary: null, references };
  }
  const textBlock = message.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "";
  let summary;
  try { summary = JSON.parse(raw); } catch { return { gcc: gccId, generatedAt: new Date().toISOString(), error: "Model returned unparseable output.", summary: null, references }; }

  return {
    gcc: gccId,
    generatedAt: new Date().toISOString(),
    model: message.model,
    classification: "UNCLASSIFIED // OSINT",
    sourceCount: items.length,
    summary,
    references,
  };
}

// Current ET slot — the summary is posted at 0600 / 1200 / 1800 ET.
function currentSlotET(): string {
  const hourStr = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", hour12: false }).format(new Date());
  const h = parseInt(hourStr, 10);
  return h >= 18 ? "1800" : h >= 12 ? "1200" : h >= 6 ? "0600" : "0000";
}

export async function GET(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI engine not configured — ANTHROPIC_API_KEY is not set." }, { status: 503 });
  }
  const { searchParams, origin } = new URL(request.url);
  const gccId = (searchParams.get("gcc") ?? "INDOPACOM") as GCCId;
  const force = searchParams.get("force") === "1";
  if (!GCC_CONFIGS[gccId]) return NextResponse.json({ error: "Invalid GCC" }, { status: 400 });

  // Posted 3x daily (0600/1200/1800 ET); cache key includes the slot + a version
  // segment. Throw on error so failures are not cached.
  const dayET = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
  const slot = currentSlotET();
  const gen = async () => {
    const r = await generate(gccId, origin);
    if (r.error) throw new Error(String(r.error));
    return r;
  };
  const cached = unstable_cache(gen, ["infsum-ai", "v3", gccId, dayET, slot], { revalidate: 21600, tags: ["infsum-ai", `infsum-ai-${gccId}`] });

  try {
    const data = force ? await gen() : await cached();
    return NextResponse.json({ ...data, day: dayET, slot, cached: !force });
  } catch (err) {
    const msg = err instanceof Anthropic.APIError ? err.message : err instanceof Error ? err.message : "AI engine error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
