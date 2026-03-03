/**
 * ABMD Confidence Scoring — transparent, rule-based scoring.
 * crossSourceCount >= 3 -> 90; >= 2 -> 70; else 40
 * Adjusted by source reliability weight.
 */

import type { MissileEvent, MissileType } from "./mock-data";

const TYPE_SEVERITY: Record<MissileType, number> = {
  UAV_DRONE: 10,
  CRUISE: 30,
  BALLISTIC_SHORT: 40,
  BALLISTIC_MEDIUM: 60,
  BALLISTIC_INTERMEDIATE: 75,
  HYPERSONIC: 85,
  ICBM: 100,
};

export function computeConfidence(crossSourceCount: number, sourceReliability: number): number {
  let base: number;
  if (crossSourceCount >= 3) base = 90;
  else if (crossSourceCount >= 2) base = 70;
  else base = 40;
  // Adjust +-15% based on source reliability (0-100 -> -0.15 to +0.15)
  const adjustment = ((sourceReliability - 50) / 50) * 15;
  return Math.min(100, Math.max(0, Math.round(base + adjustment)));
}

export function getTypeSeverity(missileType: MissileType): number {
  return TYPE_SEVERITY[missileType] ?? 50;
}

/** Compute escalation index: frequency trend x type severity x target proximity */
export function computeEscalationIndex(
  events: MissileEvent[],
  days: number = 7,
): number {
  if (events.length === 0) return 0;
  const now = Date.now();
  const windowMs = days * 86400000;
  const recentEvents = events.filter(
    (e) => now - new Date(e.timestamp).getTime() < windowMs,
  );
  if (recentEvents.length === 0) return 0;

  // Frequency component (0-40): normalized by expected baseline of 5
  const freqComponent = Math.min(40, (recentEvents.length / 5) * 20);
  // Severity component (0-40): average type severity
  const avgSeverity = recentEvents.reduce((s, e) => s + getTypeSeverity(e.missileType), 0) / recentEvents.length;
  const sevComponent = (avgSeverity / 100) * 40;
  // Recency component (0-20): more recent = higher
  const mostRecent = Math.max(...recentEvents.map((e) => new Date(e.timestamp).getTime()));
  const hoursAgo = (now - mostRecent) / 3600000;
  const recencyComponent = Math.max(0, 20 - hoursAgo);

  return Math.min(100, Math.round(freqComponent + sevComponent + recencyComponent));
}
