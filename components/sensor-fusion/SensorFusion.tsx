"use client";

import { useState } from "react";
import { useIEStore } from "@/store/ie-store";
import { GCC_CONFIGS } from "@/lib/gcc-config";
import { useLiveFeeds } from "@/hooks/useLiveFeeds";
import { type LiveFeedItem } from "@/app/api/feeds/route";
import { confidenceColor } from "@/lib/utils";
import { GlossaryPanel } from "@/components/ui/GlossaryPanel";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export function SensorFusion() {
  const {
    activeGCC, liveFeeds, liveFeedsLoading, liveFeedsError, liveFeedsFetchedAt,
    addAlert, escalateFeedItem, escalatedItems,
  } = useIEStore();
  const { refetch } = useLiveFeeds();
  const gcc = GCC_CONFIGS[activeGCC];

  const [filterIO, setFilterIO] = useState(false);
  const [filterThreat, setFilterThreat] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const allThreats = Array.from(
    new Set(liveFeeds.flatMap((f) => f.threatIndicators))
  ).filter(Boolean);

  const filtered = liveFeeds.filter((item) => {
    if (filterIO && !item.ioRelevant) return false;
    if (filterThreat !== "ALL" && !item.threatIndicators.includes(filterThreat)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !item.title.toLowerCase().includes(q) &&
        !item.summary.toLowerCase().includes(q) &&
        !item.source.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const ioCount = liveFeeds.filter((f) => f.ioRelevant).length;
  const highRelevance = liveFeeds.filter((f) => f.relevanceScore >= 40).length;
  const avgScore = liveFeeds.length
    ? Math.round(liveFeeds.reduce((s, f) => s + f.relevanceScore, 0) / liveFeeds.length)
    : 0;

  // Bar chart: relevance score distribution
  const scoreDistribution = [
    { label: "0–19", count: liveFeeds.filter((f) => f.relevanceScore < 20).length, color: "#475569" },
    { label: "20–39", count: liveFeeds.filter((f) => f.relevanceScore >= 20 && f.relevanceScore < 40).length, color: "#f59e0b" },
    { label: "40–59", count: liveFeeds.filter((f) => f.relevanceScore >= 40 && f.relevanceScore < 60).length, color: "#f97316" },
    { label: "60–79", count: liveFeeds.filter((f) => f.relevanceScore >= 60 && f.relevanceScore < 80).length, color: "#ef4444" },
    { label: "80–100", count: liveFeeds.filter((f) => f.relevanceScore >= 80).length, color: "#dc2626" },
  ];

  // Threat type breakdown
  const threatBreakdown = allThreats.map((t) => ({
    name: t,
    count: liveFeeds.filter((f) => f.threatIndicators.includes(t)).length,
  })).sort((a, b) => b.count - a.count);

  return (
    <div className="p-4 h-full overflow-y-auto space-y-4">
      {/* Header row */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="text-[#00d4ff] text-sm font-black tracking-widest">
            LIVE SENSOR FUSION — {gcc.abbr}
          </div>
          <div className="text-[#475569] text-xs font-mono">
            {gcc.name} // {gcc.aor} // Open-source feed aggregation
          </div>
          {liveFeedsFetchedAt && (
            <div className="text-[#334155] text-[10px] font-mono mt-0.5">
              Last fetch: {new Date(liveFeedsFetchedAt).toUTCString()}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <StatPill label="TOTAL FEEDS" value={String(liveFeeds.length)} color="#00d4ff" />
          <StatPill label="IO RELEVANT" value={String(ioCount)} color="#ef4444" />
          <StatPill label="HIGH RELEVANCE" value={String(highRelevance)} color="#f97316" />
          <StatPill label="AVG SCORE" value={`${avgScore}`} color={confidenceColor(avgScore)} />

          <button
            onClick={refetch}
            disabled={liveFeedsLoading}
            className="px-3 py-1.5 text-xs border border-[#0891b2] text-[#00d4ff] rounded hover:bg-[#0891b215] disabled:opacity-40 font-mono flex items-center gap-1.5"
          >
            {liveFeedsLoading ? (
              <>
                <span className="status-dot warning pulse-alert" />
                FETCHING...
              </>
            ) : (
              <>
                ↻ REFRESH
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading state */}
      {liveFeedsLoading && liveFeeds.length === 0 && (
        <div className="tactical-card p-8 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="status-dot warning pulse-alert" />
            <span className="text-[#f59e0b] text-sm font-mono tracking-wider">
              FETCHING LIVE FEEDS — {gcc.abbr} AOR...
            </span>
          </div>
          <div className="text-[#475569] text-xs text-center max-w-sm">
            Querying {gcc.feeds.length} open-source feed{gcc.feeds.length > 1 ? "s" : ""} for{" "}
            {gcc.name}. Running keyword relevance scoring and IO threat indicator detection.
          </div>
          <div className="flex flex-wrap gap-1 justify-center mt-1">
            {gcc.feeds.map((f) => (
              <span key={f.name} className="px-2 py-0.5 border border-[#1e3a5f] text-[#475569] rounded text-[9px]">
                {f.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {liveFeedsError && (
        <div className="p-3 border border-[#ef4444] bg-[#ef444410] rounded flex items-start gap-2">
          <span className="text-[#ef4444]">⚠</span>
          <div>
            <div className="text-[#ef4444] text-xs font-bold">FEED FETCH ERROR</div>
            <div className="text-[#94a3b8] text-xs mt-0.5">{liveFeedsError}</div>
            <div className="text-[#475569] text-[10px] mt-1">
              RSS feeds may be temporarily unavailable. Check network connectivity or retry.
            </div>
          </div>
        </div>
      )}

      {/* Analytics row — only show when we have data */}
      {liveFeeds.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {/* Relevance distribution */}
          <div className="col-span-2 tactical-card p-4">
            <div className="text-[#00d4ff] text-xs font-bold tracking-widest mb-1">
              IO RELEVANCE SCORE DISTRIBUTION — {gcc.abbr}
            </div>
            <div className="text-[#475569] text-[10px] mb-3 font-mono">
              AI keyword & threat-indicator scoring against {gcc.keywords.length} AOR-specific terms
            </div>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={scoreDistribution} margin={{ top: 2, right: 8, left: -28, bottom: 2 }}>
                <CartesianGrid stroke="#1e3a5f" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 10 }} />
                <YAxis tick={{ fill: "#475569", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: "#0f1829", border: "1px solid #1e3a5f", borderRadius: 4, fontSize: 11 }}
                  labelStyle={{ color: "#00d4ff" }}
                />
                <Bar dataKey="count" name="Articles" radius={[2, 2, 0, 0]}>
                  {scoreDistribution.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Threat breakdown + AOR keywords */}
          <div className="tactical-card p-4 flex flex-col gap-3">
            <div>
              <div className="text-[#00d4ff] text-xs font-bold tracking-widest mb-2">DETECTED THREAT TYPES</div>
              {threatBreakdown.length === 0 ? (
                <div className="text-[#475569] text-xs">None detected in current feed</div>
              ) : (
                <div className="space-y-1.5">
                  {threatBreakdown.map((t) => (
                    <div key={t.name} className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-[#94a3b8] truncate">{t.name}</span>
                      <div className="flex items-center gap-1.5">
                        <div className="confidence-bar w-12">
                          <div
                            className="confidence-fill"
                            style={{
                              width: `${Math.min(100, (t.count / liveFeeds.length) * 100 * 3)}%`,
                              background: "#ef4444",
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-[#ef4444] font-mono">{t.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-[#1e3a5f] pt-3">
              <div className="text-[#475569] text-[9px] tracking-wider mb-1.5">AOR FILTER KEYWORDS</div>
              <div className="flex flex-wrap gap-1">
                {gcc.keywords.slice(0, 8).map((kw) => (
                  <span key={kw} className="px-1.5 py-0.5 border border-[#1e3a5f] text-[#334155] rounded text-[9px]">
                    {kw}
                  </span>
                ))}
                <span className="text-[#334155] text-[9px] self-center">
                  +{gcc.keywords.length - 8} more
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter bar */}
      {liveFeeds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <input
            type="text"
            placeholder="Search feeds..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 bg-[#070d1a] border border-[#1e3a5f] rounded text-xs text-[#e2e8f0] placeholder-[#334155] focus:outline-none focus:border-[#0891b2] w-48 font-mono"
          />

          <button
            onClick={() => setFilterIO(!filterIO)}
            className={`px-2 py-1 text-[10px] rounded border transition-colors font-mono ${
              filterIO
                ? "border-[#ef4444] text-[#ef4444] bg-[#ef444415]"
                : "border-[#1e3a5f] text-[#475569] hover:border-[#334155]"
            }`}
          >
            ⚑ IO RELEVANT ONLY
          </button>

          {/* Threat filter pills */}
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setFilterThreat("ALL")}
              className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                filterThreat === "ALL"
                  ? "border-[#00d4ff] text-[#00d4ff] bg-[#00d4ff15]"
                  : "border-[#1e3a5f] text-[#475569] hover:border-[#334155]"
              }`}
            >
              ALL
            </button>
            {allThreats.map((t) => (
              <button
                key={t}
                onClick={() => setFilterThreat(filterThreat === t ? "ALL" : t)}
                className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                  filterThreat === t
                    ? "border-[#ef4444] text-[#ef4444] bg-[#ef444415]"
                    : "border-[#1e3a5f] text-[#475569] hover:border-[#334155]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <span className="ml-auto text-[#475569] text-[10px] font-mono">
            {filtered.length} / {liveFeeds.length} articles
          </span>
        </div>
      )}

      {/* Feed list */}
      {liveFeeds.length > 0 && (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="flex items-center justify-center h-20 border border-dashed border-[#1e3a5f] rounded text-[#475569] text-sm">
              No articles match current filters
            </div>
          )}
          {filtered.map((item) => (
            <LiveFeedCard
              key={item.id}
              item={item}
              gccColor={gcc.color}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
              isEscalated={escalatedItems.some((e) => e.feedItemId === item.id)}
              onCreateAlert={() => addAlert("HIGH", `IO-relevant article: "${item.title.substring(0, 80)}"`, item.source)}
              onEscalate={(tag, note) => escalateFeedItem(item.id, item.title, item.source, item.link, tag, note)}
            />
          ))}
        </div>
      )}

      {/* Analyst Triage Queue — items escalated to running estimate */}
      {escalatedItems.length > 0 && (
        <div className="tactical-card p-4 border-l-2 border-l-[#10b981]">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[#10b981] text-xs font-bold tracking-widest">ANALYST TRIAGE QUEUE — ESCALATED ITEMS</div>
            <span className="text-[9px] text-[#475569] font-mono border border-[#1e3a5f] px-2 py-0.5 rounded">
              {escalatedItems.length} item{escalatedItems.length !== 1 ? "s" : ""} escalated
            </span>
          </div>
          <div className="space-y-2">
            {escalatedItems.map((esc) => (
              <div key={esc.feedItemId} className="flex items-start gap-2 p-2 border border-[#1e3a5f] rounded text-xs bg-[#070d1a]">
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded border flex-shrink-0"
                  style={{
                    color: esc.tag === "NARRATIVE" ? "#f59e0b" : esc.tag === "THREAT" ? "#ef4444" : "#10b981",
                    borderColor: esc.tag === "NARRATIVE" ? "#f59e0b" : esc.tag === "THREAT" ? "#ef4444" : "#10b981",
                    background: esc.tag === "NARRATIVE" ? "#f59e0b15" : esc.tag === "THREAT" ? "#ef444415" : "#10b98115",
                  }}>
                  {esc.tag}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[#e2e8f0] font-bold truncate">{esc.title}</div>
                  <div className="text-[#475569] text-[9px] font-mono">
                    {esc.source} · escalated {new Date(esc.escalatedAt).toISOString().substring(11, 16)}Z
                  </div>
                  {esc.analystNote && (
                    <div className="text-[#94a3b8] text-[9px] mt-0.5 italic">{esc.analystNote}</div>
                  )}
                </div>
                <a href={esc.link} target="_blank" rel="noopener noreferrer"
                  className="text-[9px] text-[#0891b2] hover:text-[#00d4ff] flex-shrink-0">↗</a>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[9px] text-[#334155] font-mono">
            Items escalated here should be incorporated into the Running Estimate by the duty analyst.
          </div>
        </div>
      )}

      {/* Source registry — provenance for every feed */}
      {liveFeeds.length > 0 && (
        <div className="tactical-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[#00d4ff] text-xs font-bold tracking-widest">ACTIVE FEED REGISTRY — {gcc.abbr}</div>
            <span className="text-[9px] text-[#475569] font-mono border border-[#1e3a5f] px-2 py-0.5 rounded">
              Collection method: RSS / 5-min polling · SLA 30m
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {gcc.feeds.map((feed) => {
              const count = liveFeeds.filter((f) => f.source === feed.name).length;
              const ioCount = liveFeeds.filter((f) => f.source === feed.name && f.ioRelevant).length;
              return (
                <div key={feed.name} className="p-2.5 border border-[#1e3a5f] rounded text-xs hover:border-[#0891b2] transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-[#e2e8f0] font-bold truncate">{feed.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[#475569] text-[9px] font-mono">{feed.category}</span>
                        <span className="text-[#334155] text-[9px]">·</span>
                        <span className="text-[#475569] text-[9px] font-mono">RSS</span>
                      </div>
                      <div className="text-[8px] text-[#334155] font-mono mt-0.5 truncate">{feed.url}</div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <div className="font-mono text-[#00d4ff]">{count}</div>
                      {ioCount > 0 && <div className="text-[#ef4444] text-[9px] font-bold">{ioCount} IO</div>}
                      <div className="text-[#475569] text-[9px]">articles</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 text-[9px] text-[#334155] font-mono">
            LIMITATION: RSS feeds are public news only. Gov advisories, SIGINT, HUMINT, and classified feeds not included.
          </div>
        </div>
      )}

      {/* ── IO Glossary / Dictionary ───────────────────────────────── */}
      <GlossaryPanel module="sensor-fusion" />
    </div>
  );
}

function LiveFeedCard({
  item,
  gccColor,
  expanded,
  onToggle,
  isEscalated,
  onCreateAlert,
  onEscalate,
}: {
  item: LiveFeedItem;
  gccColor: string;
  expanded: boolean;
  onToggle: () => void;
  isEscalated: boolean;
  onCreateAlert: () => void;
  onEscalate: (tag: string, note: string) => void;
}) {
  const [triageOpen, setTriageOpen] = useState(false);
  const [triageTag, setTriageTag] = useState("NARRATIVE");
  const [triageNote, setTriageNote] = useState("");
  const [alertSent, setAlertSent] = useState(false);
  const scoreColor =
    item.relevanceScore >= 60 ? "#ef4444" :
    item.relevanceScore >= 40 ? "#f97316" :
    item.relevanceScore >= 20 ? "#f59e0b" :
    "#475569";

  const timeAgo = (dateStr: string) => {
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return `${Math.floor(hrs / 24)}d ago`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      className={`tactical-card cursor-pointer transition-all ${item.ioRelevant ? "ring-1" : ""}`}
      style={item.ioRelevant ? { boxShadow: `0 0 6px ${gccColor}40`, outline: `1px solid ${gccColor}40` } : {}}
      onClick={onToggle}
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          {/* Left */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {/* IO badge */}
              {item.ioRelevant && (
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-black border flex-shrink-0"
                  style={{ color: gccColor, borderColor: gccColor, background: `${gccColor}15` }}
                >
                  IO RELEVANT
                </span>
              )}
              {/* Threat indicator badges */}
              {item.threatIndicators.slice(0, 2).map((t) => (
                <span key={t} className="px-1.5 py-0.5 rounded text-[9px] border border-[#ef444460] text-[#ef4444] bg-[#ef444410] flex-shrink-0">
                  {t}
                </span>
              ))}
              {item.threatIndicators.length > 2 && (
                <span className="text-[#ef4444] text-[9px]">+{item.threatIndicators.length - 2}</span>
              )}
            </div>

            <div className="text-[#e2e8f0] text-sm font-bold leading-tight line-clamp-2">
              {item.title}
            </div>

            <div className="flex items-center gap-3 mt-1.5 text-[9px] text-[#475569] font-mono flex-wrap">
              <span className="text-[#0891b2]">{item.source}</span>
              <span>•</span>
              <span>{timeAgo(item.published)}</span>
              <span>•</span>
              <span className="uppercase">{item.category}</span>
            </div>
          </div>

          {/* Right: score */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <div
              className="text-lg font-black leading-none"
              style={{ color: scoreColor }}
            >
              {item.relevanceScore}
            </div>
            <div className="text-[9px] text-[#475569]">SCORE</div>
            <div className="confidence-bar w-12">
              <div
                className="confidence-fill"
                style={{ width: `${item.relevanceScore}%`, background: scoreColor }}
              />
            </div>
            <span className="text-[#475569] text-[10px]">{expanded ? "▲" : "▼"}</span>
          </div>
        </div>
      </div>

      {/* Expanded — provenance + explainability drawer */}
      {expanded && (
        <div className="border-t border-[#1e3a5f] p-3 bg-[#070d1a] space-y-3">
          <p className="text-[#94a3b8] text-xs leading-relaxed">{item.summary}</p>

          {/* ── Scoring Explainability ────────────────────────────── */}
          <div className="p-2.5 border border-[#1e3a5f] rounded bg-[#060d1a]">
            <div className="text-[#00d4ff] text-[10px] font-bold tracking-wider mb-2">WHY THIS SCORE — SCORING RUBRIC BREAKDOWN</div>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div className="text-center">
                <div className="text-[9px] text-[#475569] tracking-wider">GEO/AOR MATCH</div>
                <div className="font-black text-sm" style={{ color: (item.scoring?.geoProximity ?? 0) > 0 ? "#00d4ff" : "#334155" }}>
                  {item.scoring?.geoProximity ?? "—"}<span className="text-[9px] text-[#475569]">/30</span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-[9px] text-[#475569] tracking-wider">IO KEYWORDS</div>
                <div className="font-black text-sm" style={{ color: (item.scoring?.ioRelevance ?? 0) > 0 ? "#f59e0b" : "#334155" }}>
                  {item.scoring?.ioRelevance ?? "—"}<span className="text-[9px] text-[#475569]">/40</span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-[9px] text-[#475569] tracking-wider">THREAT INDICATORS</div>
                <div className="font-black text-sm" style={{ color: (item.scoring?.threatIndicator ?? 0) > 0 ? "#ef4444" : "#334155" }}>
                  {item.scoring?.threatIndicator ?? "—"}<span className="text-[9px] text-[#475569]">/30</span>
                </div>
              </div>
            </div>
            {item.scoring?.basisNote && (
              <div className="text-[9px] text-[#94a3b8] font-mono bg-[#0a1628] p-1.5 rounded border border-[#1e3a5f]">
                {item.scoring.basisNote}
              </div>
            )}
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[9px] text-[#475569]">CONFIDENCE:</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border"
                style={{
                  color: item.scoring?.confidence === "HIGH" ? "#10b981" : item.scoring?.confidence === "MEDIUM" ? "#f59e0b" : "#ef4444",
                  borderColor: item.scoring?.confidence === "HIGH" ? "#10b981" : item.scoring?.confidence === "MEDIUM" ? "#f59e0b" : "#ef4444",
                }}>
                {item.scoring?.confidence ?? "LOW"}
              </span>
              <span className="text-[9px] text-[#475569]">·</span>
              <span className="text-[9px] text-[#475569] font-mono">
                VERIFICATION: <span className="font-bold"
                  style={{ color: item.verificationState === "CORROBORATED" ? "#10b981" : item.verificationState === "REFUTED" ? "#ef4444" : "#f59e0b" }}>
                  {item.verificationState ?? "UNVERIFIED"}
                </span>
              </span>
              {(item.crossSourceCount ?? 1) > 1 && (
                <span className="text-[9px] text-[#10b981] font-mono">· {item.crossSourceCount} sources</span>
              )}
            </div>
          </div>

          {/* ── Provenance / Collection metadata ─────────────────── */}
          <div className="p-2.5 border border-[#1e3a5f] rounded bg-[#060d1a]">
            <div className="text-[#475569] text-[10px] font-bold tracking-wider mb-1.5">PROVENANCE & COLLECTION METADATA</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px] font-mono">
              <div><span className="text-[#475569]">SOURCE TYPE: </span><span className="text-[#94a3b8]">{item.sourceType ?? "news"}</span></div>
              <div><span className="text-[#475569]">COLLECTION: </span><span className="text-[#94a3b8]">{item.collectionMethod ?? "rss"}</span></div>
              <div><span className="text-[#475569]">COLLECTED: </span><span className="text-[#94a3b8]">{item.collectedAt ? new Date(item.collectedAt).toISOString().substring(0, 16) + "Z" : "unknown"}</span></div>
              <div><span className="text-[#475569]">PUBLISHED: </span><span className="text-[#94a3b8]">{new Date(item.published).toUTCString()}</span></div>
              <div className="col-span-2 break-all"><span className="text-[#475569]">FEED URL: </span><span className="text-[#475569]">{item.sourceUrl}</span></div>
            </div>
          </div>

          {/* Matched keywords */}
          {item.matchedKeywords.length > 0 && (
            <div>
              <div className="text-[#475569] text-[9px] tracking-wider mb-1">MATCHED AOR KEYWORDS</div>
              <div className="flex flex-wrap gap-1">
                {item.matchedKeywords.map((kw) => (
                  <span
                    key={kw}
                    className="px-1.5 py-0.5 border rounded text-[9px] font-bold"
                    style={{ borderColor: gccColor, color: gccColor, background: `${gccColor}10` }}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Analyst Triage Actions ───────────────────────────────── */}
          <div className="p-2.5 border border-[#1e3a5f] rounded bg-[#060d1a]" onClick={(e) => e.stopPropagation()}>
            <div className="text-[#475569] text-[10px] font-bold tracking-wider mb-2">ANALYST TRIAGE ACTIONS</div>
            <div className="flex flex-wrap gap-2">
              {/* Create Alert */}
              <button
                onClick={() => { onCreateAlert(); setAlertSent(true); setTimeout(() => setAlertSent(false), 3000); }}
                className={`px-2 py-1 text-[9px] border rounded font-mono transition-colors ${
                  alertSent
                    ? "border-[#10b981] text-[#10b981] bg-[#10b98115]"
                    : "border-[#f59e0b] text-[#f59e0b] hover:bg-[#f59e0b15]"
                }`}
              >
                {alertSent ? "✓ ALERT SENT" : "⚑ CREATE ALERT"}
              </button>

              {/* Escalate to Running Estimate */}
              <button
                onClick={() => setTriageOpen(!triageOpen)}
                className={`px-2 py-1 text-[9px] border rounded font-mono transition-colors ${
                  isEscalated
                    ? "border-[#10b981] text-[#10b981] bg-[#10b98115]"
                    : "border-[#00d4ff] text-[#00d4ff] hover:bg-[#00d4ff15]"
                }`}
              >
                {isEscalated ? "✓ ESCALATED" : "↑ ESCALATE TO RUNNING EST"}
              </button>
            </div>

            {/* Escalation form */}
            {triageOpen && !isEscalated && (
              <div className="mt-2 space-y-1.5">
                <div className="flex gap-1.5">
                  {["NARRATIVE", "THREAT", "SIGACT", "OPSEC"].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setTriageTag(tag)}
                      className={`px-1.5 py-0.5 text-[9px] border rounded font-mono ${
                        triageTag === tag
                          ? "border-[#00d4ff] text-[#00d4ff] bg-[#00d4ff15]"
                          : "border-[#1e3a5f] text-[#475569] hover:border-[#334155]"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={triageNote}
                  onChange={(e) => setTriageNote(e.target.value)}
                  placeholder="Analyst note (optional)..."
                  className="w-full px-2 py-1 bg-[#070d1a] border border-[#1e3a5f] rounded text-[9px] text-[#e2e8f0] placeholder-[#334155] focus:outline-none focus:border-[#0891b2] font-mono"
                />
                <button
                  onClick={() => { onEscalate(triageTag, triageNote); setTriageOpen(false); setTriageNote(""); }}
                  className="px-3 py-1 text-[9px] border border-[#10b981] text-[#10b981] bg-[#10b98115] rounded hover:bg-[#10b98125] font-mono font-bold"
                >
                  CONFIRM ESCALATION → TRIAGE QUEUE
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-[#334155] text-[9px] font-mono">
              UNCLASSIFIED OSINT — ANALYST VERIFICATION REQUIRED BEFORE OPERATIONAL USE
            </div>
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] border border-[#0891b2] text-[#00d4ff] px-2 py-0.5 rounded hover:bg-[#0891b215] flex-shrink-0"
            >
              OPEN SOURCE ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="px-3 py-1.5 border border-[#1e3a5f] rounded bg-[#070d1a] text-center">
      <div className="text-[9px] text-[#475569] tracking-wider">{label}</div>
      <div className="font-black text-base" style={{ color }}>{value}</div>
    </div>
  );
}
