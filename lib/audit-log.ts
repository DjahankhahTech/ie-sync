/**
 * Structured audit logger — NIST 800-171 AU-2, AU-3, AU-6, AU-8, AU-12
 *
 * Outputs structured JSON to stdout. In production, pipe to a SIEM
 * (CloudWatch, Splunk, Elastic) via log driver or sidecar.
 *
 * Every auditable event includes: who (userId/role), what (event/action),
 * when (ISO timestamp), where (resource/ip), and outcome.
 */

import pino from "pino";

// ── Event taxonomy ────────────────────────────────────────────────────────
export type AuditEventType =
  | "AUTH_SUCCESS"
  | "AUTH_FAILURE"
  | "AUTH_LOGOUT"
  | "ACCESS_DENIED"
  | "API_REQUEST"
  | "API_ERROR"
  | "STATE_CHANGE"
  | "DATA_EXPORT"
  | "CONFIG_CHANGE"
  | "RATE_LIMITED"
  | "SSRF_BLOCKED"
  | "VALIDATION_FAILURE";

// ── Audit record schema (AU-3: Content of Audit Records) ─────────────────
export interface AuditEntry {
  event: AuditEventType;
  userId: string | "ANONYMOUS";
  role: string | "NONE";
  ip: string;
  userAgent: string;
  resource: string;
  action: string;
  outcome: "SUCCESS" | "FAILURE" | "DENIED";
  details?: Record<string, unknown>;
}

// ── Logger instance ───────────────────────────────────────────────────────
const logger = pino({
  name: "ie-sync-audit",
  level: "info",
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label: string) => ({ level: label }),
  },
});

/**
 * Write a structured audit log entry.
 *
 * Usage:
 *   audit({
 *     event: "AUTH_SUCCESS",
 *     userId: "analyst-01",
 *     role: "ANALYST",
 *     ip: "10.0.0.1",
 *     userAgent: "Mozilla/5.0...",
 *     resource: "/api/feeds",
 *     action: "GET",
 *     outcome: "SUCCESS",
 *   });
 */
export function audit(entry: AuditEntry): void {
  logger.info(
    { audit: true, ...entry },
    `[AUDIT] ${entry.event}: ${entry.action}`,
  );
}

/**
 * Convenience: extract IP and user-agent from a Request/Headers for audit calls.
 */
export function extractRequestMeta(headers: Headers): {
  ip: string;
  userAgent: string;
} {
  return {
    ip: headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown",
    userAgent: headers.get("user-agent") ?? "unknown",
  };
}
