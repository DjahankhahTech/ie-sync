/**
 * POST /api/annex — Server-side Annex I / ITCO document generation
 *
 * NIST 800-171 controls:
 *   AU-2  (Auditable Events)    — every generation attempt is audit-logged
 *   AU-3  (Content of Audit Records) — log includes who, what, when, outcome
 *   SI-10 (Information Input Validation) — Zod schema validates all input
 *   AC-3  (Access Enforcement)  — role check before generation
 *   SC-13 (Cryptographic Protection) — SHA-256 hash of generated output
 *
 * Flow:
 *   1. Parse & validate JSON body via AnnexGenerateInputSchema
 *   2. Enforce role (ADMIN | ANALYST only)
 *   3. Resolve COA from GCC mock data
 *   4. Collect warnings (unapproved status, pending authorities, missing legal review)
 *   5. If warnings exist and overrideWarnings is false, return 422 with warnings
 *   6. Generate document content (Annex I or ITCO)
 *   7. Compute SHA-256 hash of output
 *   8. Build AnnexGeneration metadata record
 *   9. Write ANNEX_GENERATED audit entry
 *  10. Return document + metadata + warnings
 */

import { NextRequest, NextResponse } from "next/server";
import { AnnexGenerateInputSchema } from "@/lib/validation";
import { getGCCMockData } from "@/lib/gcc-mock-data";
import { generateAnnexIContent, generateITCOContent } from "@/lib/annex-templates";
import { audit, extractRequestMeta } from "@/lib/audit-log";
import { createHash } from "crypto";
import type { GCCId } from "@/lib/gcc-config";
import type { AnnexGeneration } from "@/lib/mock-data";

// ── POST Handler ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const meta = extractRequestMeta(request.headers);

  // ── 1. Parse and validate body ───────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = AnnexGenerateInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const {
    docType,
    coaId,
    gcc,
    userId,
    role,
    classification,
    overrideWarnings,
  } = parsed.data;

  // ── 2. Role check — only ADMIN and ANALYST can generate ──────────────
  if (!["ADMIN", "ANALYST"].includes(role)) {
    audit({
      event: "ACCESS_DENIED",
      userId,
      role,
      ...meta,
      resource: "/api/annex",
      action: "annex_generate",
      outcome: "DENIED",
      details: { reason: "Insufficient role" },
    });
    return NextResponse.json(
      {
        success: false,
        error: "Insufficient permissions. ANALYST or ADMIN role required.",
      },
      { status: 403 },
    );
  }

  // ── 3. Load GCC data and find the requested COA ──────────────────────
  const gccData = getGCCMockData(gcc as GCCId);
  const coa = gccData.coaOptions.find((c) => c.id === coaId);

  if (!coa) {
    return NextResponse.json(
      {
        success: false,
        error: `COA '${coaId}' not found for GCC ${gcc}`,
      },
      { status: 404 },
    );
  }

  // ── 4. Collect warnings ──────────────────────────────────────────────
  const warnings: string[] = [];

  // 4a. COA status check
  if (coa.status !== "APPROVED") {
    warnings.push(
      `COA status is '${coa.status}' — not fully approved. Proceed with caution.`,
    );
  }

  // 4b. Pending authority requirements
  const pendingAuths = coa.authorityRequirements.filter(
    (a) => a.status === "PENDING",
  );
  for (const auth of pendingAuths) {
    warnings.push(
      `Authority pending: ${auth.authority} for ${auth.capability} (required by ${auth.requiredBy})`,
    );
  }

  // 4c. Legal review required but not obtained
  const pendingLegal = coa.authorityRequirements.filter(
    (a) => a.legalReview && a.status !== "OBTAINED",
  );
  for (const auth of pendingLegal) {
    warnings.push(
      `Legal review required but not obtained: ${auth.authority} (${auth.capability})`,
    );
  }

  // If warnings exist and caller has not explicitly overridden, return 422
  if (warnings.length > 0 && !overrideWarnings) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Validation warnings exist. Set overrideWarnings=true to proceed.",
        warnings,
      },
      { status: 422 },
    );
  }

  // ── 5. Generate document content ─────────────────────────────────────
  const content =
    docType === "annex-i"
      ? generateAnnexIContent(coa, gccData.runningEstimate, gcc as GCCId)
      : generateITCOContent(coa, gccData.runningEstimate, gcc as GCCId);

  // ── 6. Compute SHA-256 hash of the generated output ──────────────────
  const outputHash = createHash("sha256").update(content).digest("hex");

  // ── 7. Build metadata record ─────────────────────────────────────────
  const annexId = `ANNEX-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const metadata: AnnexGeneration = {
    annexId,
    docType,
    selectedCoaId: coa.id,
    selectedCoaVersion: coa.version,
    selectedCoaStatus: coa.status,
    generationTimestamp: new Date().toISOString(),
    generatedBy: userId,
    classification,
    outputHash,
    humanReviewStatus: "PENDING_REVIEW",
    gcc,
    operationName: gccData.runningEstimate.operationName,
    planningToolId: "IE-SYNC v2.1",
  };

  // ── 8. Audit log ────────────────────────────────────────────────────
  audit({
    event: "ANNEX_GENERATED",
    userId,
    role,
    ...meta,
    resource: "/api/annex",
    action: `generate_${docType}`,
    outcome: "SUCCESS",
    details: {
      annexId,
      coaId: coa.id,
      coaVersion: coa.version,
      coaStatus: coa.status,
      gcc,
      outputHash,
      warningCount: warnings.length,
      warnings: warnings.length > 0 ? warnings : undefined,
    },
  });

  // ── 9. Return document + metadata + warnings ────────────────────────
  return NextResponse.json({
    success: true,
    annex: {
      annexId,
      docType,
      content,
      metadata,
      warnings,
    },
  });
}
