"use client";

import { useEffect, useState } from "react";
import { useIEStore } from "@/store/ie-store";
import type { ConcealRevealIndex, ConcealRevealIndicator } from "@/lib/mock-data";
import { MetricContractPanel } from "@/components/ui/MetricContractPanel";

function PostureBadge({ posture }: { posture: ConcealRevealIndex["posture"] }) {
  const config = {
    CONCEAL: { color: "#ef4444", label: "CONCEAL RECOMMENDED" },
    REVEAL: { color: "#10b981", label: "REVEAL POSTURE SAFE" },
    MIXED: { color: "#f59e0b", label: "MIXED — ASSESS RISK" },
  };
  const c = config[posture];
  return (
    <span className="px-2 py-0.5 rounded text-[9px] font-bold tracking-wider" style={{ border: `1px solid ${c.color}60`, color: c.color, background: `${c.color}10` }}>
      {c.label}
    </span>
  );
}

function IndicatorRow({ ind }: { ind: ConcealRevealIndicator }) {
  const color = ind.value > 65 ? "#ef4444" : ind.value > 30 ? "#f59e0b" : "#10b981";
  const trendIcon = ind.trend === "UP" ? "↑" : ind.trend === "DOWN" ? "↓" : "→";
  const trendColor = ind.trend === "UP" ? "#ef4444" : ind.trend === "DOWN" ? "#10b981" : "#94a3b8";
  return (
    <div className="flex items-center gap-3 py-2 border-b border-[#1e3a5f30]">
      <div className="w-28 text-[9px] text-[#e2e8f0] font-bold">{ind.name}</div>
      <div className="flex-1">
        <div className="h-2 bg-[#1e3a5f] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${ind.value}%`, background: color }} />
        </div>
      </div>
      <div className="w-10 text-right text-[10px] font-bold" style={{ color }}>{ind.value}</div>
      <div className="w-6 text-center text-[10px] font-bold" style={{ color: trendColor }}>{trendIcon}</div>
      <div className="w-10 text-right text-[8px] text-[#475569]">×{ind.weight}</div>
      <div className="w-24 text-[8px] text-[#475569] truncate">{ind.source}</div>
    </div>
  );
}

export function ConcealRevealDashboard() {
  const { activeGCC, setConcealRevealIndex, concealRevealIndex } = useIEStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showContract, setShowContract] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/conceal-reveal?gcc=${activeGCC}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data: ConcealRevealIndex) => { setConcealRevealIndex(data); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [activeGCC, setConcealRevealIndex]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-[#00d4ff] text-sm font-bold tracking-widest animate-pulse">COMPUTING CONCEAL/REVEAL INDEX...</div>
      </div>
    );
  }

  if (error || !concealRevealIndex) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-[#ef4444] text-sm">Error: {error || "No data"}</div>
      </div>
    );
  }

  const { composite, status, posture, indicators } = concealRevealIndex;
  const statusColors = { GREEN: "#10b981", AMBER: "#f59e0b", RED: "#ef4444" };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-[#00d4ff] text-lg font-black tracking-widest">CONCEAL / REVEAL</span>
            <PostureBadge posture={posture} />
            <span className="px-2 py-0.5 rounded text-[8px] font-bold tracking-wider border border-[#f59e0b40] text-[#f59e0b] bg-[#f59e0b08]">
              TRL 4 PROTOTYPE
            </span>
          </div>
          <div className="text-[10px] text-[#475569] mt-1">
            JP 3-13.3 OPSEC Posture Assessment — {activeGCC} AOR
          </div>
        </div>
        <div className="text-right text-[9px] text-[#475569]">
          <div>Last computed: {new Date(concealRevealIndex.computedAt).toLocaleTimeString()}</div>
        </div>
      </div>

      {/* Composite Score Gauge */}
      <div className="flex items-center gap-6 p-4 border border-[#1e3a5f] rounded bg-[#070d1a]">
        <div className="flex items-center justify-center">
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#1e3a5f" strokeWidth="8"
                strokeDasharray={`${Math.PI * 42 * 0.75} ${Math.PI * 42 * 0.25}`}
                strokeDashoffset={Math.PI * 42 * 0.375}
                strokeLinecap="round" transform="rotate(135 50 50)" />
              <circle cx="50" cy="50" r="42" fill="none" stroke={statusColors[status]} strokeWidth="8"
                strokeDasharray={`${(composite / 100) * Math.PI * 42 * 0.75} ${Math.PI * 42}`}
                strokeDashoffset={Math.PI * 42 * 0.375}
                strokeLinecap="round" transform="rotate(135 50 50)" />
              <text x="50" y="46" textAnchor="middle" fill={statusColors[status]} fontSize="22" fontWeight="bold">{composite}</text>
              <text x="50" y="60" textAnchor="middle" fill="#94a3b8" fontSize="8">{posture}</text>
            </svg>
          </div>
        </div>
        <div className="flex-1 space-y-1">
          <div className="text-[9px] tracking-[0.12em] text-[#94a3b8] font-bold mb-2">COMPOSITE BREAKDOWN</div>
          <div className="text-[9px] text-[#e2e8f0]">
            Formula: <span className="font-mono text-[#00d4ff]">Σ(indicator × weight)</span>
          </div>
          <div className="text-[9px] text-[#475569]">
            Weights: Media Sat (0.25) + Adversary ISR (0.30) + Info Leakage (0.25) + Force Exposure (0.20)
          </div>
          <div className="flex gap-3 mt-2 text-[9px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#10b981]" /> GREEN ≤30</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#f59e0b]" /> AMBER 30-65</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#ef4444]" /> RED &gt;65</span>
          </div>
        </div>
      </div>

      {/* Indicators */}
      <div className="border border-[#1e3a5f] rounded p-3 bg-[#070d1a]">
        <div className="text-[9px] tracking-[0.12em] text-[#94a3b8] font-bold mb-2">
          INDICATORS ({indicators.length})
        </div>
        <div className="flex items-center gap-3 text-[8px] text-[#475569] border-b border-[#1e3a5f] pb-1 mb-1">
          <div className="w-28">INDICATOR</div>
          <div className="flex-1">VALUE</div>
          <div className="w-10 text-right">SCORE</div>
          <div className="w-6 text-center">TREND</div>
          <div className="w-10 text-right">WEIGHT</div>
          <div className="w-24">SOURCE</div>
        </div>
        {indicators.map((ind) => <IndicatorRow key={ind.id} ind={ind} />)}
      </div>

      {/* Metric Contract */}
      <button
        onClick={() => setShowContract(!showContract)}
        className="text-[9px] text-[#00d4ff] hover:underline"
      >
        {showContract ? "▼ Hide" : "▶ Show"} Metric Contract (CR-COMPOSITE)
      </button>
      {showContract && (
        <div className="border border-[#1e3a5f] rounded p-3 bg-[#070d1a]">
          <MetricContractPanel metricId="CR-COMPOSITE" />
        </div>
      )}

      {/* Posture recommendation */}
      <div className="border rounded p-3" style={{ borderColor: `${statusColors[status]}40`, background: `${statusColors[status]}08` }}>
        <div className="text-[9px] tracking-[0.12em] font-bold mb-1" style={{ color: statusColors[status] }}>
          POSTURE RECOMMENDATION
        </div>
        <div className="text-[10px] text-[#e2e8f0]">
          {posture === "CONCEAL" && "High exposure detected. Recommend CONCEAL posture: reduce electromagnetic emissions, enforce OPSEC lockdown, and minimize predictable physical patterns."}
          {posture === "REVEAL" && "Low exposure level. REVEAL posture is viable: force projection activities and presence operations can proceed at normal signature levels."}
          {posture === "MIXED" && "Mixed exposure indicators. Assess individual components before determining posture. Consider selective CONCEAL for highest-risk indicators while maintaining REVEAL for others."}
        </div>
      </div>
    </div>
  );
}
