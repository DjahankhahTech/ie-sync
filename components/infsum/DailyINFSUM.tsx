"use client";

import { useState, useEffect } from "react";
import { useIEStore } from "@/store/ie-store";
import { GCC_CONFIGS } from "@/lib/gcc-config";
import { useINFSUM } from "@/hooks/useINFSUM";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const THREAT_COLORS: Record<string, string> = {
  "Cyber Operation": "#3b82f6",
  "Disinformation": "#ef4444",
  "Influence Op": "#f59e0b",
  "Kinetic": "#ec4899",
  "Escalation": "#a855f7",
};

export function DailyINFSUM() {
  // The AI Executive Summary lives in the store — posted 3x daily (0600/1200/
  // 1800 ET), server-cached, and prefetched in the background on app load so
  // it's typically ready before the user reads it. setActiveGCC clears it on
  // switch, so a stale summary is never shown while the new AOR's loads.
  const { infsum, infsumLoading, infsumError, activeGCC, aiSummary: ai, aiSummaryLoading: aiLoading, aiSummaryError: aiError, loadAISummary } = useIEStore();
  const { refetch } = useINFSUM();
  const gcc = GCC_CONFIGS[activeGCC];
  const [expanded, setExpanded] = useState(true);

  // Ensure the summary is loaded if the background prefetch hasn't (e.g. direct
  // mount); guarded so it won't double-fetch.
  useEffect(() => {
    if (!ai && !aiLoading) loadAISummary(activeGCC);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGCC]);

  if (infsumLoading && !infsum) {
    return (
      <div className="tactical-card flex-shrink-0">
        <div className="px-4 py-6 flex items-center justify-center">
          <div className="text-[#00d4ff] text-xs font-mono animate-pulse tracking-widest">
            GENERATING DAILY INFORMATION SUMMARY...
          </div>
        </div>
      </div>
    );
  }

  if (infsumError && !infsum) {
    return (
      <div className="tactical-card flex-shrink-0">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="text-[#ef4444] text-xs font-mono">Couldn’t build the daily summary: {infsumError} — press Retry.</div>
          <button onClick={refetch} className="text-[9px] border border-[#ef4444] text-[#ef4444] px-2 py-0.5 rounded hover:bg-[#ef444415]">
            RETRY
          </button>
        </div>
      </div>
    );
  }

  if (!infsum) return null;

  const threatData = Object.entries(infsum.threatCounts)
    .map(([name, count]) => ({ name: name.replace(" Operation", " Op"), count, fill: THREAT_COLORS[name] || "#475569" }))
    .filter((d) => d.count > 0);

  const feedAgeHrs = infsum.generatedAt
    ? Math.floor((Date.now() - new Date(infsum.generatedAt).getTime()) / 3600000)
    : null;

  return (
    <div className="tactical-card flex-shrink-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1e3a5f] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[#00d4ff] text-sm font-mono hover:text-white transition-colors"
          >
            {expanded ? "▼" : "▶"}
          </button>
          <div>
            <div className="text-[15px] font-bold">
              Daily information summary — {gcc.abbr}
            </div>
            <div className="text-[13px] text-muted mt-0.5">
              {infsum.classification} · {infsum.dtg} · {infsum.period}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Freshness */}
          <div className="flex items-center gap-1.5 text-[9px] font-mono">
            <span className={`status-dot ${feedAgeHrs !== null && feedAgeHrs > 24 ? "warning" : "active"}`} />
            <span className="text-[#475569]">
              {feedAgeHrs !== null ? (feedAgeHrs < 1 ? "< 1h ago" : `${feedAgeHrs}h ago`) : "—"}
            </span>
          </div>
          {/* Feed health */}
          <div className="flex items-center gap-1 text-[9px] font-mono">
            <span className="text-[#475569]">FEEDS:</span>
            {infsum.feedHealth.map((f) => (
              <span
                key={f.name}
                className={f.status === "OK" ? "text-[#10b981]" : "text-[#ef4444]"}
                title={`${f.name}: ${f.status}`}
              >
                {f.status === "OK" ? "●" : "✗"}
              </span>
            ))}
          </div>
          <button
            onClick={refetch}
            disabled={infsumLoading}
            className="text-[9px] border rounded px-2 py-0.5 hover:bg-[#1e3a5f] transition-colors disabled:opacity-50"
            style={{ borderColor: gcc.color, color: gcc.color }}
          >
            {infsumLoading ? "UPDATING..." : "↻ REFRESH"}
          </button>
        </div>
      </div>

      {/* Collapsible body */}
      {expanded && (
        <div className="p-4 space-y-4">
          {/* ── AI Executive Summary (overall AI-generated INFSUM) ── */}
          <div className="border border-[#0891b2] rounded p-3 bg-[#0891b208]">
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
              <div className="text-[#00d4ff] text-[10px] font-bold tracking-widest">AI EXECUTIVE SUMMARY — Claude · auto-updated 0600 / 1200 / 1800 ET</div>
              <div className="flex items-center gap-2">
                {ai && <span className="text-[#475569] text-[9px] font-mono">as of {new Date(ai.generatedAt).toLocaleString()}</span>}
                <button
                  onClick={() => loadAISummary(activeGCC, true)}
                  disabled={aiLoading}
                  className="text-[10px] border border-[#00d4ff] text-[#00d4ff] px-2.5 py-1 rounded hover:bg-[#00d4ff15] disabled:opacity-50 font-bold tracking-wider"
                >
                  {aiLoading ? "LOADING…" : "↻ REFRESH"}
                </button>
              </div>
            </div>
            {aiError && <div className="text-[#ef4444] text-[11px] font-mono">✗ {aiError}</div>}
            {aiLoading && !ai && (
              <div className="text-[#475569] text-[11px]">Loading today&apos;s AI information summary…</div>
            )}
            {ai && (
              <div className="space-y-2 text-[11px] leading-relaxed">
                <div className="text-[#e2e8f0]"><span className="text-[#f59e0b] font-bold">BLUF: </span>{ai.summary.bluf}</div>
                {([
                  ["KEY DEVELOPMENTS", ai.summary.keyDevelopments],
                  ["IO / THREAT ACTIVITY", ai.summary.ioThreatActivity],
                  ["NARRATIVE TRENDS", ai.summary.narrativeTrends],
                ] as [string, string[]][]).map(([title, items]) => (
                  <div key={title}>
                    <div className="text-[#475569] text-[9px] tracking-wider mt-1">{title}</div>
                    {items.map((x, i) => <div key={i} className="text-[#94a3b8]">• {x}</div>)}
                  </div>
                ))}
                <div className="text-[#cbd5e1]"><span className="text-[#00d4ff] font-bold">ASSESSMENT: </span>{ai.summary.assessment}</div>
                <div>
                  <div className="text-[#475569] text-[9px] tracking-wider mt-1">WATCH ITEMS (24–72H)</div>
                  {ai.summary.watchItems.map((x, i) => <div key={i} className="text-[#94a3b8]">• {x}</div>)}
                </div>
                {ai.references && ai.references.length > 0 && (
                  <div className="pt-1.5 border-t border-[#1e3a5f]">
                    <div className="text-[#475569] text-[9px] tracking-wider mb-1">REFERENCES ({ai.references.length})</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0.5">
                      {ai.references.map((ref, i) => (
                        <a
                          key={i}
                          href={ref.url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-[#0891b2] hover:text-[#00d4ff] truncate block"
                          title={`${ref.title} — ${ref.source}`}
                        >
                          [{i + 1}] {ref.source ? `${ref.source}: ` : ""}{ref.title} ↗
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                <div className="text-[9px] text-[#475569] pt-1.5 border-t border-[#1e3a5f]">
                  <span className="text-[#f59e0b]">{ai.classification} · AI-DRAFT</span> · {ai.sourceCount} sources · auto-updated 0600/1200/1800 ET · {ai.model} · human review required
                </div>
              </div>
            )}
          </div>

          {/* ── Top Events + Threat Chart Row ── */}
          <div className="grid grid-cols-3 gap-4">
            {/* Top Events — 2/3 */}
            <div className="col-span-2 space-y-2">
              <div className="text-[#00d4ff] text-[10px] font-bold tracking-widest mb-2">
                AOR SITUATION — TOP EVENTS ({infsum.totalArticlesIngested} articles ingested from {infsum.sourcesQueried} sources)
              </div>
              {infsum.topEvents.map((event, i) => {
                const timeAgo = (() => {
                  try {
                    const diff = Date.now() - new Date(event.published).getTime();
                    const hrs = Math.floor(diff / 3600000);
                    if (hrs < 1) return `${Math.floor(diff / 60000)}m`;
                    if (hrs < 24) return `${hrs}h`;
                    return `${Math.floor(hrs / 24)}d`;
                  } catch { return ""; }
                })();
                const scoreColor = event.relevanceScore >= 60 ? "#ef4444" : event.relevanceScore >= 40 ? "#f97316" : "#f59e0b";
                return (
                  <div key={i} className="flex items-start gap-2 py-1.5 border-b border-[#1e3a5f] last:border-0">
                    <span className="text-[10px] font-black flex-shrink-0 w-6 text-right" style={{ color: scoreColor }}>
                      {event.relevanceScore}
                    </span>
                    <div className="flex-1 min-w-0">
                      <a href={event.link} target="_blank" rel="noopener noreferrer"
                        className="text-[#e2e8f0] text-[11px] hover:text-[#00d4ff] transition-colors line-clamp-1">
                        {event.title}
                      </a>
                      <div className="flex items-center gap-2 mt-0.5 text-[9px] font-mono">
                        <span className="text-[#475569]">{event.source}</span>
                        <span className="text-[#334155]">•</span>
                        <span className="text-[#475569]">{timeAgo} ago</span>
                        {event.threatIndicators.map((t) => (
                          <span key={t} className="text-[#ef4444]">[{t}]</span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Threat Category Chart — 1/3 */}
            <div>
              <div className="text-[#00d4ff] text-[10px] font-bold tracking-widest mb-2">
                THREAT CATEGORY BREAKDOWN
              </div>
              {threatData.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={threatData} layout="vertical" margin={{ left: 0, right: 8 }}>
                    <XAxis type="number" tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} width={80} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "#0a0e1a", border: "1px solid #1e3a5f", fontSize: 10, fontFamily: "monospace" }}
                      labelStyle={{ color: "#00d4ff" }}
                    />
                    <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                      {threatData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-[#334155] text-[10px] font-mono py-8 text-center">NO THREAT INDICATORS MATCHED</div>
              )}
            </div>
          </div>

          {/* ── IO Activity + Narrative Trends Row ── */}
          <div className="grid grid-cols-2 gap-4">
            {/* IO-Relevant Activity */}
            <div>
              <div className="text-[#f59e0b] text-[10px] font-bold tracking-widest mb-2">
                IO-RELEVANT ACTIVITY ({infsum.ioActivity.length} items)
              </div>
              <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                {infsum.ioActivity.length === 0 && (
                  <div className="text-[#334155] text-[10px] font-mono py-4 text-center">NO IO-RELEVANT ITEMS DETECTED THIS PERIOD</div>
                )}
                {infsum.ioActivity.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 py-1 border-b border-[#1e3a5f30] last:border-0">
                    <div className="flex-shrink-0 mt-0.5">
                      {item.threatIndicators.slice(0, 1).map((t) => (
                        <span
                          key={t}
                          className="text-[8px] font-black px-1 py-0.5 rounded"
                          style={{ background: `${THREAT_COLORS[t] || "#475569"}20`, color: THREAT_COLORS[t] || "#475569" }}
                        >
                          {t.replace(" Operation", "")}
                        </span>
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <a href={item.link} target="_blank" rel="noopener noreferrer"
                        className="text-[#e2e8f0] text-[10px] hover:text-[#00d4ff] line-clamp-1">
                        {item.title}
                      </a>
                      <div className="text-[#475569] text-[8px] font-mono">{item.source}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Narrative Trends */}
            <div>
              <div className="text-[#a855f7] text-[10px] font-bold tracking-widest mb-2">
                NARRATIVE TRENDS (keyword frequency across feeds)
              </div>
              {infsum.narrativeTrends.length === 0 ? (
                <div className="text-[#334155] text-[10px] font-mono py-4 text-center">INSUFFICIENT DATA FOR TREND ANALYSIS</div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {infsum.narrativeTrends.map((trend, i) => {
                    const [word, countStr] = trend.split(" (");
                    const count = parseInt(countStr || "0");
                    const intensity = Math.min(1, count / 10);
                    return (
                      <span
                        key={i}
                        className="text-[10px] font-mono px-2 py-1 rounded border"
                        style={{
                          borderColor: `rgba(168, 85, 247, ${0.2 + intensity * 0.6})`,
                          background: `rgba(168, 85, 247, ${0.05 + intensity * 0.15})`,
                          color: `rgba(168, 85, 247, ${0.5 + intensity * 0.5})`,
                        }}
                      >
                        {word} <span className="text-[8px] opacity-60">×{count}</span>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Watch Items */}
              {infsum.watchItems.length > 0 && (
                <div className="mt-3">
                  <div className="text-[#ef4444] text-[10px] font-bold tracking-widest mb-1.5">
                    RECOMMENDED WATCH ITEMS (score ≥ 50)
                  </div>
                  {infsum.watchItems.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex items-center gap-2 py-1 text-[10px]">
                      <span className="text-[#ef4444] font-black">{item.relevanceScore}</span>
                      <a href={item.link} target="_blank" rel="noopener noreferrer"
                        className="text-[#e2e8f0] hover:text-[#00d4ff] truncate flex-1">
                        {item.title}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer methodology note */}
          <div className="text-[8px] font-mono text-[#334155] border-t border-[#1e3a5f] pt-2">
            <span className="text-[#475569]">HOW THIS WAS BUILT:</span> {infsum.sourcesQueried} public news feeds, scored by keyword matching only — no AI analysis at this step. &quot;Threat categories&quot; just count matched words; they are not an intel assessment. Narrative trends show words appearing 3+ times across today&apos;s articles. <span className="text-[#ef4444]">FOR PLANNING USE ONLY — AN ANALYST MUST VERIFY BEFORE ANYTHING HERE IS ACTED ON.</span>
          </div>
        </div>
      )}
    </div>
  );
}
