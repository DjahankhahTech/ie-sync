import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";
import { GCC_CONFIGS, type GCCId } from "@/lib/gcc-config";
import { AI_MODEL, aiEffort, cachedSystem } from "@/lib/ai-config";
import { deriveMetrics, recordSnapshot } from "@/lib/history-store";
import { DOCTRINE_LIBRARY_PROMPT } from "@/lib/military-library";

// AI assessment engine. Takes REAL ingested OSINT (from /api/feeds) and uses
// Claude to draft doctrinally-grounded OIE planning products: an IE Running
// Estimate, the AO threat picture, and hostile-narrative analysis.
//
// Everything it returns is an UNCLASSIFIED // OSINT-derived AI DRAFT and is
// marked as requiring human analyst validation before operational use. The
// model is instructed to ground every item in the supplied OSINT and to NOT
// fabricate classified intelligence (SIGINT/HUMINT intercepts, exact troop
// data, etc.).

export const maxDuration = 300; // Fluid Compute: allow long model runs

interface FeedItemInput {
  title: string;
  summary?: string;
  source?: string;
  link?: string;
  published?: string;
}

// JSON schema for structured output — flat, additionalProperties:false, enums
// for constrained fields. Mirrors the store types so the client can consume it
// directly.
const ASSESSMENT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    ieCondition: { type: "string", enum: ["PERMISSIVE", "UNCERTAIN", "HOSTILE"] },
    ieSituation: { type: "string" },
    missionStatement: { type: "string" },
    cdruObjective: { type: "string" },
    priority: { type: "string", enum: ["IE1", "IE2", "IE3"] },
    adversaryCapabilities: { type: "array", items: { type: "string" } },
    friendlyCapabilities: { type: "array", items: { type: "string" } },
    assumptions: { type: "array", items: { type: "string" } },
    limitations: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
    recommendations: { type: "array", items: { type: "string" } },
    threatEntities: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          designation: { type: "string" },
          type: { type: "string", enum: ["STATE", "NON-STATE", "PROXY", "UNKNOWN"] },
          location: { type: "string" },
          activity: { type: "string" },
          threat: { type: "string", enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"] },
          // 0-100 percentage. The structured-output API rejects minimum/maximum
          // on integers, so the range is enforced by clampConfidence in the store.
          confidence: { type: "integer" },
          capabilities: { type: "array", items: { type: "string" } },
          sourceLabel: { type: "string" },
          sourceUrl: { type: "string" },
        },
        required: ["designation", "type", "location", "activity", "threat", "confidence", "capabilities", "sourceLabel", "sourceUrl"],
      },
    },
    narrativeThreads: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          platform: { type: "string" },
          sentiment: { type: "number" },
          reach: { type: "integer" },
          velocity: { type: "integer" },
          adversarial: { type: "boolean" },
          summary: { type: "string" },
          trend: { type: "string", enum: ["RISING", "FALLING", "STABLE"] },
        },
        required: ["title", "platform", "sentiment", "reach", "velocity", "adversarial", "summary", "trend"],
      },
    },
    measuresOfEffectiveness: { type: "array", items: { type: "string" } },
    measuresOfPerformance: { type: "array", items: { type: "string" } },
  },
  required: ["ieCondition", "ieSituation", "missionStatement", "cdruObjective", "priority", "adversaryCapabilities", "friendlyCapabilities", "assumptions", "limitations", "risks", "recommendations", "threatEntities", "narrativeThreads", "measuresOfEffectiveness", "measuresOfPerformance"],
} as const;

const SYSTEM_PROMPT = `You are an Operations in the Information Environment (OIE) planning assistant supporting Marine Corps Information Officers (1st MIG / MAGTF information staff) and joint partners. Your job is to (1) characterize the military information environment from open sources and (2) produce reasoned, explicitly speculative DRAFT estimates of adversary information activities and likely next moves — always labeled as analytic speculation, never as confirmed intelligence.

Doctrine basis: MCWP 8-10 (Information in Marine Corps Operations), JP 3-04 (Information in Joint Operations), JP 3-13 (Information Operations), FM 3-13, MCDP 8 / MCWP 3-32. Use clear, readable USMC and joint IO/OIE vernacular (information environment, narrative, MISO, EW, CYBER, OPSEC, MILDEC, PA, MOE/MOP). Prefer plain language over dense jargon when both convey the same meaning.

HARD RULES — these are safety and integrity constraints:
1. Ground EVERY assessment in the OSINT items provided. Do not invent events, actors, or data not supported by the inputs or by well-established public reporting.
2. Do NOT fabricate classified intelligence: no fake SIGINT/HUMINT intercepts, no invented unit locations, no specific casualty/force figures unless they appear in the OSINT.
3. For threat entities, cite a REAL, verifiable public source (the provided OSINT link, or a well-known public reference such as MITRE ATT&CK, CISA, DOJ, a named think-tank/report). Put the publisher name in sourceLabel and a real URL in sourceUrl. If you cannot attribute, omit the entity.
4. Classification of this product is UNCLASSIFIED // OSINT. It is an AI-generated DRAFT that REQUIRES human analyst validation before any operational use.
5. Be calibrated. Use confidence levels honestly (confidence is an integer percentage from 0 to 100). Prefer "UNCERTAIN" IE condition unless the OSINT clearly supports "HOSTILE" or "PERMISSIVE".

Produce: an IE Running Estimate (situation, mission, CDR objective, adversary/friendly capabilities, assumptions, limitations, risks, recommendations), the AO threat-entity picture, and the hostile-narrative board (numeric reach/velocity/sentiment are best-estimate ranges — keep them plausible, not precise). Recommendations should focus on what to watch, collect, and verify — this is an adversary-activity estimate, not a friendly plan.

Also propose assessment measures grounded in this situation, as concise one-line statements:
- measuresOfEffectiveness (MOE — "are we achieving the desired effect in the IE?"): 4-6 strings, each stating the effect measured, the indicator/how it is observed, and a target/threshold (e.g., "Reduce hostile narrative share of monitored Taiwan-election content below 15% — SOCMINT sampling").
- measuresOfPerformance (MOP — "are the IO tasks being executed?"): 4-6 strings, each naming the IO capability and the task with a target (e.g., "MISO: >=12 counter-narrative products/day across approved platforms").
Make them specific to the threats and narratives identified — these are planning recommendations for the analyst to baseline and collect against.`;

// The catalogued military-library research corpus, appended once so the whole
// system block stays a stable prefix that the prompt cache can reuse.
const GROUNDED_SYSTEM_PROMPT = `${SYSTEM_PROMPT}\n\n${DOCTRINE_LIBRARY_PROMPT}`;

// Shared analysis core — used by POST (client-supplied items) and the cached GET.
async function runAnalysis(gccId: GCCId, items: FeedItemInput[]): Promise<Record<string, unknown> & { error?: string; status?: number }> {
  const config = GCC_CONFIGS[gccId];
  if (!config) return { error: "Invalid GCC", status: 400 };
  if (items.length === 0) return { error: "No OSINT items available for this AOR right now.", status: 422 };

  const osintBlock = items
    .map((it, i) => `[${i + 1}] ${it.title}${it.source ? ` (${it.source})` : ""}${it.published ? ` — ${it.published}` : ""}\n${(it.summary ?? "").slice(0, 400)}${it.link ? `\nSOURCE: ${it.link}` : ""}`)
    .join("\n\n");
  const userPrompt = `AREA OF RESPONSIBILITY: ${config.name} (${config.aor})
REGION: ${config.region}
COUNTRIES OF INTEREST: ${config.countries.join(", ")}
PROMINENT THREAT VECTORS: ${config.threatVectors.join(", ")}

LIVE OSINT (${items.length} items ingested from public feeds — this is your evidence base):

${osintBlock}

Produce the OIE assessment for this AOR, grounded strictly in the OSINT above. Tie threat entities and narratives to specific items where possible. Mark all numeric narrative metrics as estimates.`;

  try {
    const client = new Anthropic();
    const stream = client.messages.stream({
      model: AI_MODEL,
      max_tokens: 32000,
      thinking: { type: "adaptive" },
      output_config: { effort: aiEffort("analyze"), format: { type: "json_schema", schema: ASSESSMENT_SCHEMA } },
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
      gcc: gccId, aor: config.aor, generatedAt: new Date().toISOString(), model: message.model,
      classification: "UNCLASSIFIED // OSINT",
      provenance: "AI-DRAFT — generated by Claude from live OSINT. Requires human analyst validation before operational use.",
      sourceCount: items.length, assessment,
    };
  } catch (err) {
    const status = err instanceof Anthropic.AuthenticationError ? 401 : err instanceof Anthropic.RateLimitError ? 429 : err instanceof Anthropic.APIError ? err.status ?? 502 : 500;
    return { error: err instanceof Anthropic.APIError ? err.message : "AI engine error", status };
  }
}

async function fetchAORItems(gccId: GCCId, origin: string): Promise<FeedItemInput[]> {
  try {
    const r = await fetch(`${origin}/api/feeds?gcc=${gccId}&ioOnly=true`, { signal: AbortSignal.timeout(20000) });
    if (r.ok) { const j = await r.json(); return (j.items ?? []).slice(0, 40).map((i: FeedItemInput) => ({ title: i.title, summary: i.summary, source: i.source, link: i.link, published: i.published })); }
  } catch { /* ignore */ }
  return [];
}

// Current ET assessment slot — the running estimate is posted at 0600 / 1200 /
// 1800 ET (warmed by /api/infsum-cron at those times).
function currentSlotET(): string {
  const hourStr = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", hour12: false }).format(new Date());
  const h = parseInt(hourStr, 10);
  return h >= 18 ? "1800" : h >= 12 ? "1200" : h >= 6 ? "0600" : "0000";
}

// Cached Running-Estimate assessment, posted 3x daily (0600/1200/1800 ET).
// `?force=1` regenerates from the latest sources.
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
  // Throw on error so failures are NOT cached (unstable_cache only caches
  // resolved values); the cache key carries a version segment to flush old
  // entries when the schema/logic changes.
  const gen = async () => {
    const r = await runAnalysis(gccId, await fetchAORItems(gccId, origin));
    if (r.error) { const e = new Error(String(r.error)) as Error & { status?: number }; e.status = (r.status as number) ?? 502; throw e; }
    // Append to the immutable history on every fresh generation — this closure
    // runs only on a cache miss or `?force=1`, so the archive gets one row per
    // slot and a forced re-run cannot overwrite what was claimed earlier.
    // Best-effort by contract: recordSnapshot never throws.
    await recordSnapshot({
      gcc: gccId,
      product: "analyze",
      day: dayET,
      slot,
      model: typeof r.model === "string" ? r.model : null,
      effort: aiEffort("analyze"),
      payload: r,
      ...deriveMetrics(
        (r.assessment ?? {}) as Parameters<typeof deriveMetrics>[0],
        typeof r.sourceCount === "number" ? r.sourceCount : null
      ),
    });
    return r;
  };
  try {
    const data = force
      ? await gen()
      : await unstable_cache(gen, ["analyze", "v3", gccId, dayET, slot], { revalidate: 21600, tags: ["analyze", `analyze-${gccId}`] })();
    return NextResponse.json({ ...data, day: dayET, slot });
  } catch (e) {
    const err = e as Error & { status?: number };
    return NextResponse.json({ error: err.message ?? "AI engine error" }, { status: err.status ?? 502 });
  }
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI engine not configured — ANTHROPIC_API_KEY is not set." },
      { status: 503 }
    );
  }

  let body: { gcc?: GCCId; feedItems?: FeedItemInput[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const gccId = (body.gcc ?? "INDOPACOM") as GCCId;
  const config = GCC_CONFIGS[gccId];
  if (!config) return NextResponse.json({ error: "Invalid GCC" }, { status: 400 });

  const items = (body.feedItems ?? []).slice(0, 40);
  if (items.length === 0) {
    return NextResponse.json(
      { error: "No OSINT items supplied. Load the live feed for this AOR first, then generate." },
      { status: 422 }
    );
  }

  const osintBlock = items
    .map(
      (it, i) =>
        `[${i + 1}] ${it.title}${it.source ? ` (${it.source})` : ""}${it.published ? ` — ${it.published}` : ""}\n${(it.summary ?? "").slice(0, 400)}${it.link ? `\nSOURCE: ${it.link}` : ""}`
    )
    .join("\n\n");

  const userPrompt = `AREA OF RESPONSIBILITY: ${config.name} (${config.aor})
REGION: ${config.region}
COUNTRIES OF INTEREST: ${config.countries.join(", ")}
PROMINENT THREAT VECTORS: ${config.threatVectors.join(", ")}

LIVE OSINT (${items.length} items ingested from public feeds — this is your evidence base):

${osintBlock}

Produce the OIE assessment for this AOR, grounded strictly in the OSINT above. Tie threat entities and narratives to specific items where possible. Mark all numeric narrative metrics as estimates.`;

  const client = new Anthropic();

  try {
    const stream = client.messages.stream({
      model: AI_MODEL,
      max_tokens: 32000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: aiEffort("analyze"),
        format: { type: "json_schema", schema: ASSESSMENT_SCHEMA },
      },
      system: cachedSystem(GROUNDED_SYSTEM_PROMPT),
      messages: [{ role: "user", content: userPrompt }],
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      return NextResponse.json(
        { error: "The model declined this request. Adjust the OSINT inputs and retry." },
        { status: 422 }
      );
    }

    const textBlock = message.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "";
    let assessment;
    try {
      assessment = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Model returned unparseable output. Retry." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      gcc: gccId,
      aor: config.aor,
      generatedAt: new Date().toISOString(),
      model: message.model,
      classification: "UNCLASSIFIED // OSINT",
      provenance: "AI-DRAFT — generated by Claude from live OSINT. Requires human analyst validation before operational use.",
      sourceCount: items.length,
      effort: aiEffort("analyze"),
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
        // Cache counters: the system block (doctrine library included) is a
        // stable cacheable prefix, so a warm run should show cache_read >> input.
        cache_creation_input_tokens: message.usage.cache_creation_input_tokens,
        cache_read_input_tokens: message.usage.cache_read_input_tokens,
      },
      assessment,
    });
  } catch (err) {
    const status =
      err instanceof Anthropic.AuthenticationError
        ? 401
        : err instanceof Anthropic.RateLimitError
          ? 429
          : err instanceof Anthropic.APIError
            ? err.status ?? 502
            : 500;
    const msg = err instanceof Anthropic.APIError ? err.message : "AI engine error";
    return NextResponse.json({ error: msg }, { status });
  }
}
