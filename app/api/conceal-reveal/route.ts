import { NextResponse } from "next/server";
import type { ConcealRevealIndex, ConcealRevealIndicator } from "@/lib/mock-data";
import type { GCCId } from "@/lib/gcc-config";

// GCC-specific baseline profiles
const GCC_BASELINES: Partial<Record<GCCId, { media: number; isr: number; leak: number; exposure: number }>> = {
  INDOPACOM: { media: 52, isr: 61, leak: 28, exposure: 45 },
  CENTCOM: { media: 68, isr: 55, leak: 42, exposure: 58 },
  EUCOM: { media: 38, isr: 48, leak: 22, exposure: 35 },
  AFRICOM: { media: 45, isr: 32, leak: 55, exposure: 41 },
  SOUTHCOM: { media: 25, isr: 18, leak: 15, exposure: 22 },
  NORTHCOM: { media: 30, isr: 20, leak: 12, exposure: 18 },
};

function jitter(base: number, range: number = 10): number {
  return Math.max(0, Math.min(100, Math.round(base + (Math.random() - 0.5) * range * 2)));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gcc = (searchParams.get("gcc") || "INDOPACOM") as GCCId;
  const b = GCC_BASELINES[gcc] ?? GCC_BASELINES.INDOPACOM!;
  const now = new Date().toISOString();

  const indicators: ConcealRevealIndicator[] = [
    { id: "CR-IND-MEDIA", name: "Media Saturation", value: jitter(b.media), weight: 0.25, trend: Math.random() > 0.5 ? "UP" : "STABLE", updatedAt: now, source: "OSINT media monitoring" },
    { id: "CR-IND-ISR", name: "Adversary ISR Activity", value: jitter(b.isr), weight: 0.30, trend: Math.random() > 0.6 ? "UP" : "DOWN", updatedAt: now, source: "EW / ISR sensors" },
    { id: "CR-IND-LEAK", name: "Information Leakage", value: jitter(b.leak), weight: 0.25, trend: Math.random() > 0.5 ? "UP" : "STABLE", updatedAt: now, source: "OPSEC monitoring cell" },
    { id: "CR-IND-EXP", name: "Force Exposure", value: jitter(b.exposure), weight: 0.20, trend: Math.random() > 0.5 ? "STABLE" : "DOWN", updatedAt: now, source: "SIGMAN / physical security" },
  ];

  const composite = Math.round(indicators.reduce((sum, ind) => sum + ind.value * ind.weight, 0));
  const status: ConcealRevealIndex["status"] = composite > 65 ? "RED" : composite > 30 ? "AMBER" : "GREEN";
  const posture: ConcealRevealIndex["posture"] = composite > 65 ? "CONCEAL" : composite < 30 ? "REVEAL" : "MIXED";

  const result: ConcealRevealIndex = { composite, status, posture, indicators, computedAt: now };
  return NextResponse.json(result);
}
