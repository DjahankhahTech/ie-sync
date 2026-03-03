"use client";

import type { MissileEvent } from "@/lib/mock-data";
import { getTypeSeverity } from "@/lib/abmd-scoring";

const TYPE_LABELS: Record<string, string> = {
  BALLISTIC_SHORT: "SRBM",
  BALLISTIC_MEDIUM: "MRBM",
  BALLISTIC_INTERMEDIATE: "IRBM",
  ICBM: "ICBM",
  CRUISE: "CRUISE",
  HYPERSONIC: "HYPER",
  UAV_DRONE: "UAV",
};

export function EscalationIndexPanel({ index, events }: { index: number; events: MissileEvent[] }) {
  const color = index > 60 ? "#ef4444" : index > 25 ? "#f59e0b" : "#10b981";
  const label = index > 60 ? "HIGH" : index > 25 ? "ELEVATED" : "LOW";

  // Type breakdown
  const typeCounts = new Map<string, number>();
  for (const e of events) {
    typeCounts.set(e.missileType, (typeCounts.get(e.missileType) || 0) + 1);
  }

  return (
    <div className="border border-[#1e3a5f] rounded p-3 bg-[#070d1a] h-full flex flex-col">
      <div className="text-[9px] tracking-[0.12em] text-[#94a3b8] font-bold mb-3">
        ESCALATION INDEX
      </div>

      {/* Gauge */}
      <div className="flex items-center justify-center mb-3">
        <div className="relative w-24 h-24">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Background arc */}
            <circle cx="50" cy="50" r="42" fill="none" stroke="#1e3a5f" strokeWidth="8"
              strokeDasharray={`${Math.PI * 42 * 0.75} ${Math.PI * 42 * 0.25}`}
              strokeDashoffset={Math.PI * 42 * 0.375}
              strokeLinecap="round"
              transform="rotate(135 50 50)"
            />
            {/* Value arc */}
            <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="8"
              strokeDasharray={`${(index / 100) * Math.PI * 42 * 0.75} ${Math.PI * 42}`}
              strokeDashoffset={Math.PI * 42 * 0.375}
              strokeLinecap="round"
              transform="rotate(135 50 50)"
            />
            <text x="50" y="48" textAnchor="middle" fill={color} fontSize="18" fontWeight="bold">
              {index}
            </text>
            <text x="50" y="62" textAnchor="middle" fill="#94a3b8" fontSize="8">
              {label}
            </text>
          </svg>
        </div>
      </div>

      {/* Type breakdown */}
      <div className="text-[8px] tracking-[0.12em] text-[#94a3b8] font-bold mb-1">
        TYPE DISTRIBUTION
      </div>
      <div className="space-y-1 flex-1">
        {Array.from(typeCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([type, count]) => {
            const severity = getTypeSeverity(type as MissileEvent["missileType"]);
            const sevColor = severity > 70 ? "#ef4444" : severity > 40 ? "#f59e0b" : "#94a3b8";
            return (
              <div key={type} className="flex items-center justify-between text-[9px]">
                <span className="text-[#e2e8f0]">{TYPE_LABELS[type] || type}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[#94a3b8]">{count}</span>
                  <div className="w-12 h-1.5 bg-[#1e3a5f] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${severity}%`, background: sevColor }} />
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Formula note */}
      <div className="text-[8px] text-[#475569] mt-2 pt-2 border-t border-[#1e3a5f]">
        Index = frequency &times; type_severity &times; recency
      </div>
    </div>
  );
}
