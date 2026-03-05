"use client";

import { useIEStore } from "@/store/ie-store";
import { formatDTG } from "@/lib/utils";
import { useState, useEffect } from "react";
import { GCC_CONFIGS, type GCCId } from "@/lib/gcc-config";

const moduleLabels: Record<string, string> = {
  cop: "IE OVERLAY — COMMON OPERATIONAL PICTURE",
  "running-estimate": "RUNNING ESTIMATE — LIVE IE ASSESSMENT",
  "sensor-fusion": "LIVE SENSOR FUSION — OPEN-SOURCE FEED AGGREGATION",
  coa: "COA RECOMMENDATION ENGINE — DECISION SUPPORT",
  sigman: "SIGNATURE MANAGEMENT MONITOR",
  annex: "ANNEX I / ITCO GENERATOR — AUTOMATED PLAN PRODUCTION",
};

export function Header() {
  const { activeModule, alerts, acknowledgeAlert, activeGCC, setActiveGCC, liveFeedsFetchedAt, liveFeeds, runningEstimate } = useIEStore();
  const [currentDTG, setCurrentDTG] = useState(formatDTG());
  const [showAlerts, setShowAlerts] = useState(false);
  const [showGCCPicker, setShowGCCPicker] = useState(false);
  const unacked = alerts.filter((a) => !a.acknowledged);
  const gcc = GCC_CONFIGS[activeGCC];

  // Data freshness calculation
  const feedAgeMins = liveFeedsFetchedAt
    ? Math.floor((Date.now() - new Date(liveFeedsFetchedAt).getTime()) / 60000)
    : null;
  const feedStale = feedAgeMins !== null && feedAgeMins > 30;
  const feedFreshnessLabel = feedAgeMins === null
    ? "NO DATA"
    : feedAgeMins < 1 ? "< 1m ago"
    : feedAgeMins < 60 ? `${feedAgeMins}m ago`
    : `${Math.floor(feedAgeMins / 60)}h ago`;

  // IE condition from running estimate
  const ieConditionColor = runningEstimate.ieCondition === "HOSTILE"
    ? "#ef4444"
    : runningEstimate.ieCondition === "UNCERTAIN"
    ? "#f59e0b"
    : "#10b981";
  const ieConditionDotClass = runningEstimate.ieCondition === "HOSTILE"
    ? "danger"
    : runningEstimate.ieCondition === "UNCERTAIN"
    ? "warning"
    : "active";

  useEffect(() => {
    const interval = setInterval(() => setCurrentDTG(formatDTG()), 60000);
    return () => clearInterval(interval);
  }, []);

  const severityColor: Record<string, string> = {
    CRITICAL: "text-[#ef4444]",
    HIGH: "text-[#f97316]",
    MEDIUM: "text-[#f59e0b]",
    LOW: "text-[#10b981]",
  };

  return (
    <header className="bg-[#070d1a] border-b border-[#1e3a5f] px-4 py-3 relative z-20">
      <div className="flex items-center justify-between gap-4">
        {/* Left: module title */}
        <div className="min-w-0">
          <div className="text-[#00d4ff] text-sm font-bold tracking-widest truncate">
            {moduleLabels[activeModule] ?? "IE-SYNC"}
          </div>
          <div className="text-[#475569] text-xs font-mono mt-0.5">
            {gcc.name} // {gcc.aor} // IO DECISION SUPPORT
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3 flex-shrink-0">

          {/* GCC Selector */}
          <div className="relative">
            <button
              onClick={() => setShowGCCPicker(!showGCCPicker)}
              className="flex items-center gap-2 px-3 py-1.5 border rounded transition-colors hover:border-[#0891b2]"
              style={{ borderColor: gcc.color, background: `${gcc.color}10` }}
            >
              <span className="text-lg leading-none">{gcc.flag}</span>
              <div className="text-left">
                <div className="text-xs font-bold" style={{ color: gcc.color }}>{gcc.abbr}</div>
                <div className="text-[9px] text-[#475569]">{gcc.region}</div>
              </div>
              <svg className="w-3 h-3 text-[#475569]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showGCCPicker && (
              <div className="absolute right-0 top-10 w-72 bg-[#0f1829] border border-[#1e3a5f] rounded shadow-2xl z-50">
                <div className="p-2 border-b border-[#1e3a5f]">
                  <div className="text-[#00d4ff] text-[10px] font-bold tracking-wider px-1">SELECT GEOGRAPHIC COMMAND</div>
                </div>
                <div className="p-2 space-y-1">
                  {(Object.entries(GCC_CONFIGS) as [GCCId, typeof gcc][]).map(([id, cfg]) => (
                    <button
                      key={id}
                      onClick={() => { setActiveGCC(id); setShowGCCPicker(false); }}
                      className={`w-full flex items-center gap-3 p-2 rounded text-left transition-colors hover:bg-[#162035] ${activeGCC === id ? "bg-[#162035]" : ""}`}
                    >
                      <span className="text-xl">{cfg.flag}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.abbr}</div>
                        <div className="text-[#94a3b8] text-[10px] truncate">{cfg.name}</div>
                        <div className="text-[#475569] text-[9px]">{cfg.aor}</div>
                      </div>
                      {activeGCC === id && (
                        <span className="text-[#00d4ff] text-xs">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* DTG */}
          <div className="text-right">
            <div className="text-[#00d4ff] text-xs font-mono tracking-widest">{currentDTG}</div>
            <div className="text-[#475569] text-[10px]">ZULU</div>
          </div>

          {/* Alert bell */}
          <div className="relative">
            <button
              onClick={() => { setShowAlerts(!showAlerts); setShowGCCPicker(false); }}
              className="relative p-2 border border-[#1e3a5f] rounded hover:border-[#ef4444] transition-colors"
            >
              <svg className="w-4 h-4 text-[#94a3b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unacked.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#ef4444] rounded-full text-[10px] font-bold text-white flex items-center justify-center pulse-alert">
                  {unacked.length}
                </span>
              )}
            </button>

            {showAlerts && (
              <div className="absolute right-0 top-10 w-96 bg-[#0f1829] border border-[#1e3a5f] rounded shadow-2xl z-50 max-h-96 overflow-y-auto">
                <div className="p-3 border-b border-[#1e3a5f] flex items-center justify-between">
                  <span className="text-[#00d4ff] text-xs font-bold tracking-wider">ACTIVE ALERTS — {gcc.abbr}</span>
                  <button onClick={() => setShowAlerts(false)} className="text-[#475569] hover:text-white text-xs">✕</button>
                </div>
                {alerts.map((alert) => (
                  <div key={alert.id} className={`p-3 border-b border-[#1e3a5f] ${alert.acknowledged ? "opacity-40" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className={`text-[10px] font-bold mb-1 ${severityColor[alert.severity]}`}>
                          [{alert.severity}] {alert.source}
                        </div>
                        <div className="text-[#e2e8f0] text-xs">{alert.message}</div>
                        <div className="text-[#475569] text-[10px] mt-1 font-mono">{alert.timestamp}</div>
                      </div>
                      {!alert.acknowledged && (
                        <button
                          onClick={() => acknowledgeAlert(alert.id)}
                          className="text-[10px] text-[#00d4ff] hover:text-white border border-[#0891b2] px-2 py-0.5 rounded flex-shrink-0"
                        >
                          ACK
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Data Freshness SLA indicator */}
          <div
            className="flex flex-col items-end px-2 py-1 border rounded text-right"
            style={{
              borderColor: feedStale ? "#ef4444" : feedAgeMins === null ? "#334155" : "#1e3a5f",
              background: feedStale ? "#ef444408" : "transparent",
            }}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={`status-dot ${feedStale ? "danger pulse-alert" : feedAgeMins === null ? "" : "active"}`}
              />
              <span
                className="text-[10px] font-mono font-bold"
                style={{ color: feedStale ? "#ef4444" : feedAgeMins === null ? "#334155" : "#10b981" }}
              >
                OSINT {feedStale ? "STALE" : feedAgeMins === null ? "PENDING" : "FRESH"}
              </span>
            </div>
            <span className="text-[9px] text-[#475569] font-mono">
              {feedFreshnessLabel} · {liveFeeds.length} articles · SLA 30m
            </span>
          </div>

          {/* IE Condition badge — driven by running estimate */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 border rounded"
            style={{ borderColor: ieConditionColor, background: `${ieConditionColor}15` }}
          >
            <span className={`status-dot ${ieConditionDotClass}`} />
            <span className="text-xs font-bold tracking-widest" style={{ color: ieConditionColor }}>
              IE: {runningEstimate.ieCondition}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
