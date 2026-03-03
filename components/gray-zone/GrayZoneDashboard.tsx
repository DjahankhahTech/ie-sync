"use client";

import { useEffect, useState } from "react";
import { useIEStore } from "@/store/ie-store";
import type { GrayZoneState, GrayZoneIncident, GrayZoneCategory } from "@/lib/mock-data";
import { MetricContractPanel } from "@/components/ui/MetricContractPanel";

const CATEGORY_ICONS: Record<GrayZoneCategory, { icon: string; color: string; label: string }> = {
  UNDERSEA_CABLE: { icon: "⚡", color: "#ef4444", label: "CABLE" },
  AIS_ANOMALY: { icon: "📡", color: "#f59e0b", label: "AIS" },
  FISHING_MILITIA: { icon: "🚢", color: "#3b82f6", label: "MILITIA" },
  EEZ_VIOLATION: { icon: "⚠", color: "#f59e0b", label: "EEZ" },
  ADIZ_INCURSION: { icon: "✈", color: "#ef4444", label: "ADIZ" },
  UAS_INCIDENT: { icon: "🛸", color: "#a855f7", label: "UAS" },
};

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "#ef4444",
  HIGH: "#f59e0b",
  MEDIUM: "#3b82f6",
  LOW: "#94a3b8",
};

function IncidentRow({ incident }: { incident: GrayZoneIncident }) {
  const cat = CATEGORY_ICONS[incident.category];
  const sevColor = SEVERITY_COLORS[incident.severity] || "#94a3b8";
  const statusColor = incident.status === "ACTIVE" ? "#ef4444" : incident.status === "MONITORING" ? "#f59e0b" : "#10b981";

  return (
    <div className="py-2 border-b border-[#1e3a5f30]">
      <div className="flex items-center gap-2 text-[9px]">
        <span className="px-1.5 py-0.5 rounded text-[7px] font-bold" style={{ border: `1px solid ${cat.color}50`, color: cat.color }}>
          {cat.icon} {cat.label}
        </span>
        <span className="px-1 py-0.5 rounded text-[7px] font-bold" style={{ color: sevColor, border: `1px solid ${sevColor}50` }}>
          {incident.severity}
        </span>
        <span className="text-[#e2e8f0] flex-1">{incident.title}</span>
        <span className="font-bold text-[8px]" style={{ color: statusColor }}>{incident.status}</span>
      </div>
      <div className="flex items-center gap-3 mt-1 text-[8px] text-[#475569]">
        <span>Actor: <span className="text-[#94a3b8]">{incident.suspectedActor}</span></span>
        <span>Confidence: <span className="text-[#94a3b8]">{incident.attributionConfidence}%</span></span>
        <span>Location: <span className="font-mono text-[#94a3b8]">{incident.location[0].toFixed(1)}°, {incident.location[1].toFixed(1)}°</span></span>
        <span className="ml-auto font-mono">{new Date(incident.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
      </div>
    </div>
  );
}

function CategoryBreakdown({ incidents }: { incidents: GrayZoneIncident[] }) {
  const counts = new Map<GrayZoneCategory, number>();
  for (const inc of incidents) {
    counts.set(inc.category, (counts.get(inc.category) || 0) + 1);
  }

  return (
    <div className="border border-[#1e3a5f] rounded p-3 bg-[#070d1a]">
      <div className="text-[9px] tracking-[0.12em] text-[#94a3b8] font-bold mb-2">CATEGORY BREAKDOWN</div>
      <div className="space-y-1.5">
        {Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([cat, count]) => {
          const info = CATEGORY_ICONS[cat];
          return (
            <div key={cat} className="flex items-center gap-2 text-[9px]">
              <span style={{ color: info.color }}>{info.icon}</span>
              <span className="w-20 text-[#e2e8f0]">{info.label}</span>
              <div className="flex-1 h-1.5 bg-[#1e3a5f] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${(count / incidents.length) * 100}%`, background: info.color }} />
              </div>
              <span className="w-6 text-right font-bold" style={{ color: info.color }}>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function GrayZoneDashboard() {
  const { activeGCC, setGrayZoneState, grayZoneState } = useIEStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showContract, setShowContract] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/gray-zone?gcc=${activeGCC}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data: GrayZoneState) => { setGrayZoneState(data); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [activeGCC, setGrayZoneState]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-[#00d4ff] text-sm font-bold tracking-widest animate-pulse">LOADING GRAY ZONE DATA...</div>
      </div>
    );
  }

  if (error || !grayZoneState) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-[#ef4444] text-sm">Error: {error || "No data"}</div>
      </div>
    );
  }

  const { activityIndex, status, incidents, correlationScore } = grayZoneState;
  const statusColors = { GREEN: "#10b981", AMBER: "#f59e0b", RED: "#ef4444" };
  const corrColor = correlationScore > 0.6 ? "#ef4444" : correlationScore > 0.3 ? "#f59e0b" : "#10b981";

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-[#00d4ff] text-lg font-black tracking-widest">GRAY ZONE ACTIVITY</span>
            <span className="px-2 py-0.5 rounded text-[8px] font-bold tracking-wider" style={{ border: `1px solid ${statusColors[status]}60`, color: statusColors[status], background: `${statusColors[status]}10` }}>
              {status}
            </span>
            <span className="px-2 py-0.5 rounded text-[8px] font-bold tracking-wider border border-[#f59e0b40] text-[#f59e0b] bg-[#f59e0b08]">
              TRL 4 PROTOTYPE
            </span>
          </div>
          <div className="text-[10px] text-[#475569] mt-1">
            Sub-Threshold Activity Monitoring — JP 3-0 §II-8 | {activeGCC} AOR
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 border rounded border-[#1e3a5f] bg-[#070d1a]">
          <div className="text-[9px] tracking-[0.12em] text-[#94a3b8] font-bold">ACTIVITY INDEX</div>
          <div className="text-3xl font-black mt-1" style={{ color: statusColors[status] }}>{activityIndex}</div>
          <div className="text-[9px] text-[#475569]">severity-weighted, 7-day</div>
        </div>
        <div className="p-3 border rounded border-[#1e3a5f] bg-[#070d1a]">
          <div className="text-[9px] tracking-[0.12em] text-[#94a3b8] font-bold">INCIDENTS (7D)</div>
          <div className="text-3xl font-black mt-1 text-[#e2e8f0]">{incidents.length}</div>
          <div className="text-[9px] text-[#475569]">active: {incidents.filter((i) => i.status === "ACTIVE").length}</div>
        </div>
        <div className="p-3 border rounded border-[#1e3a5f] bg-[#070d1a]">
          <div className="text-[9px] tracking-[0.12em] text-[#94a3b8] font-bold">NARRATIVE CORRELATION</div>
          <div className="text-3xl font-black mt-1" style={{ color: corrColor }}>r={correlationScore.toFixed(2)}</div>
          <div className="text-[8px] text-[#f59e0b]">⚠ correlation ≠ causation</div>
        </div>
      </div>

      {/* Category breakdown + Metric contract */}
      <div className="grid grid-cols-2 gap-4">
        <CategoryBreakdown incidents={incidents} />
        <div className="space-y-2">
          <button onClick={() => setShowContract(!showContract)} className="text-[9px] text-[#00d4ff] hover:underline">
            {showContract ? "▼ Hide" : "▶ Show"} Metric Contracts (GZ-*)
          </button>
          {showContract && (
            <>
              {["GZ-ACTIVITY", "GZ-CORRELATION"].map((id) => (
                <div key={id} className="border border-[#1e3a5f] rounded p-3 bg-[#070d1a]">
                  <MetricContractPanel metricId={id} />
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Incident list */}
      <div className="border border-[#1e3a5f] rounded p-3 bg-[#070d1a]">
        <div className="text-[9px] tracking-[0.12em] text-[#94a3b8] font-bold mb-2">INCIDENTS ({incidents.length})</div>
        {incidents.map((inc) => <IncidentRow key={inc.id} incident={inc} />)}
      </div>

      {/* Correlation disclaimer */}
      <div className="border border-[#f59e0b40] rounded p-3 bg-[#f59e0b08]">
        <div className="text-[9px] tracking-[0.12em] text-[#f59e0b] font-bold mb-1">ANALYTICAL CAVEAT</div>
        <div className="text-[9px] text-[#e2e8f0]">
          The narrative correlation score (r={correlationScore.toFixed(2)}) measures statistical association between gray zone incident frequency and adversary media sentiment shifts.
          <span className="font-bold text-[#f59e0b]"> Correlation does NOT imply causation.</span> Confounding variables including diplomatic events, exercises, and seasonal patterns are not controlled for. Use as one indicator among many.
        </div>
      </div>
    </div>
  );
}
