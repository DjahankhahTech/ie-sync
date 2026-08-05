import { NextRequest, NextResponse } from "next/server";
import { GCC_CONFIGS } from "@/lib/gcc-config";

// Daily warm-up for all AI products. Triggered by a single Vercel Cron at
// 10:00 UTC — 0500 EST (0600 EDT in summer; Vercel crons are fixed-UTC).
// Generates + caches the day's estimate, INFSUM, and SIGMAN for every CCMD so
// every viewer sees the same once-a-day product with no client-side generation.

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  // Optional cron-secret check (Vercel sets Authorization: Bearer $CRON_SECRET).
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { origin } = new URL(request.url);
  const gccs = Object.keys(GCC_CONFIGS);
  // All three AI products publish once per day (rollover 0500 ET). This job
  // warms the day's cache for every CCMD right at rollover.
  const targets = [
    ...gccs.map((g) => `${origin}/api/infsum-ai?gcc=${g}`),
    ...gccs.map((g) => `${origin}/api/analyze?gcc=${g}`),
    ...gccs.map((g) => `${origin}/api/sigman?gcc=${g}`),
  ];
  const results = await Promise.allSettled(
    targets.map((u) => fetch(u, { signal: AbortSignal.timeout(150000) }).then((r) => r.ok))
  );
  const warmed = results.filter((r) => r.status === "fulfilled" && r.value).length;
  return NextResponse.json({ warmed, total: targets.length, at: new Date().toISOString() });
}
