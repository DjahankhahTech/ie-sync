/**
 * ABMD Deduplication — groups OSINT reports that likely describe the same event.
 * Hash: location_grid_5deg + floor(timestamp/4h) + missile_type
 */

import type { MissileEvent, MissileType } from "./mock-data";

/** Compute dedup hash: location quantized to 5° grid + 4-hour time bucket + type */
export function computeDedupHash(
  lat: number,
  lng: number,
  timestamp: string,
  missileType: MissileType,
): string {
  const gridLat = Math.floor(lat / 5) * 5;
  const gridLng = Math.floor(lng / 5) * 5;
  const timeBucket = Math.floor(new Date(timestamp).getTime() / (4 * 3600000));
  return `${gridLat}_${gridLng}_${timeBucket}_${missileType}`;
}

/** Group events by dedupHash, keeping the highest-confidence event as primary */
export function deduplicateEvents(events: MissileEvent[]): MissileEvent[] {
  const groups = new Map<string, MissileEvent[]>();
  for (const e of events) {
    const existing = groups.get(e.dedupHash) ?? [];
    existing.push(e);
    groups.set(e.dedupHash, existing);
  }

  const result: MissileEvent[] = [];
  for (const [, group] of groups) {
    // Pick highest confidence; merge crossSourceCount
    const sorted = [...group].sort((a, b) => b.confidenceScore - a.confidenceScore);
    const primary = { ...sorted[0] };
    primary.crossSourceCount = group.length;
    result.push(primary);
  }
  return result;
}
