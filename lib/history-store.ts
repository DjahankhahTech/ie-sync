/**
 * Append-only history of generated AI products.
 *
 * IE-SYNC generates a Running Estimate three times a day per CCMD and, until
 * now, threw every one of them away — `unstable_cache` expires in six hours and
 * is wiped on each deploy. Nothing could be trended, and no claim the tool made
 * could ever be scored against what actually happened.
 *
 * This module keeps one immutable row per (gcc, product, day, slot). The first
 * write for a slot wins: a forced regeneration (`?force=1`) does NOT overwrite
 * the snapshot already on record, so the archive reflects what the tool actually
 * claimed at the time rather than a later, better-informed rewrite. That
 * property is what makes the history usable as a track record.
 *
 * Storage is Neon Postgres (`DATABASE_URL`), provisioned through the Vercel
 * Marketplace. The whole module degrades to a no-op when that variable is
 * absent, so the app builds and runs unchanged without a database — history
 * simply stays empty and the UI says so. Recording must never break a request:
 * every write is best-effort and swallows its own errors.
 */

import { neon } from "@neondatabase/serverless";

// ── Types ────────────────────────────────────────────────────────────────────

export type ProductKind = "analyze" | "sigman" | "infsum";

/** Metrics derived from an assessment, flattened for trending. */
export interface SnapshotMetrics {
  ieCondition: string | null;
  /** Share of total narrative reach carried by adversarial threads, 0-100. */
  adversarialReachShare: number | null;
  /** Mean sentiment across all threads, scaled from the model's -1..1 to -100..100. */
  meanSentiment: number | null;
  /** Count of threads flagged adversarial — the closest honest analogue to "adversary IO actions". */
  adversarialThreads: number;
  totalThreads: number;
  threatEntities: number;
  sourceCount: number | null;
}

export interface SnapshotInput extends SnapshotMetrics {
  gcc: string;
  product: ProductKind;
  day: string;   // YYYY-MM-DD, ET
  slot: string;  // "0600" | "1200" | "1800" | "0000"
  model: string | null;
  effort: string | null;
  payload: unknown;
}

export interface SeriesPoint {
  day: string;
  slot: string;
  capturedAt: string;
  ieCondition: string | null;
  adversarialReachShare: number | null;
  meanSentiment: number | null;
  adversarialThreads: number;
  totalThreads: number;
  threatEntities: number;
}

// ── Connection (lazy) ────────────────────────────────────────────────────────

// `neon()` throws when DATABASE_URL is unset, and Next evaluates top-level
// module code during `next build` — so this must stay lazy or an unprovisioned
// deploy fails to build.
type Sql = ReturnType<typeof neon>;
let _sql: Sql | null = null;

// The neon template tag is typed as a union covering array-mode and
// full-result-mode queries. These are plain row queries, so narrow once here
// rather than at every call site.
type Row = Record<string, unknown>;

export function historyEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function getSql(): Sql | null {
  if (!historyEnabled()) return null;
  if (!_sql) _sql = neon(process.env.DATABASE_URL as string);
  return _sql;
}

// ── Schema ───────────────────────────────────────────────────────────────────

let schemaReady: Promise<void> | null = null;

/** Idempotent; the promise is memoised so concurrent callers share one round trip. */
function ensureSchema(sql: Sql): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS ie_snapshot (
          id                      BIGSERIAL PRIMARY KEY,
          gcc                     TEXT        NOT NULL,
          product                 TEXT        NOT NULL,
          day                     DATE        NOT NULL,
          slot                    TEXT        NOT NULL,
          captured_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          model                   TEXT,
          effort                  TEXT,
          source_count            INTEGER,
          ie_condition            TEXT,
          adversarial_reach_share REAL,
          mean_sentiment          REAL,
          adversarial_threads     INTEGER     NOT NULL DEFAULT 0,
          total_threads           INTEGER     NOT NULL DEFAULT 0,
          threat_entities         INTEGER     NOT NULL DEFAULT 0,
          payload                 JSONB       NOT NULL,
          UNIQUE (gcc, product, day, slot)
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS ie_snapshot_series_idx
          ON ie_snapshot (gcc, product, day, slot)
      `;
    })().catch((err) => {
      // Let the next call retry rather than caching a failed migration.
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

// ── Derivation ───────────────────────────────────────────────────────────────

interface NarrativeThread {
  sentiment?: number;
  reach?: number;
  adversarial?: boolean;
}

interface AssessmentLike {
  ieCondition?: string;
  narrativeThreads?: NarrativeThread[];
  threatEntities?: unknown[];
}

/**
 * Reduce an assessment to the handful of numbers worth trending.
 *
 * Reach share is used rather than raw reach because the model emits reach as a
 * best-estimate order of magnitude; the ratio between adversarial and total is
 * far more stable across runs than either absolute figure.
 */
export function deriveMetrics(assessment: AssessmentLike, sourceCount: number | null): SnapshotMetrics {
  const threads = Array.isArray(assessment?.narrativeThreads) ? assessment.narrativeThreads : [];
  const numeric = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

  let totalReach = 0;
  let adversarialReach = 0;
  let sentimentSum = 0;
  let sentimentCount = 0;
  let adversarialThreads = 0;

  for (const t of threads) {
    const reach = numeric(t?.reach) ?? 0;
    totalReach += reach;
    if (t?.adversarial) {
      adversarialThreads += 1;
      adversarialReach += reach;
    }
    const s = numeric(t?.sentiment);
    if (s !== null) {
      sentimentSum += s;
      sentimentCount += 1;
    }
  }

  return {
    ieCondition: typeof assessment?.ieCondition === "string" ? assessment.ieCondition : null,
    adversarialReachShare: totalReach > 0 ? round1((adversarialReach / totalReach) * 100) : null,
    // The model emits sentiment on -1..1; scale to -100..100 so it shares an
    // axis with the percentage series.
    meanSentiment: sentimentCount > 0 ? round1((sentimentSum / sentimentCount) * 100) : null,
    adversarialThreads,
    totalThreads: threads.length,
    threatEntities: Array.isArray(assessment?.threatEntities) ? assessment.threatEntities.length : 0,
    sourceCount,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ── Write ────────────────────────────────────────────────────────────────────

/**
 * Best-effort append. Never throws: a history failure must not fail the
 * assessment the analyst actually asked for.
 *
 * Returns true when a new row was written, false when the slot was already on
 * record or history is disabled.
 */
export async function recordSnapshot(input: SnapshotInput): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;

  try {
    await ensureSchema(sql);
    const rows = (await sql`
      INSERT INTO ie_snapshot (
        gcc, product, day, slot, model, effort, source_count, ie_condition,
        adversarial_reach_share, mean_sentiment, adversarial_threads,
        total_threads, threat_entities, payload
      ) VALUES (
        ${input.gcc}, ${input.product}, ${input.day}, ${input.slot},
        ${input.model}, ${input.effort}, ${input.sourceCount}, ${input.ieCondition},
        ${input.adversarialReachShare}, ${input.meanSentiment}, ${input.adversarialThreads},
        ${input.totalThreads}, ${input.threatEntities}, ${JSON.stringify(input.payload)}
      )
      ON CONFLICT (gcc, product, day, slot) DO NOTHING
      RETURNING id
    `) as Row[];
    return rows.length > 0;
  } catch (err) {
    console.error("[history] snapshot write failed", {
      gcc: input.gcc,
      product: input.product,
      day: input.day,
      slot: input.slot,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

// ── Read ─────────────────────────────────────────────────────────────────────

/**
 * Trend series for a CCMD, oldest first. Returns [] when history is disabled or
 * nothing has been recorded yet — the caller is expected to render an honest
 * empty state rather than substitute placeholder data.
 */
export async function readSeries(opts: {
  gcc: string;
  product?: ProductKind;
  days?: number;
}): Promise<SeriesPoint[]> {
  const sql = getSql();
  if (!sql) return [];

  const product = opts.product ?? "analyze";
  const days = Math.min(Math.max(opts.days ?? 30, 1), 365);

  try {
    await ensureSchema(sql);
    const rows = (await sql`
      SELECT
        TO_CHAR(day, 'YYYY-MM-DD') AS day,
        slot,
        captured_at,
        ie_condition,
        adversarial_reach_share,
        mean_sentiment,
        adversarial_threads,
        total_threads,
        threat_entities
      FROM ie_snapshot
      WHERE gcc = ${opts.gcc}
        AND product = ${product}
        AND day >= CURRENT_DATE - ${days}::INTEGER
      ORDER BY day ASC, slot ASC
    `) as Row[];

    return rows.map((r) => ({
      day: String(r.day),
      slot: String(r.slot),
      capturedAt: new Date(r.captured_at as string).toISOString(),
      ieCondition: r.ie_condition === null ? null : String(r.ie_condition),
      adversarialReachShare: r.adversarial_reach_share === null ? null : Number(r.adversarial_reach_share),
      meanSentiment: r.mean_sentiment === null ? null : Number(r.mean_sentiment),
      adversarialThreads: Number(r.adversarial_threads),
      totalThreads: Number(r.total_threads),
      threatEntities: Number(r.threat_entities),
    }));
  } catch (err) {
    console.error("[history] series read failed", {
      gcc: opts.gcc,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}
