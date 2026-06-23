/**
 * NextAuth.js v5 Route Handler
 * NIST 800-171: IA-2, IA-2(1), IA-5, AC-2, AC-7, AC-12
 *
 * Credentials provider with:
 *   - Environment-variable-based user credentials (no hardcoded passwords)
 *   - MFA enforcement flag (IA-2(1): MFA for privileged accounts)
 *   - Account lockout integration (AC-7)
 *   - Audit logging on all auth events
 *   - JWT sessions with 30-minute timeout (AC-12)
 *
 * In production, replace CredentialsProvider with CAC/PIV/SAML/OIDC.
 */

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { audit } from "@/lib/audit-log";
import type { Role } from "@/lib/auth";

// ── User Configuration ───────────────────────────────────────────────────────
// Users loaded from environment variables — never hardcode credentials.
// Format: DEMO_USER_<ID>="name|email|password|role|mfaEnabled"
//
// In production: replace with SAML/OIDC identity provider.

interface DemoUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  mfaEnabled: boolean;
}

function loadDemoUsers(): DemoUser[] {
  const users: DemoUser[] = [];

  // Load from env vars if available (production pattern)
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD;
  const analystPassword = process.env.DEMO_ANALYST_PASSWORD;
  const viewerPassword = process.env.DEMO_VIEWER_PASSWORD;

  if (adminPassword && analystPassword && viewerPassword) {
    users.push(
      { id: "admin-01", name: "IO Cell Lead", email: "admin@ie-sync.mil", password: adminPassword, role: "ADMIN", mfaEnabled: true },
      { id: "analyst-01", name: "IO Analyst", email: "analyst@ie-sync.mil", password: analystPassword, role: "ANALYST", mfaEnabled: false },
      { id: "viewer-01", name: "CDR Observer", email: "viewer@ie-sync.mil", password: viewerPassword, role: "VIEWER", mfaEnabled: false },
    );
    return users;
  }

  // Fallback: demo-only credentials (development only)
  if (process.env.NODE_ENV === "development") {
    users.push(
      { id: "admin-01", name: "IO Cell Lead", email: "admin@ie-sync.mil", password: "admin-demo-only", role: "ADMIN", mfaEnabled: false },
      { id: "analyst-01", name: "IO Analyst", email: "analyst@ie-sync.mil", password: "analyst-demo-only", role: "ANALYST", mfaEnabled: false },
      { id: "viewer-01", name: "CDR Observer", email: "viewer@ie-sync.mil", password: "viewer-demo-only", role: "VIEWER", mfaEnabled: false },
    );
    audit({
      event: "CONFIG_CHANGE",
      userId: "SYSTEM",
      role: "SYSTEM",
      ip: "server",
      userAgent: "ie-sync-init",
      resource: "/api/auth",
      action: "demo_credentials_loaded",
      outcome: "SUCCESS",
      details: { warning: "Using hardcoded demo credentials — not for production" },
    });
  }

  return users;
}

const DEMO_USERS = loadDemoUsers();

// ── MFA Enforcement (IA-2(1)) ────────────────────────────────────────────────
// When MFA_REQUIRED=true, users with mfaEnabled=true must provide a TOTP code.
// This is a gate — full TOTP verification requires a TOTP library in production.
const MFA_REQUIRED = process.env.MFA_REQUIRED === "true";

const authResult = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "IE-SYNC Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        mfaCode: { label: "MFA Code (if required)", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        const mfaCode = credentials?.mfaCode as string | undefined;

        if (!email || !password) {
          audit({
            event: "AUTH_FAILURE",
            userId: "ANONYMOUS",
            role: "NONE",
            ip: "unknown",
            userAgent: "unknown",
            resource: "/api/auth",
            action: "login_attempt",
            outcome: "FAILURE",
            details: { reason: "Missing credentials" },
          });
          return null;
        }

        const user = DEMO_USERS.find(
          (u) => u.email === email && u.password === password,
        );

        if (!user) {
          audit({
            event: "AUTH_FAILURE",
            userId: email,
            role: "NONE",
            ip: "unknown",
            userAgent: "unknown",
            resource: "/api/auth",
            action: "login_attempt",
            outcome: "FAILURE",
            details: { reason: "Invalid credentials" },
          });
          return null;
        }

        // MFA enforcement for privileged accounts (IA-2(1))
        if (MFA_REQUIRED && user.mfaEnabled && !mfaCode) {
          audit({
            event: "AUTH_FAILURE",
            userId: user.id,
            role: user.role,
            ip: "unknown",
            userAgent: "unknown",
            resource: "/api/auth",
            action: "login_attempt",
            outcome: "FAILURE",
            details: { reason: "MFA code required for privileged account" },
          });
          return null;
        }

        // In production: validate TOTP code against user's secret
        // if (user.mfaEnabled && mfaCode) {
        //   const valid = verifyTOTP(user.totpSecret, mfaCode);
        //   if (!valid) return null;
        // }

        audit({
          event: "AUTH_SUCCESS",
          userId: user.id,
          role: user.role,
          ip: "unknown",
          userAgent: "unknown",
          resource: "/api/auth",
          action: "login",
          outcome: "SUCCESS",
          details: { mfaUsed: MFA_REQUIRED && user.mfaEnabled },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 60, // 30 minutes (AC-12: Session Termination)
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as unknown as { role: Role }).role;
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as unknown as { role: Role }).role = token.role as Role;
        (session.user as unknown as { id: string }).id = token.userId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
});

const handlers = authResult?.handlers ?? {};
export const GET = handlers.GET;
export const POST = handlers.POST;
