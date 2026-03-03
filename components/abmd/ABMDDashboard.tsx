"use client";

import { useEffect, useState } from "react";
import { useIEStore } from "@/store/ie-store";
import type { ABMDState, MissileEvent } from "@/lib/mock-data";
import { MetricContractPanel } from "@/components/ui/MetricContractPanel";
import { ABMDTimeline } from "./ABMDTimeline";
import { MissileEventList } from "./MissileEventList";
import { EscalationIndexPanel } from "./EscalationIndexPanel";

function MetricCard({ label, value, unit, status }: { label: string; value: string | number; unit: string; status: "GREEN" | "AMBER" | "RED" }) {
  const colors = { GREEN: "#10b981", AMBER: "#f59e0b", RED: "#ef4444" };
  return (
    <div className="p-3 border rounded" style={{ borderColor: `${colors[status]}40`, background: `${colors[status]}08` }}>
      <div className="text-[9px] tracking-[0.12em] text-[#94a3b8] font-bold">{label}</div>
      <div className="text-2xl font-black mt-1" style={{ color: colors[status] }}>{value}</div>
      <div className="text-[9px] text-[#475569]">{unit}</div>
    </div>
  );
}

function ConfidenceBadge({ score }: { score: number }) {
  const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  const label = score >= 75 ? "HIGH" : score >= 50 ? "MEDIUM" : "LOW";
  return (
    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider" style={{ border: `1px solid ${color}60`, color, background: `${color}10` }}>
      {label} ({score})
    </span>
  );
}

export function ABMDDashboard() {
  const { activeGCC, setABMDState, abmdState } = useIEStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/abmd?gcc=${activeGCC}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data: ABMDState) => { setABMDState(data); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [activeGCC, setABMDState]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#00d4ff] text-sm font-bold tracking-widest animate-pulse">LOADING ABMD DATA...</div>
          <div className="text-[#475569] text-xs mt-2">Fetching missile event data for {activeGCC}</div>
        </div>
      </div>
    );
  }

  if (error || !abmdState) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-[#ef4444] text-sm">Error loading ABMD data: {error || "No data"}</div>
      </div>
    );
  }

  const { metrics, events, status, timeline } = abmdState;

  const statusColors = { GREEN: "#10b981", AMBER: "#f59e0b", RED: "#ef4444" };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Module Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-[#00d4ff] text-lg font-black tracking-widest">ABMD FUSION</span>
            <span className="px-2 py-0.5 rounded text-[8px] font-bold tracking-wider" style={{ border: `1px solid ${statusColors[status]}60`, color: statusColors[status], background: `${statusColors[status]}10` }}>
              {status}
            </span>
            <span className="px-2 py-0.5 rounded text-[8px] font-bold tracking-wider border border-[#f59e0b40] text-[#f59e0b] bg-[#f59e0b08]">
              TRL 4 PROTOTYPE
            </span>
          </div>
          <div className="text-[10px] text-[#475569] mt-1">
            Air & Ballistic Missile Defense OSINT Fusion — JP 3-01 | {activeGCC} AOR
          </div>
        </div>
        <div className="text-right text-[9px] text-[#475569]">
          <div>Last computed: {new Date(abmdState.computedAt).toLocaleTimeString()}</div>
          <div>{events.length} events tracked (7-day window)</div>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-4 gap-3">
        <MetricCard
          label="LAUNCH FREQUENCY (7D)"
          value={metrics.launchFrequency7d}
          unit="launches"
          status={metrics.launchFrequency7d > 15 ? "RED" : metrics.launchFrequency7d > 5 ? "AMBER" : "GREEN"}
        />
        <MetricCard
          label="INTERCEPT RATE"
          value={`${Math.round(metrics.interceptRate * 100)}%`}
          unit="claimed intercepts / total"
          status={metrics.interceptRate >= 0.7 ? "GREEN" : metrics.interceptRate >= 0.4 ? "AMBER" : "RED"}
        />
        <MetricCard
          label="ESCALATION INDEX"
          value={metrics.escalationIndex}
          unit="index 0-100"
          status={metrics.escalationIndex > 60 ? "RED" : metrics.escalationIndex > 25 ? "AMBER" : "GREEN"}
        />
        <MetricCard
          label="AVG OSINT CONFIDENCE"
          value={metrics.avgConfidence}
          unit="score 0-100"
          status={metrics.avgConfidence >= 75 ? "GREEN" : metrics.avgConfidence >= 50 ? "AMBER" : "RED"}
        />
      </div>

      {/* Metric contract drill-down */}
      <div className="flex gap-2 text-[9px]">
        {["ABM-FREQ", "ABM-INTERCEPT", "ABM-ESCALATION", "ABM-CONFIDENCE"].map((id) => (
          <button
            key={id}
            onClick={() => setSelectedMetric(selectedMetric === id ? null : id)}
            className={`px-2 py-1 rounded border transition-all ${
              selectedMetric === id
                ? "border-[#00d4ff] text-[#00d4ff] bg-[#00d4ff10]"
                : "border-[#1e3a5f] text-[#94a3b8] hover:border-[#00d4ff40]"
            }`}
          >
            {id}
          </button>
        ))}
      </div>
      {selectedMetric && (
        <div className="border border-[#1e3a5f] rounded p-3 bg-[#070d1a]">
          <MetricContractPanel metricId={selectedMetric} />
        </div>
      )}

      {/* Two-column layout: Timeline + Escalation */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <ABMDTimeline timeline={timeline} />
        </div>
        <div>
          <EscalationIndexPanel index={metrics.escalationIndex} events={events} />
        </div>
      </div>

      {/* Event List */}
      <MissileEventList events={events} />

      {/* Scoring transparency */}
      <div className="border border-[#1e3a5f] rounded p-3 bg-[#070d1a]">
        <div className="text-[9px] tracking-[0.12em] text-[#94a3b8] font-bold mb-2">CONFIDENCE SCORING METHOD</div>
        <div className="text-[9px] text-[#e2e8f0] space-y-1">
          <div>Cross-source count &ge; 3 &rarr; base score 90</div>
          <div>Cross-source count &ge; 2 &rarr; base score 70</div>
          <div>Single source &rarr; base score 40</div>
          <div className="text-[#475569]">Adjusted &plusmn;15% by source reliability rating (0-100)</div>
        </div>
      </div>

      {/* Dedup explanation */}
      <div className="border border-[#1e3a5f] rounded p-3 bg-[#070d1a]">
        <div className="text-[9px] tracking-[0.12em] text-[#94a3b8] font-bold mb-2">DEDUPLICATION METHOD</div>
        <div className="text-[9px] text-[#e2e8f0]">
          Events grouped by: <span className="font-mono text-[#00d4ff]">hash(location_grid_5&deg; + floor(timestamp/4h) + missile_type)</span>
        </div>
        <div className="text-[8px] text-[#475569] mt-1">
          Multiple OSINT reports describing the same event are merged. Cross-source count reflects unique sources per event cluster.
        </div>
      </div>
    </div>
  );
}
