import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { GCC_CONFIGS, type GCCId } from "@/lib/gcc-config";

// Drafts the IO Planner worksheet (mission, intent, audiences, effects,
// messages, timing, constraints) + suggested available forces from the latest
// OSINT and AO threat picture. Optional `refinement` lets the planner steer the
// draft ("focus on counter-disinformation", "emphasize Taiwan", etc.).
// UNCLASSIFIED // OSINT — AI DRAFT, fully editable by the planner afterward.

export const maxDuration = 300;

// Must match IRC_ROSTER labels in components/io-planner/IOPlanner.tsx exactly.
const IRC_LABELS = [
  "MISO / PSYOP",
  "Electronic Warfare (EW)",
  "Cyberspace Operations",
  "Public Affairs (PA)",
  "Military Deception (MILDEC)",
  "Operations Security (OPSEC)",
  "Civil-Military Operations (CMO)",
  "Space Operations",
  "Intelligence / ISR",
  "Key Leader Engagement (KLE)",
  "Special Technical Operations (STO)",
] as const;

interface FeedItemInput { title: string; summary?: string; source?: string; published?: string }

const WORKSHEET_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    operationName: { type: "string" },
    mission: { type: "string" },
    intent: { type: "string" },
    priority: { type: "string", enum: ["IE1", "IE2", "IE3"] },
    audiences: { type: "array", items: { type: "string" } },
    effects: { type: "array", items: { type: "string" } },
    messages: { type: "array", items: { type: "string" } },
    timing: { type: "string" },
    constraints: { type: "string" },
    forces: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          capability: { type: "string", enum: IRC_LABELS as unknown as string[] },
          available: { type: "boolean" },
          units: { type: "string" },
        },
        required: ["capability", "available", "units"],
      },
    },
  },
  required: ["operationName", "mission", "intent", "priority", "audiences", "effects", "messages", "timing", "constraints", "forces"],
} as const;

const SYSTEM_PROMPT = `You are an OIE (Operations in the Information Environment) planning assistant. Draft a complete IO planning worksheet for a US combatant command IO cell, derived from the latest OSINT and the AO threat picture, so a planner can review, refine, and turn it into a COA.

Doctrine: JP 3-04, JP 3-13, FM 3-13, MCWP 3-32. Use proper OIE vernacular.

Rules:
- Ground every field in the supplied OSINT / threats / narratives. Do not invent events or actors not supported by the inputs.
- mission: a clear who/what/when/where/why IO mission statement. intent: purpose, key tasks, IE end state.
- audiences/effects/messages: concise, realistic, specific to this AO (3-6 items each).
- For "forces": list the information-related capabilities (IRCs) that would plausibly be employed for this situation. Set available:true for the ones the mission needs and provide a realistic example unit/platform in "units" (e.g., "POG MISO Co; COMMANDO SOLO (EC-130J)"). Set available:false (units "") for IRCs not central to this plan. Use ONLY the provided capability labels verbatim. Include every label once.
- If the planner provided a refinement instruction, follow it.
- Classification UNCLASSIFIED // OSINT. This is an editable AI draft — keep entries crisp.`;

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI engine not configured — ANTHROPIC_API_KEY is not set." }, { status: 503 });
  }
  let body: { gcc?: GCCId; feedItems?: FeedItemInput[]; threats?: { designation: string; activity?: string }[]; narratives?: { title: string }[]; refinement?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const gccId = (body.gcc ?? "INDOPACOM") as GCCId;
  const config = GCC_CONFIGS[gccId];
  if (!config) return NextResponse.json({ error: "Invalid GCC" }, { status: 400 });

  const items = (body.feedItems ?? []).slice(0, 40);
  if (items.length === 0) {
    return NextResponse.json({ error: "No OSINT items available. Load the live feed for this AOR first." }, { status: 422 });
  }

  const osint = items.map((it, i) => `[${i + 1}] ${it.title}${it.source ? ` (${it.source})` : ""}\n${(it.summary ?? "").slice(0, 300)}`).join("\n\n");
  const threats = (body.threats ?? []).map((t) => `  - ${t.designation}${t.activity ? `: ${t.activity}` : ""}`).join("\n") || "  (none loaded)";
  const narratives = (body.narratives ?? []).map((n) => `  - "${n.title}"`).join("\n") || "  (none loaded)";

  const userPrompt = `AOR: ${config.name} (${config.aor})
COUNTRIES: ${config.countries.join(", ")}
IRC CAPABILITY LABELS (use these verbatim for "forces"): ${IRC_LABELS.join("; ")}

${body.refinement ? `PLANNER REFINEMENT INSTRUCTION: ${body.refinement}\n\n` : ""}LATEST OSINT (${items.length} items):
${osint}

AO THREAT ENTITIES:
${threats}

AO HOSTILE NARRATIVES:
${narratives}

Draft the IO planning worksheet now.`;

  const client = new Anthropic();
  try {
    const stream = client.messages.stream({
      model: "claude-opus-4-8",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "high", format: { type: "json_schema", schema: WORKSHEET_SCHEMA } },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });
    const message = await stream.finalMessage();
    if (message.stop_reason === "refusal") {
      return NextResponse.json({ error: "The model declined this request. Adjust inputs and retry." }, { status: 422 });
    }
    const textBlock = message.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "";
    let worksheet;
    try { worksheet = JSON.parse(raw); } catch { return NextResponse.json({ error: "Model returned unparseable output. Retry." }, { status: 502 }); }

    return NextResponse.json({
      gcc: gccId,
      generatedAt: new Date().toISOString(),
      model: message.model,
      classification: "UNCLASSIFIED // OSINT",
      sourceCount: items.length,
      worksheet,
    });
  } catch (err) {
    const status = err instanceof Anthropic.AuthenticationError ? 401 : err instanceof Anthropic.RateLimitError ? 429 : err instanceof Anthropic.APIError ? err.status ?? 502 : 500;
    const msg = err instanceof Anthropic.APIError ? err.message : "AI engine error";
    return NextResponse.json({ error: msg }, { status });
  }
}
