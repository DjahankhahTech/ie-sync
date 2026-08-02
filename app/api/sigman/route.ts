import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";
import { GCC_CONFIGS, type GCCId } from "@/lib/gcc-config";
import { AI_MODEL, aiEffort, cachedSystem } from "@/lib/ai-config";
import { DOCTRINE_LIBRARY_PROMPT } from "@/lib/military-library";
import { deriveSigmanMetrics, recordSnapshot } from "@/lib/history-store";

// SIGMAN (Signature Management) OSINT scan. SIGMAN is about FRIENDLY-force
// signature / OPSEC: what an adversary could learn about US & allied posture.
// This route reads the live OSINT and identifies what open-source reporting is
// REVEALING about friendly forces (named units, installations, ship/troop
// movements, exercises, deployments, personnel exposure, technical tells) that
// an adversary could exploit — i.e., an open-source OPSEC self-assessment.
// UNCLASSIFIED // OSINT — AI DRAFT, requires human OPSEC officer validation.

export const maxDuration = 300;

interface FeedItemInput { title: string; summary?: string; source?: string; link?: string; published?: string }

const SIGMAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    overallExposure: { type: "integer" },
    posture: { type: "string", enum: ["LOW", "MODERATE", "ELEVATED", "HIGH"] },
    summary: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          category: { type: "string", enum: ["TECHNICAL", "ADMINISTRATIVE", "PHYSICAL", "INFORMATIONAL"] },
          indicator: { type: "string" },
          exposure: { type: "string" },
          riskLevel: { type: "string", enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"] },
          exposureScore: { type: "integer" },
          recommendation: { type: "string" },
          sourceTitle: { type: "string" },
          sourceUrl: { type: "string" },
        },
        required: ["category", "indicator", "exposure", "riskLevel", "exposureScore", "recommendation", "sourceTitle", "sourceUrl"],
      },
    },
  },
  required: ["overallExposure", "posture", "summary", "items"],
} as const;

const SYSTEM_PROMPT = `You are a Signature Management (SIGMAN) / OPSEC analyst for a US combatant command. Given open-source reporting, identify what the OPEN SOURCE PICTURE is REVEALING about FRIENDLY forces (US and allied) that an adversary collection effort could exploit.

Look for friendly-force signature indicators in the OSINT: named US/allied units or commands, installations and bases, ship/aircraft/troop movements and deployments, announced or observable exercises, basing/access negotiations, logistics/contract tells, personnel or unit social-media exposure, patterns-of-life, and any technical emissions or capabilities disclosed.

For each indicator: classify the signature category (TECHNICAL = emissions/cyber/technical disclosures; PHYSICAL = locations/movements/installations; ADMINISTRATIVE = personnel/social-media/patterns/contracts; INFORMATIONAL = disclosed intent/plans/messaging), state plainly WHAT is exposed, assess what an adversary could infer or target, rate the risk, give an exposureScore 0-100, and give a concrete OPSEC/SIGMAN mitigation. Cite the OSINT item (sourceTitle + a real URL from the inputs).

HARD RULES:
- Ground every finding in the supplied OSINT. Do not invent unit names, locations, or movements not present in the inputs.
- This is an OPSEC SELF-ASSESSMENT of the open-source picture — it does NOT measure classified signatures.
- Classification UNCLASSIFIED // OSINT. AI-generated DRAFT requiring human OPSEC officer validation.
- overallExposure 0-100 and posture reflect the aggregate friendly-force exposure visible in this OSINT set. If little/no friendly-force exposure is present, say so honestly (low score, few/no items).`;

// The catalogued military-library research corpus, appended once so the whole
// system block stays a stable prefix that the prompt cache can reuse.
const GROUNDED_SYSTEM_PROMPT = `${SYSTEM_PROMPT}\n\n${DOCTRINE_LIBRARY_PROMPT}`;

// Shared SIGMAN scan core — used by POST (client items) and the cached GET.
async function runSigman(gccId: GCCId, items: FeedItemInput[]): Promise<Record<string, unknown> & { error?: string; status?: number }> {
  const config = GCC_CONFIGS[gccId];
  if (!config) return { error: "Invalid GCC", status: 400 };
  if (items.length === 0) return { error: "No OSINT items available. Load the live feed for this AOR first.", status: 422 };

  const osint = items
    .map((it, i) => `[${i + 1}] ${it.title}${it.source ? ` (${it.source})` : ""}\n${(it.summary ?? "").slice(0, 350)}${it.link ? `\nSOURCE: ${it.link}` : ""}`)
    .join("\n\n");

  const userPrompt = `AOR: ${config.name} (${config.aor})
COUNTRIES: ${config.countries.join(", ")}

LIVE OSINT (${items.length} items) — assess what this open-source picture reveals about FRIENDLY (US/allied) force signatures and OPSEC:

${osint}

Produce the SIGMAN open-source exposure assessment.`;

  try {
    const client = new Anthropic();
    const stream = client.messages.stream({
      model: AI_MODEL,
      max_tokens: 20000,
      thinking: { type: "adaptive" },
      output_config: { effort: aiEffort("sigman"), format: { type: "json_schema", schema: SIGMAN_SCHEMA } },
      system: cachedSystem(GROUNDED_SYSTEM_PROMPT),
      messages: [{ role: "user", content: userPrompt }],
    });
    const message = await stream.finalMessage();
    if (message.stop_reason === "refusal") return { error: "The model declined this request.", status: 422 };
    const textBlock = message.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "";
    let assessment;
    try { assessment = JSON.parse(raw); } catch { return { error: "Model returned unparseable output. Retry.", status: 502 }; }
    return {
      gcc: gccId,
      generatedAt: new Date().toISOString(),
      model: message.model,
      classification: "UNCLASSIFIED // OSINT",
      provenance: "AI-DRAFT open-source OPSEC self-assessment — does not measure classified signatures. Requires human OPSEC officer validation.",
      sourceCount: items.length,
      assessment,
    };
  } catch (err) {
    const status = err instanceof Anthropic.AuthenticationError ? 401 : err instanceof Anthropic.RateLimitError ? 429 : err instanceof Anthropic.APIError ? err.status ?? 502 : 500;
    return { error: err instanceof Anthropic.APIError ? err.message : "AI engine error", status };
  }
}

async function fetchAORItems(gccId: GCCId, origin: string): Promise<FeedItemInput[]> {
  try {
    const r = await fetch(`${origin}/api/feeds?gcc=${gccId}`, { signal: AbortSignal.timeout(20000) });
    if (r.ok) { const j = await r.json(); return (j.items ?? []).slice(0, 40).map((i: FeedItemInput) => ({ title: i.title, summary: i.summary, source: i.source, link: i.link, published: i.published })); }
  } catch { /* ignore */ }
  return [];
}

// Current ET assessment slot — SIGMAN refreshes at 0600 / 1200 / 1800 ET.
function currentSlotET(): string {
  const hourStr = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", hour12: false }).format(new Date());
  const h = parseInt(hourStr, 10);
  return h >= 18 ? "1800" : h >= 12 ? "1200" : h >= 6 ? "0600" : "0000";
}

// Cached SIGMAN scan, refreshed three times daily (0600 / 1200 / 1800 ET,
// warmed by /api/infsum-cron). `?force=1` re-scans from the latest sources.
export async function GET(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI engine not configured — ANTHROPIC_API_KEY is not set." }, { status: 503 });
  }
  const { searchParams, origin } = new URL(request.url);
  const gccId = (searchParams.get("gcc") ?? "INDOPACOM") as GCCId;
  const force = searchParams.get("force") === "1";
  if (!GCC_CONFIGS[gccId]) return NextResponse.json({ error: "Invalid GCC" }, { status: 400 });

  const dayET = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
  const slot = currentSlotET();
  // Throw on error so failures are not cached; version segment flushes old entries.
  const gen = async () => {
    const r = await runSigman(gccId, await fetchAORItems(gccId, origin));
    if (r.error) { const e = new Error(String(r.error)) as Error & { status?: number }; e.status = (r.status as number) ?? 502; throw e; }
    // Append to the immutable history on every fresh generation — this closure
    // runs only on a cache miss or `?force=1`, so a forced re-run cannot
    // overwrite what was claimed earlier. Best-effort: recordSnapshot never throws.
    await recordSnapshot({
      gcc: gccId,
      product: "sigman",
      day: dayET,
      slot,
      model: typeof r.model === "string" ? r.model : null,
      effort: aiEffort("sigman"),
      payload: r,
      ...deriveSigmanMetrics(
        (r.assessment ?? {}) as Parameters<typeof deriveSigmanMetrics>[0],
        typeof r.sourceCount === "number" ? r.sourceCount : null
      ),
    });
    return r;
  };
  try {
    const data = force
      ? await gen()
      : await unstable_cache(gen, ["sigman", "v3", gccId, dayET, slot], { revalidate: 21600, tags: ["sigman", `sigman-${gccId}`] })();
    return NextResponse.json({ ...data, day: dayET, slot });
  } catch (e) {
    const err = e as Error & { status?: number };
    return NextResponse.json({ error: err.message ?? "AI engine error" }, { status: err.status ?? 502 });
  }
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI engine not configured — ANTHROPIC_API_KEY is not set." }, { status: 503 });
  }
  let body: { gcc?: GCCId; feedItems?: FeedItemInput[] };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const gccId = (body.gcc ?? "INDOPACOM") as GCCId;
  const items = (body.feedItems ?? []).slice(0, 40);
  const data = await runSigman(gccId, items);
  if (data.error) return NextResponse.json({ error: data.error }, { status: (data.status as number) ?? 502 });
  return NextResponse.json(data);
}
