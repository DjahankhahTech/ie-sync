/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AI ENGINE CONFIGURATION — model, reasoning effort, caching
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Every Claude call in the app routes its model and `effort` through here so the
 * latency/cost/depth tradeoff is set in one place and tunable per environment
 * without a code change.
 *
 * On `effort`: it controls how much the model reasons and acts before
 * answering, and it is the dominant lever on how long an assessment takes.
 * These routes previously ran every product at "high"; the assessment products
 * now run at "medium" and the short drafting products at "low", which is what
 * makes them return quickly. Raise a single task with its env var if its output
 * quality suffers:
 *
 *   AI_EFFORT=high                  override every task
 *   AI_EFFORT_ANALYZE=high          override one task
 *   AI_MODEL=claude-opus-4-8        override the model
 *
 * Valid effort values: low | medium | high | xhigh | max
 */

/** Reasoning-effort levels supported by the Opus 4.x / Claude 5 families. */
export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

const VALID_EFFORTS: readonly Effort[] = ["low", "medium", "high", "xhigh", "max"];

/** AI products, keyed by the route that produces them. */
export type AITask = "analyze" | "plan" | "sigman" | "infsum" | "worksheet";

export const AI_MODEL = process.env.AI_MODEL ?? "claude-opus-4-8";

/**
 * Per-task effort defaults.
 *
 * medium — multi-section assessments where the reasoning carries real weight
 *          (running estimate, COA/Annex I plan, SIGMAN exposure).
 * low    — short structured drafts the analyst edits anyway (daily INFSUM,
 *          pre-filled planning worksheet).
 */
const DEFAULT_EFFORT: Record<AITask, Effort> = {
  analyze: "medium",
  plan: "medium",
  sigman: "medium",
  infsum: "low",
  worksheet: "low",
};

const ENV_KEY: Record<AITask, string> = {
  analyze: "AI_EFFORT_ANALYZE",
  plan: "AI_EFFORT_PLAN",
  sigman: "AI_EFFORT_SIGMAN",
  infsum: "AI_EFFORT_INFSUM",
  worksheet: "AI_EFFORT_WORKSHEET",
};

function parseEffort(value: string | undefined): Effort | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  return (VALID_EFFORTS as readonly string[]).includes(v) ? (v as Effort) : null;
}

/**
 * Effort for a task: per-task env var, then the global override, then the
 * default. An unrecognised env value is ignored rather than sent to the API,
 * which would fail the request.
 */
export function aiEffort(task: AITask): Effort {
  return parseEffort(process.env[ENV_KEY[task]]) ?? parseEffort(process.env.AI_EFFORT) ?? DEFAULT_EFFORT[task];
}

/**
 * System prompt as a cacheable block. These prompts are static per route and
 * include the doctrine reference library, so they sit well above the prompt-cache
 * minimum — caching them cuts time-to-first-token on repeat runs (the 3x-daily
 * cron warm-ups and per-AOR regenerations all share the same prefix).
 */
export function cachedSystem(prompt: string) {
  return [{ type: "text" as const, text: prompt, cache_control: { type: "ephemeral" as const } }];
}
