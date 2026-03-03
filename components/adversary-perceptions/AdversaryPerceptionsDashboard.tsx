"use client";

import { useEffect, useState } from "react";
import { useIEStore } from "@/store/ie-store";
import type { AdversaryPerceptionState, AdversaryMediaItem, PerceptionShiftEvent } from "@/lib/mock-data";
import { MetricContractPanel } from "@/components/ui/MetricContractPanel";

const SENTIMENT_COLORS: Record<string, string> = {
  HOSTILE: "#ef4444",
  PROVOCATIVE: "#f59e0b",
  DEFENSIVE: "#3b82f6",
  NEUTRAL: "#94a3b8",
  CONCILIATORY: "#10b981",
};

function SentimentBadge({ category }: { category: string }) {
  const color = SENTIMENT_COLORS[category] || "#94a3b8";
  return (
    <span className="px-1.5 py-0.5 rounded text-[7px] font-bold tracking-wider" style={{ border: `1px solid ${color}50`, color, background: `${color}10` }}>
      {category}
    </span>
  );
}

function MediaItemRow({ item }: { item: AdversaryMediaItem }) {
  const sentColor = item.sentiment < -0.5 ? "#ef4444" : item.sentiment < 0 ? "#f59e0b" : "#10b981";
  return (
    <div className="py-2 border-b border-[#1e3a5f30]">
      <div className="flex items-center gap-2 text-[9px]">
        <SentimentBadge category={item.sentimentCategory} />
        <span className="text-[#00d4ff] font-bold">{item.source}</span>
        <span className="text-[#475569]">[{item.language}]</span>
        <span className="text-[#475569] ml-auto font-mono">
          {new Date(item.publishedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      <div className="text-[9px] text-[#e2e8f0] mt-1">{item.title}</div>
      <div className="flex items-center gap-3 mt-1 text-[8px]">
        <span style={{ color: sentColor }} className="font-bold">sentiment: {item.sentiment.toFixed(2)}</span>
        <span className="text-[#475569]">reach: {(item.reach / 1000000).toFixed(1)}M</span>
        {item.matchedKeywords.length > 0 && (
          <span className="text-[#475569]">keywords: {item.matchedKeywords.join(", ")}</span>
        )}
      </div>
    </div>
  );
}

function ShiftEventRow({ event }: { event: PerceptionShiftEvent }) {
  const delta = event.sentimentAfter - event.sentimentBefore;
  const color = delta < -0.15 ? "#ef4444" : delta > 0.1 ? "#10b981" : "#f59e0b";
  return (
    <div className="flex items-center gap-3 py-2 border-b border-[#1e3a5f30] text-[9px]">
      <span className="text-[#94a3b8] font-mono w-20">
        {new Date(event.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
      </span>
      <span className="text-[#e2e8f0] flex-1">{event.triggerEvent}</span>
      <span className="text-[#475569]">{event.sentimentBefore.toFixed(2)}</span>
      <span style={{ color }} className="font-bold">→ {event.sentimentAfter.toFixed(2)}</span>
      <span className="px-1 py-0.5 rounded text-[7px] font-bold" style={{ color, border: `1px solid ${color}50` }}>
        Δ{delta > 0 ? "+" : ""}{delta.toFixed(2)}
      </span>
    </div>
  );
}

export function AdversaryPerceptionsDashboard() {
  const { activeGCC, setAdversaryPerceptions, adversaryPerceptions } = useIEStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showContract, setShowContract] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/adversary-perceptions?gcc=${activeGCC}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data: AdversaryPerceptionState) => { setAdversaryPerceptions(data); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [activeGCC, setAdversaryPerceptions]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-[#00d4ff] text-sm font-bold tracking-widest animate-pulse">ANALYZING ADVERSARY MEDIA...</div>
      </div>
    );
  }

  if (error || !adversaryPerceptions) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-[#ef4444] text-sm">Error: {error || "No data"}</div>
      </div>
    );
  }

  const { overallSentiment, sentimentCategory, escalationIndex, mediaItems, shiftEvents, mediaVolume24h } = adversaryPerceptions;
  const sentColor = SENTIMENT_COLORS[sentimentCategory] || "#94a3b8";
  const escColor = escalationIndex > 60 ? "#ef4444" : escalationIndex > 25 ? "#f59e0b" : "#10b981";

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-[#00d4ff] text-lg font-black tracking-widest">ADVERSARY PERCEPTIONS</span>
            <SentimentBadge category={sentimentCategory} />
            <span className="px-2 py-0.5 rounded text-[8px] font-bold tracking-wider border border-[#f59e0b40] text-[#f59e0b] bg-[#f59e0b08]">
              TRL 4 PROTOTYPE
            </span>
          </div>
          <div className="text-[10px] text-[#475569] mt-1">
            State Media Sentiment Analysis — JP 3-13 §3-8 | {activeGCC} AOR | Rule-based (NO black-box AI)
          </div>
        </div>
      </div>

      {/* Metrics bar */}
      <div className="grid grid-cols-4 gap-3">
        <div className="p-3 border rounded border-[#1e3a5f] bg-[#070d1a]">
          <div className="text-[9px] tracking-[0.12em] text-[#94a3b8] font-bold">OVERALL SENTIMENT</div>
          <div className="text-2xl font-black mt-1" style={{ color: sentColor }}>{overallSentiment.toFixed(2)}</div>
          <div className="text-[9px] text-[#475569]">scale -1.0 to +1.0</div>
        </div>
        <div className="p-3 border rounded border-[#1e3a5f] bg-[#070d1a]">
          <div className="text-[9px] tracking-[0.12em] text-[#94a3b8] font-bold">ESCALATION INDEX</div>
          <div className="text-2xl font-black mt-1" style={{ color: escColor }}>{escalationIndex}</div>
          <div className="text-[9px] text-[#475569]">index 0-100</div>
        </div>
        <div className="p-3 border rounded border-[#1e3a5f] bg-[#070d1a]">
          <div className="text-[9px] tracking-[0.12em] text-[#94a3b8] font-bold">MEDIA VOLUME (24H)</div>
          <div className="text-2xl font-black mt-1 text-[#e2e8f0]">{mediaVolume24h}</div>
          <div className="text-[9px] text-[#475569]">articles tracked</div>
        </div>
        <div className="p-3 border rounded border-[#1e3a5f] bg-[#070d1a]">
          <div className="text-[9px] tracking-[0.12em] text-[#94a3b8] font-bold">PERCEPTION SHIFTS</div>
          <div className="text-2xl font-black mt-1 text-[#f59e0b]">{shiftEvents.length}</div>
          <div className="text-[9px] text-[#475569]">events detected (72h)</div>
        </div>
      </div>

      {/* Sentiment taxonomy */}
      <div className="border border-[#1e3a5f] rounded p-3 bg-[#070d1a]">
        <div className="text-[9px] tracking-[0.12em] text-[#94a3b8] font-bold mb-2">SENTIMENT TAXONOMY (RULE-BASED)</div>
        <div className="flex gap-4 text-[9px]">
          {Object.entries(SENTIMENT_COLORS).map(([cat, color]) => {
            const count = mediaItems.filter((m) => m.sentimentCategory === cat).length;
            return (
              <div key={cat} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm" style={{ background: color }} />
                <span style={{ color }} className="font-bold">{cat}</span>
                <span className="text-[#475569]">({count})</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metric contract */}
      <button onClick={() => setShowContract(!showContract)} className="text-[9px] text-[#00d4ff] hover:underline">
        {showContract ? "▼ Hide" : "▶ Show"} Metric Contracts (AP-*)
      </button>
      {showContract && (
        <div className="space-y-2">
          {["AP-SHIFT", "AP-ESCALATION", "AP-VOLUME"].map((id) => (
            <div key={id} className="border border-[#1e3a5f] rounded p-3 bg-[#070d1a]">
              <MetricContractPanel metricId={id} />
            </div>
          ))}
        </div>
      )}

      {/* Shift events */}
      {shiftEvents.length > 0 && (
        <div className="border border-[#1e3a5f] rounded p-3 bg-[#070d1a]">
          <div className="text-[9px] tracking-[0.12em] text-[#94a3b8] font-bold mb-2">PERCEPTION SHIFT EVENTS ({shiftEvents.length})</div>
          {shiftEvents.map((event) => <ShiftEventRow key={event.id} event={event} />)}
        </div>
      )}

      {/* Media feed */}
      <div className="border border-[#1e3a5f] rounded p-3 bg-[#070d1a]">
        <div className="text-[9px] tracking-[0.12em] text-[#94a3b8] font-bold mb-2">ADVERSARY MEDIA FEED ({mediaItems.length})</div>
        {mediaItems.map((item) => <MediaItemRow key={item.id} item={item} />)}
      </div>
    </div>
  );
}
