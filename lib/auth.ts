/**
 * Authentication & Role-Based Access Control (RBAC)
 * NIST 800-171: AC-2, AC-3, AC-6, IA-2, IA-5, IA-8
 *
 * Defines roles, permissions, and session types.
 * Auth route handler at app/api/auth/[...nextauth]/route.ts uses NextAuth.js v5.
 *
 * Future: Replace credentials provider with CAC/PIV/SSO for DoD environments.
 */

// ── Role definitions (AC-6: Least Privilege) ──────────────────────────────
export type Role = "ADMIN" | "ANALYST" | "VIEWER" | "SYSTEM";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

// ── Permission matrix ─────────────────────────────────────────────────────
// Each role has an explicit set of allowed actions.
// Anything not listed is implicitly DENIED.
const ROLE_PERMISSIONS: Record<Role, Set<string>> = {
  ADMIN: new Set([
    "read",
    "write",
    "export",
    "admin",
    "api:feeds",
    "api:link-check",
    "api:health",
  ]),
  ANALYST: new Set([
    "read",
    "write",
    "export",
    "api:feeds",
    "api:link-check",
  ]),
  VIEWER: new Set(["read", "api:feeds"]),
  SYSTEM: new Set(["api:health"]),
};

/**
 * Check if a role has a specific permission.
 *
 * Usage:
 *   if (!hasPermission(user.role, "api:link-check")) return 403;
 */
export function hasPermission(role: Role, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

/**
 * Check if a user's role is one of the allowed roles.
 *
 * Usage:
 *   if (!requireRole(user.role, "ADMIN", "ANALYST")) return 403;
 */
export function requireRole(userRole: Role, ...allowed: Role[]): boolean {
  return allowed.includes(userRole);
}

/**
 * Map a permission string to the API path it protects.
 * Used by middleware to auto-check permissions.
 */
export function permissionForPath(path: string): string | null {
  if (path.startsWith("/api/feeds")) return "api:feeds";
  if (path.startsWith("/api/link-check")) return "api:link-check";
  if (path.startsWith("/api/health")) return "api:health";
  return null;
}
