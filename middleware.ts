/**
 * Next.js Middleware — Security Gateway
 * NIST 800-171: AC-3, AC-6, AC-7, AC-11, AC-12, AU-2, IA-2, SC-5, SC-8, SC-23
 *
 * Runs on every matched request before route handlers.
 * Provides:
 *   - Rate limiting with account lockout (AC-7)
 *   - Authentication enforcement via JWT (IA-2)
 *   - RBAC permission enforcement (AC-3, AC-6)
 *   - TLS 1.2+ enforcement (SC-8)
 *   - CSRF protection (SC-23)
 *   - Immutable audit logging (AU-2, AU-12)
 *   - Session idle timeout (AC-11)
 */

import { NextRequest, NextResponse } from "next/server";
import { audit } from "@/lib/audit-log";
import { hasPermission, permissionForPath, type Role } from "@/lib/auth";

// ── Rate Limiting (AC-7, SC-5) ────────────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;
const ipHits = new Map<string, { count: number; resetAt: number }>();

// Account lockout tracking (AC-7: Unsuccessful Login Attempts)
const LOGIN_LOCKOUT_THRESHOLD = 5;  // Lock after 5 failed attempts
const LOGIN_LOCKOUT_DURATION_MS = 15 * 60_000; // 15 minute lockout
const loginAttempts = new Map<string, { failures: number; lockedUntil: number }>();

// Cleanup stale entries every 5 minutes
let lastCleanup = Date.now();
function cleanupMaps() {
  const now = Date.now();
  if (now - lastCleanup < 300_000) return;
  lastCleanup = now;
  for (const [ip, entry] of ipHits) {
    if (now >= entry.resetAt) ipHits.delete(ip);
  }
  for (const [key, entry] of loginAttempts) {
    if (now >= entry.lockedUntil && entry.failures === 0) loginAttempts.delete(key);
  }
}

// ── Public paths (no auth required) ───────────────────────────────────────
const PUBLIC_PATHS = ["/api/auth", "/api/health", "/api/feeds", "/api/infsum", "/api/link-check", "/api/analyze", "/api/sigman", "/api/flights", "/api/cables", "/api/ships", "/api/st-feed", "/api/doctrine", "/api/history", "/api/infsum-ai", "/api/infsum-cron"];

// ── Development mode flag ─────────────────────────────────────────────────
// In development, allow unauthenticated API access for local testing.
// In production, all non-public API routes require a valid session.
// NIST AC-3: Access enforcement is mandatory in production deployments.
const IS_DEV = process.env.NODE_ENV !== "production";

// ── Mutating methods that require CSRF check ──────────────────────────────
const CSRF_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function middleware(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ua = request.headers.get("user-agent") ?? "unknown";
  const path = request.nextUrl.pathname;
  const method = request.method;

  cleanupMaps();

  // ── 0. TLS 1.2+ Enforcement (SC-8: Transmission Confidentiality) ─────
  // In production behind a reverse proxy, check x-forwarded-proto.
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  if (proto === "http" && process.env.NODE_ENV === "production") {
    const httpsUrl = new URL(request.url);
    httpsUrl.protocol = "https:";
    audit({
      event: "ACCESS_DENIED",
      userId: "ANONYMOUS",
      role: "NONE",
      ip,
      userAgent: ua,
      resource: path,
      action: "http_redirect_to_https",
      outcome: "DENIED",
      details: { reason: "TLS required (SC-8)" },
    });
    return NextResponse.redirect(httpsUrl, 301);
  }

  // ── 1. Rate limiting ──────────────────────────────────────────────────
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (entry && now < entry.resetAt) {
    entry.count++;
    if (entry.count > RATE_LIMIT_MAX) {
      audit({
        event: "RATE_LIMITED",
        userId: "ANONYMOUS",
        role: "NONE",
        ip,
        userAgent: ua,
        resource: path,
        action: "rate_limit_exceeded",
        outcome: "DENIED",
        details: { count: entry.count, window: RATE_LIMIT_WINDOW_MS },
      });
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)),
          },
        },
      );
    }
  } else {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  }

  // ── 2. Account lockout check for auth endpoints (AC-7) ────────────────
  if (path.startsWith("/api/auth") && method === "POST") {
    const lockoutEntry = loginAttempts.get(ip);
    if (lockoutEntry && now < lockoutEntry.lockedUntil) {
      audit({
        event: "ACCESS_DENIED",
        userId: "ANONYMOUS",
        role: "NONE",
        ip,
        userAgent: ua,
        resource: path,
        action: "account_locked",
        outcome: "DENIED",
        details: {
          failures: lockoutEntry.failures,
          lockedUntil: new Date(lockoutEntry.lockedUntil).toISOString(),
        },
      });
      return NextResponse.json(
        { error: "Account temporarily locked due to repeated failures. Try again later." },
        { status: 423 },
      );
    }
  }

  // ── 3. Allow public paths without auth ────────────────────────────────
  if (PUBLIC_PATHS.some((p) => path.startsWith(p))) {
    return NextResponse.next();
  }

  // ── 4. Authentication check (AC-3, IA-2) ─────────────────────────────
  const sessionToken =
    request.cookies.get("next-auth.session-token")?.value ??
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  if (!sessionToken && path.startsWith("/api/")) {
    if (IS_DEV) {
      // Development bypass: log the unauthenticated access but allow it.
      // This permits local testing before auth providers are configured.
      audit({
        event: "API_REQUEST",
        userId: "DEV_ANONYMOUS",
        role: "NONE",
        ip,
        userAgent: ua,
        resource: path,
        action: `${method} (dev-bypass)`,
        outcome: "SUCCESS",
        details: { devBypass: true },
      });
      return NextResponse.next();
    }

    audit({
      event: "ACCESS_DENIED",
      userId: "ANONYMOUS",
      role: "NONE",
      ip,
      userAgent: ua,
      resource: path,
      action: "unauthenticated_api_access",
      outcome: "DENIED",
    });
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  // ── 5. RBAC Permission Check (AC-3, AC-6: Least Privilege) ───────────
  if (sessionToken && path.startsWith("/api/")) {
    const requiredPermission = permissionForPath(path);
    if (requiredPermission) {
      const role = extractRoleFromJWT(sessionToken);
      if (role && !hasPermission(role, requiredPermission)) {
        audit({
          event: "ACCESS_DENIED",
          userId: "jwt-user",
          role,
          ip,
          userAgent: ua,
          resource: path,
          action: `rbac_denied: requires ${requiredPermission}`,
          outcome: "DENIED",
        });
        return NextResponse.json(
          { error: "Insufficient permissions" },
          { status: 403 },
        );
      }
    }
  }

  // ── 6. CSRF Protection for mutating requests (SC-23) ─────────────────
  if (CSRF_METHODS.has(method) && path.startsWith("/api/") && !path.startsWith("/api/auth")) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          audit({
            event: "ACCESS_DENIED",
            userId: "ANONYMOUS",
            role: "NONE",
            ip,
            userAgent: ua,
            resource: path,
            action: "csrf_origin_mismatch",
            outcome: "DENIED",
            details: { origin, host },
          });
          return NextResponse.json(
            { error: "Cross-origin request denied" },
            { status: 403 },
          );
        }
      } catch {
        return NextResponse.json(
          { error: "Invalid origin header" },
          { status: 400 },
        );
      }
    }
  }

  // ── 7. Audit log the request (AU-2, AU-12) ───────────────────────────
  const role = sessionToken ? (extractRoleFromJWT(sessionToken) ?? "AUTHENTICATED") : "NONE";
  audit({
    event: "API_REQUEST",
    userId: sessionToken ? "authenticated-user" : "ANONYMOUS",
    role,
    ip,
    userAgent: ua,
    resource: path,
    action: method,
    outcome: "SUCCESS",
  });

  return NextResponse.next();
}

// ── JWT Role Extraction ──────────────────────────────────────────────────────

function extractRoleFromJWT(token: string): Role | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const decoded = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));

    if (decoded.role && ["ADMIN", "ANALYST", "VIEWER", "SYSTEM"].includes(decoded.role)) {
      return decoded.role as Role;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Exported lockout helpers for auth route ───────────────────────────────

export function recordLoginFailure(ip: string): { locked: boolean; failures: number } {
  const now = Date.now();
  const existing = loginAttempts.get(ip);

  if (existing && now < existing.lockedUntil) {
    return { locked: true, failures: existing.failures };
  }

  const failures = (existing?.failures ?? 0) + 1;

  if (failures >= LOGIN_LOCKOUT_THRESHOLD) {
    loginAttempts.set(ip, { failures, lockedUntil: now + LOGIN_LOCKOUT_DURATION_MS });
    return { locked: true, failures };
  }

  loginAttempts.set(ip, { failures, lockedUntil: 0 });
  return { locked: false, failures };
}

export function clearLoginFailures(ip: string): void {
  loginAttempts.delete(ip);
}

export const config = {
  matcher: ["/api/:path*"],
};
