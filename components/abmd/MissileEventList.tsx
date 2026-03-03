"use client";

import { useState } from "react";
import type { MissileEvent } from "@/lib/mock-data";

const TYPE_LABELS: Record<string, string> = {
  BALLISTIC_SHORT: "SRBM",
  BALLISTIC_MEDIUM: "MRBM",
  BALLISTIC_INTERMEDIATE: "IRBM",
  ICBM: "ICBM",
  CRUISE: "CRUISE",
  HYPERSONIC: "HYPER",
  UAV_DRONE: "UAV",
};

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "#10b981",
  PROBABLE: "#f59e0b",
  UNCONFIRMED: "#94a3b8",
  RETRACTED: "#ef4444",
};

function ConfidenceBadge({ score }: { score: number }) {
  const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <span className="px-1 py-0.5 rounded text-[8px] font-bold" style={{ border: `1px solid ${color}50`, color }}>
      {score}
    </span>
  );
}

function CrossSourceBadge({ count }: { count: number }) {
  const color = count >= 3 ? "#10b981" : count >= 2 ? "#f59e0b" : "#94a3b8";
  return (
    <span className="px-1 py-0.5 rounded text-[8px] font-bold" style={{ border: `1px solid ${color}50`, color }}>
      &times;{count}
    </span>
  );
}

type SortKey = "timestamp" | "confidenceScore" | "missileType";

export function MissileEventList({ events }: { events: MissileEvent[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sorted = [...events].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "timestamp") cmp = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    else if (sortKey === "confidenceScore") cmp = b.confidenceScore - a.confidenceScore;
    else cmp = a.missileType.localeCompare(b.missileType);
    return sortAsc ? -cmp : cmp;
  });

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <button onClick={() => handleSort(field)} className="text-left hover:text-[#00d4ff] transition-colors">
      {label} {sortKey === field ? (sortAsc ? "\u2191" : "\u2193") : ""}
    </button>
  );

  return (
    <div className="border border-[#1e3a5f] rounded p-3 bg-[#070d1a]">
      <div className="text-[9px] tracking-[0.12em] text-[#94a3b8] font-bold mb-3">
        MISSILE EVENTS ({events.length})
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px]">
          <thead>
            <tr className="text-[#94a3b8] border-b border-[#1e3a5f]">
              <th className="py-1.5 pr-2 text-left"><SortHeader label="TIME" field="timestamp" /></th>
              <th className="py-1.5 pr-2 text-left"><SortHeader label="TYPE" field="missileType" /></th>
              <th className="py-1.5 pr-2 text-left">STATUS</th>
              <th className="py-1.5 pr-2 text-left">SOURCE</th>
              <th className="py-1.5 pr-2 text-left"><SortHeader label="CONFIDENCE" field="confidenceScore" /></th>
              <th className="py-1.5 pr-2 text-left">CORR</th>
              <th className="py-1.5 text-left">INTERCEPT</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((event) => (
              <tr key={event.id} className="border-b border-[#1e3a5f30] hover:bg-[#1e3a5f20] transition-colors">
                <td className="py-1.5 pr-2 text-[#e2e8f0] font-mono">
                  {new Date(event.timestamp).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="py-1.5 pr-2">
                  <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-[#1e3a5f40] text-[#e2e8f0]">
                    {TYPE_LABELS[event.missileType] || event.missileType}
                  </span>
                </td>
                <td className="py-1.5 pr-2">
                  <span style={{ color: STATUS_COLORS[event.status] || "#94a3b8" }} className="font-bold">
                    {event.status}
                  </span>
                </td>
                <td className="py-1.5 pr-2 text-[#94a3b8] max-w-[140px] truncate">{event.source}</td>
                <td className="py-1.5 pr-2"><ConfidenceBadge score={event.confidenceScore} /></td>
                <td className="py-1.5 pr-2"><CrossSourceBadge count={event.crossSourceCount} /></td>
                <td className="py-1.5">
                  {event.interceptClaimed ? (
                    <span className="text-[#10b981] font-bold">YES</span>
                  ) : (
                    <span className="text-[#475569]">&mdash;</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
