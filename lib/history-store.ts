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

/**
 * What a snapshot can carry. Every field is optional because the three products
 * measure genuinely different things: the typed columns are assessment-shaped
 * (narrative reach, sentiment, threat entities) and mean nothing for SIGMAN or
 * INFSUM, which leave them null and populate `metrics` instead. Writing zeros
 * into columns a product does not measure would read as data later.
 */
export interface SnapshotFacts extends Partial<SnapshotMetrics> {
  /** Product-specific numbers that do not fit the assessment-shaped columns. */
  metrics?: Record<string, unknown>;
}

export interface SnapshotInput extends SnapshotFacts {
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
  /** Product-specific numbers; {} for products that record none. */
  metrics: Record<string, unknown>;
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
      // Added after the table shipped, so it must be an ALTER rather than part
      // of the CREATE above — CREATE TABLE IF NOT EXISTS is a no-op against an
      // existing table and would silently skip the new column.
      await sql`
        ALTER TABLE ie_snapshot
          ADD COLUMN IF NOT EXISTS metrics JSONB NOT NULL DEFAULT '{}'::JSONB
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

interface SigmanLike {
  overallExposure?: number;
  posture?: string;
  items?: Array<{ riskLevel?: string; category?: string; exposureScore?: number }>;
}

/**
 * SIGMAN measures friendly-force exposure in the open-source picture, which has
 * no overlap with the assessment's narrative metrics — so everything lands in
 * `metrics` and the assessment-shaped columns stay null.
 *
 * `posture` and `overallExposure` are the model's own aggregate judgement;
 * the risk-level counts are computed here so a trend can be built without
 * re-parsing every stored payload.
 */
export function deriveSigmanMetrics(sigman: SigmanLike, sourceCount: number | null): SnapshotFacts {
  const items = Array.isArray(sigman?.items) ? sigman.items : [];
  const byRisk = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  let scoreSum = 0;
  let scored = 0;

  for (const it of items) {
    const risk = typeof it?.riskLevel === "string" ? it.riskLevel.toUpperCase() : "";
    if (risk in byRisk) byRisk[risk as keyof typeof byRisk] += 1;
    if (typeof it?.exposureScore === "number" && Number.isFinite(it.exposureScore)) {
      scoreSum += it.exposureScore;
      scored += 1;
    }
  }

  return {
    sourceCount,
    metrics: {
      overallExposure:
        typeof sigman?.overallExposure === "number" && Number.isFinite(sigman.overallExposure)
          ? sigman.overallExposure
          : null,
      posture: typeof sigman?.posture === "string" ? sigman.posture : null,
      items: items.length,
      critical: byRisk.CRITICAL,
      high: byRisk.HIGH,
      medium: byRisk.MEDIUM,
      low: byRisk.LOW,
      meanExposureScore: scored > 0 ? round1(scoreSum / scored) : null,
    },
  };
}

interface InfsumLike {
  keyDevelopments?: unknown[];
  ioThreatActivity?: unknown[];
  narrativeTrends?: unknown[];
  watchItems?: unknown[];
}

/**
 * INFSUM is entirely prose — there is no numeric judgement in it to trend. The
 * only honest quantities are section volumes, which say how much the watch
 * analyst had to report, not how severe it was. Recorded so the full payload is
 * archived and searchable; not charted, because section counts are not a signal.
 */
export function deriveInfsumMetrics(infsum: InfsumLike, sourceCount: number | null): SnapshotFacts {
  const len = (v: unknown) => (Array.isArray(v) ? v.length : 0);
  return {
    sourceCount,
    metrics: {
      keyDevelopments: len(infsum?.keyDevelopments),
      ioThreatActivity: len(infsum?.ioThreatActivity),
      narrativeTrends: len(infsum?.narrativeTrends),
      watchItems: len(infsum?.watchItems),
    },
  };
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
        total_threads, threat_entities, payload, metrics
      ) VALUES (
        ${input.gcc}, ${input.product}, ${input.day}, ${input.slot},
        ${input.model}, ${input.effort}, ${input.sourceCount ?? null}, ${input.ieCondition ?? null},
        ${input.adversarialReachShare ?? null}, ${input.meanSentiment ?? null}, ${input.adversarialThreads ?? 0},
        ${input.totalThreads ?? 0}, ${input.threatEntities ?? 0}, ${JSON.stringify(input.payload)},
        ${JSON.stringify(input.metrics ?? {})}
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
        threat_entities,
        metrics
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
      metrics: (r.metrics ?? {}) as Record<string, unknown>,
    }));
  } catch (err) {
    console.error("[history] series read failed", {
      gcc: opts.gcc,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}
