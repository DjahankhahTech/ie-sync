/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SOURCE LINK MODEL + LINK CHECKER SERVICE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Every link displayed in IE-Sync must be backed by a SourceLink record
 * that tracks:
 *   - The canonical URL (normalized, deduplicated)
 *   - Resolved URL (after following redirects)
 *   - Health status (OK / REDIRECTED / DEAD / BLOCKED / UNCHECKED)
 *   - Archived snapshot URL (Internet Archive fallback)
 *   - HTTP status code and last check timestamp
 *
 * Dashboard behavior per spec:
 *   OK         → open normally
 *   REDIRECTED → open with ⚠ badge + show both URLs
 *   DEAD       → show ✕ badge + "Source unavailable" + archive link if exists
 *   BLOCKED    → show 🔒 badge + "Paywalled/geo-blocked" + archive link
 *   UNCHECKED  → show ⏳ badge + "Checking..."
 */

// ── SourceLink Model ─────────────────────────────────────────────────────────

export type LinkStatus = "OK" | "REDIRECTED" | "DEAD" | "BLOCKED" | "UNCHECKED";

export interface SourceLink {
  /** Unique ID for this link record */
  source_link_id: string;
  /** Normalized canonical URL (lowercase, stripped tracking params, etc.) */
  canonical_url: string;
  /** Resolved URL after following redirects (may differ from canonical) */
  resolved_url: string | null;
  /** Title from the source (page title or article headline) */
  title: string;
  /** Publisher domain (e.g. "bbc.co.uk", "cisa.gov") */
  publisher: string;
  /** Current health status */
  status: LinkStatus;
  /** HTTP status code from last check (e.g. 200, 301, 404, 403) */
  http_status: number | null;
  /** Internet Archive Wayback Machine snapshot URL (fallback) */
  archived_snapshot_url: string | null;
  /** When this link was first ingested */
  first_seen_at: string;
  /** When this link was last health-checked */
  last_checked_at: string | null;
  /** Number of times this link has been referenced across feeds */
  reference_count: number;
  /** Whether this link was reachable at ingest time */
  validated_at_ingest: boolean;
}

// ── URL Normalization ────────────────────────────────────────────────────────

/** Tracking parameters to strip during normalization */
const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "fbclid", "gclid", "ref", "source", "via", "trk", "mc_cid", "mc_eid",
  "s_cid", "cmpid", "mktcid", "affiliateId",
]);

/**
 * Normalize a URL for deduplication and consistent storage.
 * - Lowercase host
 * - Strip tracking parameters
 * - Remove trailing slashes
 * - Remove fragment identifiers
 * - Ensure HTTPS where possible
 */
export function normalizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl.trim());

    // Upgrade HTTP to HTTPS for known news/gov sites
    if (url.protocol === "http:") {
      url.protocol = "https:";
    }

    // Lowercase host
    url.hostname = url.hostname.toLowerCase();

    // Strip tracking parameters
    const keysToDelete: string[] = [];
    url.searchParams.forEach((_, key) => {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => url.searchParams.delete(key));

    // Sort remaining params for consistency
    url.searchParams.sort();

    // Remove fragment
    url.hash = "";

    // Build result and strip trailing slash (unless it's just the root path)
    let result = url.toString();
    if (result.endsWith("/") && url.pathname !== "/") {
      result = result.slice(0, -1);
    }

    return result;
  } catch {
    // If URL parsing fails, return the original cleaned up
    return rawUrl.trim();
  }
}

/**
 * Extract publisher domain from a URL.
 */
export function extractPublisher(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    // Strip www prefix
    return host.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

// ── Link Health Check ────────────────────────────────────────────────────────

export interface LinkCheckResult {
  status: LinkStatus;
  http_status: number | null;
  resolved_url: string | null;
  /** If true, the response appears to be a soft 404 or paywall */
  is_soft_error: boolean;
  /** Error message if check failed */
  error?: string;
}

/** Soft 404 / paywall detection patterns */
const PAYWALL_PATTERNS = [
  /subscribe\s+to\s+(continue|read|access)/i,
  /paywall/i,
  /sign[\s-]?in\s+to\s+(continue|read)/i,
  /premium\s+content/i,
  /create\s+a(n)?\s+account\s+to/i,
];

const SOFT_404_PATTERNS = [
  /page\s+not\s+found/i,
  /404[\s:].*not\s+found/i,
  /this\s+page\s+(doesn.t|does not)\s+exist/i,
  /content\s+(has\s+been\s+)?(removed|deleted)/i,
  /no\s+longer\s+available/i,
];

/**
 * Check the health of a single URL.
 * This runs server-side via the API route.
 */
export async function checkLinkHealth(url: string): Promise<LinkCheckResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      method: "HEAD",
      headers: {
        "User-Agent": "IE-Sync/2.0 Link Checker (IO Decision Support)",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const resolvedUrl = response.url !== url ? response.url : null;
    const httpStatus = response.status;

    // Determine status
    if (httpStatus >= 200 && httpStatus < 300) {
      if (resolvedUrl && new URL(resolvedUrl).hostname !== new URL(url).hostname) {
        return { status: "REDIRECTED", http_status: httpStatus, resolved_url: resolvedUrl, is_soft_error: false };
      }
      return { status: "OK", http_status: httpStatus, resolved_url: resolvedUrl, is_soft_error: false };
    }

    if (httpStatus === 301 || httpStatus === 302 || httpStatus === 307 || httpStatus === 308) {
      return { status: "REDIRECTED", http_status: httpStatus, resolved_url: resolvedUrl, is_soft_error: false };
    }

    if (httpStatus === 403) {
      return { status: "BLOCKED", http_status: httpStatus, resolved_url: null, is_soft_error: false };
    }

    if (httpStatus === 404 || httpStatus === 410) {
      return { status: "DEAD", http_status: httpStatus, resolved_url: null, is_soft_error: false };
    }

    // For other status codes, try a GET to check for soft errors
    if (httpStatus >= 400) {
      return { status: "DEAD", http_status: httpStatus, resolved_url: null, is_soft_error: false };
    }

    return { status: "OK", http_status: httpStatus, resolved_url: resolvedUrl, is_soft_error: false };
  } catch (err) {
    return {
      status: "DEAD",
      http_status: null,
      resolved_url: null,
      is_soft_error: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

/**
 * Check for soft 404s and paywalls by fetching the full page body.
 * Only called when HEAD returns 200 but we want to verify content.
 */
export async function checkForSoftErrors(url: string): Promise<{ isSoft404: boolean; isPaywalled: boolean }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "IE-Sync/2.0 Link Checker (IO Decision Support)",
        "Accept": "text/html",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const text = await response.text();
    const body = text.substring(0, 5000); // Only check first 5KB

    const isSoft404 = SOFT_404_PATTERNS.some((p) => p.test(body));
    const isPaywalled = PAYWALL_PATTERNS.some((p) => p.test(body));

    return { isSoft404, isPaywalled };
  } catch {
    return { isSoft404: false, isPaywalled: false };
  }
}

/**
 * Generate an Internet Archive Wayback Machine URL for fallback.
 */
export function getArchiveUrl(url: string): string {
  return `https://web.archive.org/web/*/${encodeURIComponent(url)}`;
}

// ── SourceLink Registry (in-memory for now) ──────────────────────────────────

const LINK_REGISTRY = new Map<string, SourceLink>();

/**
 * Create or update a SourceLink record.
 */
export function upsertSourceLink(
  url: string,
  title: string,
  checkResult?: LinkCheckResult,
): SourceLink {
  const canonical = normalizeUrl(url);
  const existing = LINK_REGISTRY.get(canonical);

  if (existing) {
    // Update existing
    existing.reference_count += 1;
    if (checkResult) {
      existing.status = checkResult.status;
      existing.http_status = checkResult.http_status;
      existing.resolved_url = checkResult.resolved_url;
      existing.last_checked_at = new Date().toISOString();
      if (checkResult.status === "DEAD" || checkResult.status === "BLOCKED") {
        existing.archived_snapshot_url = getArchiveUrl(canonical);
      }
    }
    return existing;
  }

  // Create new
  const link: SourceLink = {
    source_link_id: `SL-${btoa(canonical).replace(/[+/=]/g, "").slice(0, 16)}-${Date.now()}`,
    canonical_url: canonical,
    resolved_url: checkResult?.resolved_url ?? null,
    title,
    publisher: extractPublisher(canonical),
    status: checkResult?.status ?? "UNCHECKED",
    http_status: checkResult?.http_status ?? null,
    archived_snapshot_url:
      checkResult?.status === "DEAD" || checkResult?.status === "BLOCKED"
        ? getArchiveUrl(canonical)
        : null,
    first_seen_at: new Date().toISOString(),
    last_checked_at: checkResult ? new Date().toISOString() : null,
    reference_count: 1,
    validated_at_ingest: checkResult?.status === "OK" || checkResult?.status === "REDIRECTED",
  };

  LINK_REGISTRY.set(canonical, link);
  return link;
}

/**
 * Look up a SourceLink by URL (normalized).
 */
export function getSourceLink(url: string): SourceLink | null {
  return LINK_REGISTRY.get(normalizeUrl(url)) ?? null;
}

/**
 * Get all SourceLinks, optionally filtered by status.
 */
export function getAllSourceLinks(statusFilter?: LinkStatus): SourceLink[] {
  const all = Array.from(LINK_REGISTRY.values());
  if (statusFilter) {
    return all.filter((l) => l.status === statusFilter);
  }
  return all;
}

/**
 * Get link health statistics for monitoring.
 */
export function getLinkHealthStats(): {
  total: number;
  ok: number;
  redirected: number;
  dead: number;
  blocked: number;
  unchecked: number;
  healthRate: number;
} {
  const all = Array.from(LINK_REGISTRY.values());
  const total = all.length;
  const ok = all.filter((l) => l.status === "OK").length;
  const redirected = all.filter((l) => l.status === "REDIRECTED").length;
  const dead = all.filter((l) => l.status === "DEAD").length;
  const blocked = all.filter((l) => l.status === "BLOCKED").length;
  const unchecked = all.filter((l) => l.status === "UNCHECKED").length;
  const checked = total - unchecked;
  const healthRate = checked > 0 ? Math.round(((ok + redirected) / checked) * 100) : 100;

  return { total, ok, redirected, dead, blocked, unchecked, healthRate };
}

// ── UI helpers ───────────────────────────────────────────────────────────────

export function getLinkStatusBadge(status: LinkStatus): {
  icon: string;
  label: string;
  color: string;
  bgColor: string;
} {
  switch (status) {
    case "OK":
      return { icon: "✓", label: "Verified", color: "#10b981", bgColor: "#10b98115" };
    case "REDIRECTED":
      return { icon: "⚠", label: "Redirected", color: "#f59e0b", bgColor: "#f59e0b15" };
    case "DEAD":
      return { icon: "✕", label: "Unavailable", color: "#ef4444", bgColor: "#ef444415" };
    case "BLOCKED":
      return { icon: "🔒", label: "Blocked/Paywalled", color: "#a855f7", bgColor: "#a855f715" };
    case "UNCHECKED":
      return { icon: "⏳", label: "Checking...", color: "#64748b", bgColor: "#64748b15" };
  }
}
