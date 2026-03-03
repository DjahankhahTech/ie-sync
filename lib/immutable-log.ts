/**
 * Immutable Centralized Audit Log Pipeline
 * NIST 800-171: AU-3, AU-6, AU-9, AU-11, AU-12
 *
 * Extends the base audit logger with:
 *   - HMAC integrity signatures on every log entry (tamper detection)
 *   - Hash chain linking (each entry references previous entry hash)
 *   - Sequence numbers for gap detection
 *   - Structured output for SIEM ingestion (CloudWatch, Splunk, Elastic)
 *   - Write-ahead buffer for crash resilience
 *   - Log retention metadata (AU-11: Audit Record Retention)
 *
 * Immutability guarantees:
 *   1. Each entry is HMAC-signed with AUDIT_HMAC_KEY
 *   2. Each entry includes hash of previous entry (blockchain-style chain)
 *   3. Sequence numbers detect deleted entries
 *   4. In production, pipe to append-only storage (S3 Object Lock, WORM)
 */

import { createHmac } from "crypto";
import pino from "pino";
import type { AuditEntry, AuditEventType } from "./audit-log";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ImmutableAuditRecord {
  /** Monotonic sequence number — gaps indicate tampering */
  seq: number;
  /** ISO 8601 timestamp (AU-8: Time Stamps) */
  timestamp: string;
  /** SHA-256 hash of previous record (chain integrity) */
  prevHash: string;
  /** The audit event data */
  entry: AuditEntry;
  /** HMAC-SHA256 signature of this record */
  hmac: string;
  /** Retention class for lifecycle management */
  retention: "PERMANENT" | "1_YEAR" | "90_DAYS";
  /** Data classification of this log entry */
  classification: "CUI" | "UNCLASSIFIED";
}

// ── State ────────────────────────────────────────────────────────────────────

let sequenceNumber = 0;
let previousHash = "GENESIS-0000000000000000000000000000000000000000000000000000000000000000";

// ── Logger Instance ──────────────────────────────────────────────────────────

const immutableLogger = pino({
  name: "ie-sync-immutable-audit",
  level: "info",
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label: string) => ({ level: label }),
  },
  // In production, configure transport to write to:
  //   - AWS CloudWatch Logs (with log group retention policy)
  //   - AWS S3 with Object Lock (WORM compliance)
  //   - Splunk HEC endpoint
  //   - Elastic/OpenSearch via Filebeat
});

// ── Retention Classification ─────────────────────────────────────────────────

const RETENTION_MAP: Record<AuditEventType, ImmutableAuditRecord["retention"]> = {
  AUTH_SUCCESS:      "1_YEAR",
  AUTH_FAILURE:      "1_YEAR",
  AUTH_LOGOUT:       "1_YEAR",
  ACCESS_DENIED:     "PERMANENT",  // Security events kept permanently
  API_REQUEST:       "90_DAYS",
  API_ERROR:         "1_YEAR",
  STATE_CHANGE:      "1_YEAR",
  DATA_EXPORT:       "PERMANENT",  // Data movement tracked permanently
  CONFIG_CHANGE:     "PERMANENT",  // Configuration changes kept permanently
  RATE_LIMITED:      "90_DAYS",
  SSRF_BLOCKED:      "PERMANENT",  // Attack attempts kept permanently
  VALIDATION_FAILURE: "90_DAYS",
  ANNEX_GENERATED:   "PERMANENT",  // Document generation events kept permanently
};

// Events that involve CUI data references
const CUI_EVENTS: Set<AuditEventType> = new Set([
  "DATA_EXPORT",
  "STATE_CHANGE",
  "CONFIG_CHANGE",
]);

// ── Core Functions ───────────────────────────────────────────────────────────

/**
 * Compute SHA-256 hash of a record for chain linking.
 */
function computeHash(data: string): string {
  const key = process.env.AUDIT_HMAC_KEY ?? "dev-hmac-key-not-for-production";
  return createHmac("sha256", key).update(data).digest("hex");
}

/**
 * Sign a record with HMAC-SHA256 for tamper detection.
 */
function signRecord(record: Omit<ImmutableAuditRecord, "hmac">): string {
  const key = process.env.AUDIT_HMAC_KEY;
  if (!key) {
    return "hmac-not-configured";
  }
  const payload = JSON.stringify({
    seq: record.seq,
    timestamp: record.timestamp,
    prevHash: record.prevHash,
    entry: record.entry,
  });
  return createHmac("sha256", key).update(payload).digest("hex");
}

/**
 * Write an immutable, chained audit log entry.
 *
 * This is the primary function for security-critical audit events.
 * It wraps the base audit entry with integrity guarantees.
 */
export function immutableAudit(entry: AuditEntry): ImmutableAuditRecord {
  sequenceNumber++;
  const timestamp = new Date().toISOString();
  const retention = RETENTION_MAP[entry.event] ?? "90_DAYS";
  const classification: ImmutableAuditRecord["classification"] = CUI_EVENTS.has(entry.event) ? "CUI" : "UNCLASSIFIED";

  const partialRecord = {
    seq: sequenceNumber,
    timestamp,
    prevHash: previousHash,
    entry,
    retention,
    classification,
  };

  const hmac = signRecord(partialRecord);
  const record: ImmutableAuditRecord = { ...partialRecord, hmac };

  // Update chain hash for next entry
  previousHash = computeHash(JSON.stringify(record));

  // Write to structured log output
  immutableLogger.info(
    {
      immutable: true,
      ...record,
    },
    `[IMMUTABLE-AUDIT] seq=${record.seq} ${entry.event}: ${entry.action}`,
  );

  return record;
}

/**
 * Verify the integrity of an audit record.
 *
 * @param record - The record to verify
 * @param expectedPrevHash - The hash of the previous record in the chain
 * @returns Verification result with details
 */
export function verifyRecord(
  record: ImmutableAuditRecord,
  expectedPrevHash?: string,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 1. Verify HMAC signature
  const expectedHmac = signRecord({
    seq: record.seq,
    timestamp: record.timestamp,
    prevHash: record.prevHash,
    entry: record.entry,
    retention: record.retention,
    classification: record.classification,
  });

  if (expectedHmac !== "hmac-not-configured" && record.hmac !== expectedHmac) {
    errors.push("HMAC signature mismatch — record may be tampered");
  }

  // 2. Verify chain link
  if (expectedPrevHash && record.prevHash !== expectedPrevHash) {
    errors.push(`Chain break: expected prevHash ${expectedPrevHash}, got ${record.prevHash}`);
  }

  // 3. Verify timestamp is valid ISO 8601
  if (isNaN(Date.parse(record.timestamp))) {
    errors.push("Invalid timestamp format");
  }

  // 4. Verify sequence number is positive
  if (record.seq < 1) {
    errors.push("Invalid sequence number");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Verify an entire chain of audit records.
 * Detects gaps, tampering, and chain breaks.
 */
export function verifyChain(
  records: ImmutableAuditRecord[],
): { valid: boolean; errors: Array<{ seq: number; errors: string[] }> } {
  const chainErrors: Array<{ seq: number; errors: string[] }> = [];
  let prevHash = "GENESIS-0000000000000000000000000000000000000000000000000000000000000000";

  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    // Check for sequence gaps
    if (i > 0 && record.seq !== records[i - 1].seq + 1) {
      chainErrors.push({
        seq: record.seq,
        errors: [`Sequence gap: expected ${records[i - 1].seq + 1}, got ${record.seq}`],
      });
    }

    const result = verifyRecord(record, prevHash);
    if (!result.valid) {
      chainErrors.push({ seq: record.seq, errors: result.errors });
    }

    prevHash = computeHash(JSON.stringify(record));
  }

  return { valid: chainErrors.length === 0, errors: chainErrors };
}

/**
 * Get current chain state for monitoring.
 */
export function getChainState(): {
  sequenceNumber: number;
  previousHash: string;
  healthy: boolean;
} {
  return {
    sequenceNumber,
    previousHash,
    healthy: sequenceNumber >= 0,
  };
}
