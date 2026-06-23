import { NextRequest, NextResponse } from "next/server";
import { GCC_CONFIGS } from "@/lib/gcc-config";

// Daily warm-up for the AI Daily Information Summary. Triggered by a Vercel
// Cron at 06:00 ET (see vercel.json). Generates + caches the day's summary for
// every CCMD so analysts get an instant, ready-to-go INFSUM each morning.

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
  // All three AI products are posted 3x daily (0600/1200/1800 ET). This job runs
  // at each of those times and warms the current slot's cache for every CCMD so
  // analysts land on ready-to-go products with no client-side generation.
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
