/**
 * Health Check Endpoint
 * NIST 800-171: SI-4 (System Monitoring), AU-6, AC-22
 *
 * GET /api/health — Returns minimal system status.
 * This endpoint is PUBLIC (no auth required) for load balancer probes.
 *
 * SECURITY: Does NOT expose NODE_ENV, memory details, or system internals (AC-22).
 * Detailed diagnostics available only to ADMIN via authenticated endpoint.
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    version: process.env.npm_package_version ?? "0.1.0",
    timestamp: new Date().toISOString(),
  });
}
