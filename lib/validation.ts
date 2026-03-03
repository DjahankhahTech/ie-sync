/**
 * Input validation schemas & SSRF protection
 * NIST 800-171: SI-10 (Information Input Validation), SC-7 (Boundary Protection)
 *
 * All external input to API routes MUST be validated through these schemas
 * before any processing occurs.
 */

import { z } from "zod";

// ── SSRF Protection ───────────────────────────────────────────────────────
// Block requests to internal/private network addresses.
// Prevents attackers from using link-check as an SSRF oracle.

const BLOCKED_HOSTS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "169.254.169.254", // AWS metadata
  "[::1]",
  "metadata.google.internal", // GCP metadata
  "metadata.google",
];

const BLOCKED_PREFIXES = [
  "10.",
  "172.16.",
  "172.17.",
  "172.18.",
  "172.19.",
  "172.20.",
  "172.21.",
  "172.22.",
  "172.23.",
  "172.24.",
  "172.25.",
  "172.26.",
  "172.27.",
  "172.28.",
  "172.29.",
  "172.30.",
  "172.31.",
  "192.168.",
  "fd",   // IPv6 ULA
  "fe80", // IPv6 link-local
];

/**
 * Returns true if the URL targets a private/internal network address.
 * Any URL that fails parsing is also considered blocked.
 */
export function isBlockedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    // Block known internal hostnames
    if (BLOCKED_HOSTS.includes(host)) return true;

    // Block private IP ranges
    if (BLOCKED_PREFIXES.some((prefix) => host.startsWith(prefix))) return true;

    // Only allow http/https protocols
    if (!["http:", "https:"].includes(parsed.protocol)) return true;

    // Block numeric-only hostnames (IP addresses that might bypass checks)
    if (/^\d+$/.test(host)) return true;

    return false;
  } catch {
    // Unparseable URLs are blocked
    return true;
  }
}

// ── API Input Schemas ─────────────────────────────────────────────────────

/** POST /api/link-check body schema */
export const LinkCheckInputSchema = z.object({
  urls: z
    .array(z.string().url({ message: "Each URL must be a valid URL" }))
    .min(1, "At least one URL required")
    .max(20, "Maximum 20 URLs per request"),
});

/** GET /api/feeds query params schema */
export const FeedQuerySchema = z.object({
  gcc: z
    .enum([
      "INDOPACOM",
      "EUCOM",
      "CENTCOM",
      "AFRICOM",
      "NORTHCOM",
      "SOUTHCOM",
    ])
    .default("INDOPACOM"),
  ioOnly: z.enum(["true", "false"]).optional(),
});

/** GET /api/link-check query params schema */
export const LinkCheckQuerySchema = z.object({
  url: z.string().url({ message: "Invalid URL parameter" }),
});

/** POST /api/annex body schema */
export const AnnexGenerateInputSchema = z.object({
  docType: z.enum(["annex-i", "itco"]),
  coaId: z.string().min(1, "COA ID is required"),
  gcc: z.enum(["INDOPACOM", "CENTCOM", "EUCOM", "AFRICOM", "SOUTHCOM", "NORTHCOM"]),
  userId: z.string().default("analyst-session"),
  role: z.string().default("ANALYST"),
  classification: z.string().default("UNCLASSIFIED"),
  overrideWarnings: z.boolean().default(false),
});
