import { NextRequest, NextResponse } from "next/server";
import {
  checkLinkHealth,
  normalizeUrl,
  extractPublisher,
  getArchiveUrl,
  type LinkCheckResult,
  type LinkStatus,
} from "@/lib/source-links";

export interface LinkCheckResponse {
  url: string;
  canonical_url: string;
  publisher: string;
  status: LinkStatus;
  http_status: number | null;
  resolved_url: string | null;
  archived_snapshot_url: string | null;
  checked_at: string;
  error?: string;
}

/**
 * POST /api/link-check
 * Body: { urls: string[] }
 * Returns health check results for each URL.
 *
 * This runs the link checker service in batch for efficiency.
 * Max 20 URLs per request to prevent abuse.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const urls: string[] = body.urls;

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: "Body must contain a non-empty 'urls' array" },
        { status: 400 },
      );
    }

    // Cap at 20 URLs per request
    const urlsToCheck = urls.slice(0, 20);

    // Check all URLs in parallel with a concurrency limit
    const results: LinkCheckResponse[] = await Promise.all(
      urlsToCheck.map(async (url) => {
        const canonical = normalizeUrl(url);
        const publisher = extractPublisher(url);

        let checkResult: LinkCheckResult;
        try {
          checkResult = await checkLinkHealth(canonical);
        } catch {
          checkResult = {
            status: "DEAD",
            http_status: null,
            resolved_url: null,
            is_soft_error: false,
            error: "Check failed",
          };
        }

        return {
          url,
          canonical_url: canonical,
          publisher,
          status: checkResult.status,
          http_status: checkResult.http_status,
          resolved_url: checkResult.resolved_url,
          archived_snapshot_url:
            checkResult.status === "DEAD" || checkResult.status === "BLOCKED" || checkResult.status === "RESTRICTED_GOV"
              ? getArchiveUrl(canonical)
              : null,
          checked_at: new Date().toISOString(),
          error: checkResult.error,
        };
      }),
    );

    const total = results.length;
    const ok = results.filter((r) => r.status === "OK").length;
    const redirected = results.filter((r) => r.status === "REDIRECTED").length;
    const dead = results.filter((r) => r.status === "DEAD").length;
    const blocked = results.filter((r) => r.status === "BLOCKED").length;
    const restricted_gov = results.filter((r) => r.status === "RESTRICTED_GOV").length;

    return NextResponse.json({
      checked_at: new Date().toISOString(),
      total,
      summary: { ok, redirected, dead, blocked, restricted_gov },
      health_rate: total > 0 ? Math.round(((ok + redirected + restricted_gov) / total) * 100) : 100,
      results,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }
}

/**
 * GET /api/link-check?url=<encoded_url>
 * Check a single URL.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "Missing 'url' query parameter" },
      { status: 400 },
    );
  }

  const canonical = normalizeUrl(url);
  const publisher = extractPublisher(url);
  const checkResult = await checkLinkHealth(canonical);

  const response: LinkCheckResponse = {
    url,
    canonical_url: canonical,
    publisher,
    status: checkResult.status,
    http_status: checkResult.http_status,
    resolved_url: checkResult.resolved_url,
    archived_snapshot_url:
      checkResult.status === "DEAD" || checkResult.status === "BLOCKED" || checkResult.status === "RESTRICTED_GOV"
        ? getArchiveUrl(canonical)
        : null,
    checked_at: new Date().toISOString(),
    error: checkResult.error,
  };

  return NextResponse.json(response);
}
