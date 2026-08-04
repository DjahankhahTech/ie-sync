import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { GCC_CONFIGS, type GCCId } from "@/lib/gcc-config";
import { AI_MODEL, aiEffort, cachedSystem } from "@/lib/ai-config";
import { DOCTRINE_LIBRARY_PROMPT } from "@/lib/military-library";

// COA / Annex I / ITCO planning engine. Takes a planner's fill-in-the-blank
// worksheet + the available IO forces + the AO threat picture and synthesizes
// ONE detailed, executable Course of Action plus a complete Annex I
// (Information) and Information Tasking & Coordination Order (ITCO).
//
// UNCLASSIFIED // OSINT — AI DRAFT, requires human analyst validation.

export const maxDuration = 300;

interface ForceInput { capability: string; available: boolean; units?: string }
interface ThreatInput { designation: string; activity?: string }
interface NarrativeInput { title: string }
interface PlanRequest {
  gcc?: GCCId;
  worksheet?: {
    operationName?: string;
    mission?: string;
    intent?: string;
    priority?: string;
    audiences?: string[];
    effects?: string[];
    messages?: string[];
    timing?: string;
    constraints?: string;
  };
  forces?: ForceInput[];
  threats?: ThreatInput[];
  narratives?: NarrativeInput[];
}

const taskSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    capability: { type: "string" },
    task: { type: "string" },
    unit: { type: "string" },
    nlt: { type: "string" },
    authority: { type: "string" },
    moeSupported: { type: "string" },
  },
  required: ["capability", "task", "unit", "nlt", "authority", "moeSupported"],
} as const;

const PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    coa: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: "string" },
        objective: { type: "string" },
        targetAudience: { type: "string" },
        capabilities: { type: "array", items: { type: "string" } },
        successProbability: { type: "integer" },
        risk: { type: "string", enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"] },
        estimatedEffect: { type: "string" },
        resourceRequirement: { type: "string" },
        phases: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              timing: { type: "string" },
              tasks: { type: "array", items: taskSchema },
            },
            required: ["name", "timing", "tasks"],
          },
        },
        measuresOfEffectiveness: { type: "array", items: { type: "string" } },
        measuresOfPerformance: { type: "array", items: { type: "string" } },
        assumptions: { type: "array", items: { type: "string" } },
        risksMitigations: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: { risk: { type: "string" }, mitigation: { type: "string" } },
            required: ["risk", "mitigation"],
          },
        },
        authorities: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: { action: { type: "string" }, authority: { type: "string" }, status: { type: "string" } },
            required: ["action", "authority", "status"],
          },
        },
      },
      required: ["name", "objective", "targetAudience", "capabilities", "successProbability", "risk", "estimatedEffect", "resourceRequirement", "phases", "measuresOfEffectiveness", "measuresOfPerformance", "assumptions", "risksMitigations", "authorities"],
    },
    annexI: { type: "string" },
    itco: { type: "string" },
  },
  required: ["coa", "annexI", "itco"],
} as const;

const SYSTEM_PROMPT = `You are an Operations in the Information Environment (OIE) planning assistant supporting a Marine Corps Information Officer / MIG planning cell (and joint partners). A planner has given you a planning worksheet, the forces available across the range of information-related capabilities (IRCs), and the current AO threat picture. Produce a single detailed, executable Course of Action (COA) and the two operational products that flow from it: a complete ANNEX I (INFORMATION) to the OPORD, and an INFORMATION TASKING AND COORDINATING ORDER (ITCO) aligned to the MCWP 8-10 Information Tasking and Coordinating Cycle (ITCC).

Doctrine: MCWP 8-10 (Information in Marine Corps Operations), JP 3-04 (Information in Joint Operations), JP 3-13, FM 3-13, MCDP 8 / MCWP 3-32, JP 5-0 (planning). Use correct USMC and joint OIE vernacular, MAGTF/MIG role language where appropriate, and the five-paragraph annex format (Situation / Mission / Execution / Sustainment / Command & Signal).

HARD RULES:
1. Use ONLY the information-related capabilities (IRCs) the planner marked AVAILABLE, and task the SPECIFIC units/platforms they assigned to each. Do not invent forces that were not provided as available.
2. Tie tasks to the named threat entities and hostile narratives in the AO. Reference them explicitly.
3. Build the COA from the planner's worksheet (mission, intent, target audiences, desired effects, key messages, timing, constraints). Honor stated constraints.
4. Be realistic about owners and authorities: MISO products need PSYOP approval authority (USSOCOM); cyber actions need Title 10/50 legal review (CYBERCOM DCO); EW needs JFC-IMC deconfliction (EMR); PA needs PAO release authority. Put concrete NLT timings (H+N) on tasks.
5. Phase the COA (e.g., Shape / Disrupt / Exploit / Assess or H-hour sequence). Each task: capability, task, owning unit, NLT, authority, MOE supported.
6. Classification UNCLASSIFIED // OSINT. Mark the products as AI-GENERATED DRAFT requiring human analyst validation before commander briefing or execution.
7. annexI and itco must be complete, properly formatted plain-text operational documents (multi-paragraph), consistent with the COA. Include classification headers/footers and an ACKNOWLEDGE // SIGNED block.

Do not fabricate classified intelligence. Keep numeric estimates honest.`;

// The catalogued military-library research corpus, appended once so the whole
// system block stays a stable prefix that the prompt cache can reuse.
const GROUNDED_SYSTEM_PROMPT = `${SYSTEM_PROMPT}\n\n${DOCTRINE_LIBRARY_PROMPT}`;

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI engine not configured — ANTHROPIC_API_KEY is not set." }, { status: 503 });
  }
  let body: PlanRequest;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const gccId = (body.gcc ?? "INDOPACOM") as GCCId;
  const config = GCC_CONFIGS[gccId];
  if (!config) return NextResponse.json({ error: "Invalid GCC" }, { status: 400 });

  const w = body.worksheet ?? {};
  const availableForces = (body.forces ?? []).filter((f) => f.available);
  if (!w.mission && availableForces.length === 0) {
    return NextResponse.json(
      { error: "Provide at least a mission and mark some available forces before generating." },
      { status: 422 }
    );
  }

  const list = (arr?: string[]) => (arr && arr.length ? arr.map((x) => `  - ${x}`).join("\n") : "  (none specified)");
  const forcesBlock = availableForces.length
    ? availableForces.map((f) => `  - ${f.capability}${f.units ? `: ${f.units}` : " (units TBD)"}`).join("\n")
    : "  (none marked available)";
  const threatsBlock = (body.threats ?? []).length
    ? (body.threats ?? []).map((t) => `  - ${t.designation}${t.activity ? `: ${t.activity}` : ""}`).join("\n")
    : "  (no threat entities loaded — run the AI assessment first for AO-specific threats)";
  const narrBlock = (body.narratives ?? []).length
    ? (body.narratives ?? []).map((n) => `  - "${n.title}"`).join("\n")
    : "  (none loaded)";

  const userPrompt = `AREA OF RESPONSIBILITY: ${config.name} (${config.aor})

PLANNING WORKSHEET
Operation name: ${w.operationName || "(unnamed)"}
IO priority: ${w.priority || "IE3"}
Mission: ${w.mission || "(not specified)"}
Commander's intent: ${w.intent || "(not specified)"}
Target audiences:
${list(w.audiences)}
Desired effects:
${list(w.effects)}
Key messages / themes:
${list(w.messages)}
Timing & phasing notes: ${w.timing || "(not specified)"}
Constraints & authorities notes: ${w.constraints || "(not specified)"}

AVAILABLE FORCES ACROSS THE RANGE OF IO (task only these):
${forcesBlock}

AO THREAT ENTITIES (tie tasks to these):
${threatsBlock}

AO HOSTILE NARRATIVES (counter these):
${narrBlock}

Produce the detailed COA, the complete Annex I (Information), and the ITCO.`;

  const client = new Anthropic();
  try {
    const stream = client.messages.stream({
      model: AI_MODEL,
      max_tokens: 40000,
      thinking: { type: "adaptive" },
      output_config: { effort: aiEffort("plan"), format: { type: "json_schema", schema: PLAN_SCHEMA } },
      system: cachedSystem(GROUNDED_SYSTEM_PROMPT),
      messages: [{ role: "user", content: userPrompt }],
    });
    const message = await stream.finalMessage();
    if (message.stop_reason === "refusal") {
      return NextResponse.json({ error: "The model declined this request. Adjust the worksheet and retry." }, { status: 422 });
    }
    const textBlock = message.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "";
    let plan;
    try { plan = JSON.parse(raw); } catch { return NextResponse.json({ error: "Model returned unparseable output. Retry." }, { status: 502 }); }

    return NextResponse.json({
      gcc: gccId,
      generatedAt: new Date().toISOString(),
      model: message.model,
      classification: "UNCLASSIFIED // OSINT",
      provenance: "AI-DRAFT — generated by Claude from the planner worksheet, available forces, and AO threat picture. Requires human analyst validation before commander briefing or execution.",
      usage: { input_tokens: message.usage.input_tokens, output_tokens: message.usage.output_tokens },
      plan,
    });
  } catch (err) {
    const status = err instanceof Anthropic.AuthenticationError ? 401 : err instanceof Anthropic.RateLimitError ? 429 : err instanceof Anthropic.APIError ? err.status ?? 502 : 500;
    const msg = err instanceof Anthropic.APIError ? err.message : "AI engine error";
    return NextResponse.json({ error: msg }, { status });
  }
}
