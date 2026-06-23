"use client";

import { useState } from "react";
import { useIEStore } from "@/store/ie-store";
import {
  getPMESIIMapping,
  DIMENSION_CONFIG,
  type PMESIIDimension,
  type PMESIIFactor,
  type PMESIIIndicator,
} from "@/lib/pmesii-data";

const DIMENSIONS: PMESIIDimension[] = [
  "POLITICAL",
  "MILITARY",
  "ECONOMIC",
  "SOCIAL",
  "INFORMATION",
  "INFRASTRUCTURE",
];

function assessmentLabel(v: number): string {
  if (v >= 0.5) return "FAVORABLE";
  if (v >= 0.1) return "LEANING FAV";
  if (v >= -0.1) return "NEUTRAL";
  if (v >= -0.5) return "CONTESTED";
  return "HOSTILE";
}

function assessmentColor(v: number): string {
  if (v >= 0.5) return "#10b981";
  if (v >= 0.1) return "#34d399";
  if (v >= -0.1) return "#f59e0b";
  if (v >= -0.5) return "#f97316";
  return "#ef4444";
}

function conditionColor(c: string): string {
  switch (c) {
    case "PERMISSIVE": return "#10b981";
    case "UNCERTAIN": return "#f59e0b";
    case "CONTESTED": return "#f97316";
    case "HOSTILE": return "#ef4444";
    default: return "#94a3b8";
  }
}

function trendIcon(t: string): string {
  switch (t) {
    case "IMPROVING": return "↑";
    case "STABLE": return "→";
    case "DEGRADING": return "↓";
    default: return "—";
  }
}

function trendColor(t: string): string {
  switch (t) {
    case "IMPROVING": return "#10b981";
    case "STABLE": return "#f59e0b";
    case "DEGRADING": return "#ef4444";
    default: return "#94a3b8";
  }
}

function freshnessColor(f: string): string {
  switch (f) {
    case "LIVE": return "#10b981";
    case "24H": return "#34d399";
    case "48H": return "#f59e0b";
    case "WEEKLY": return "#64748b";
    default: return "#475569";
  }
}

function statusColor(s: string): string {
  switch (s) {
    case "POSITIVE": return "#10b981";
    case "NEUTRAL": return "#f59e0b";
    case "NEGATIVE": return "#f97316";
    case "CRITICAL": return "#ef4444";
    default: return "#94a3b8";
  }
}

export function PMESIIMap() {
  const { activeGCC, liveFeeds } = useIEStore();
  const mapping = getPMESIIMapping(activeGCC);
  const [expandedDim, setExpandedDim] = useState<PMESIIDimension | null>(null);
  const [expandedFactor, setExpandedFactor] = useState<string | null>(null);

  // Count live feed items that match PMESII dimensions by keyword
  const liveFeedCounts = liveFeeds.reduce<Record<PMESIIDimension, number>>(
    (acc, feed) => {
      const title = (feed.title + " " + (feed.summary ?? "")).toLowerCase();
      if (/election|government|politic|sanction|diplomac|treaty|alliance/.test(title)) acc.POLITICAL++;
      if (/military|missile|weapon|army|navy|air force|drone|strike|defense/.test(title)) acc.MILITARY++;
      if (/econom|trade|tariff|gdp|inflation|investment|currency|oil|energy/.test(title)) acc.ECONOMIC++;
      if (/protest|refugee|migration|population|humanitarian|civil|social|public/.test(title)) acc.SOCIAL++;
      if (/disinformation|propaganda|narrative|influence|cyber|hack|social media|media/.test(title)) acc.INFORMATION++;
      if (/infrastructure|telecom|cable|power|water|transport|port|base/.test(title)) acc.INFRASTRUCTURE++;
      return acc;
    },
    { POLITICAL: 0, MILITARY: 0, ECONOMIC: 0, SOCIAL: 0, INFORMATION: 0, INFRASTRUCTURE: 0 }
  );

  const totalIndicators = DIMENSIONS.reduce(
    (sum, d) => sum + mapping.dimensions[d].reduce((s, f) => s + f.indicators.length, 0),
    0
  );

  return (
    <div className="tactical-card flex-shrink-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1e3a5f]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[#00d4ff] text-xs font-bold tracking-widest">
              PMESII-PT OPERATIONAL ENVIRONMENT MAP
            </div>
            <div className="text-[#475569] text-[9px] font-mono mt-0.5">
              JP 3-13 / MCDP 3-32 // {activeGCC} AOR // {totalIndicators} INDICATORS TRACKED
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[9px] font-mono">
              <span className="text-[#475569]">IE CONDITION:</span>
              <span
                className="px-1.5 py-0.5 rounded border font-black tracking-wider"
                style={{
                  color: conditionColor(mapping.overallCondition),
                  borderColor: `${conditionColor(mapping.overallCondition)}60`,
                  background: `${conditionColor(mapping.overallCondition)}10`,
                }}
              >
                {mapping.overallCondition}
              </span>
            </div>
            {liveFeeds.length > 0 && (
              <div className="text-[9px] font-mono text-[#475569]">
                <span className="text-[#10b981]">{liveFeeds.length}</span> LIVE FEEDS MAPPED
              </div>
            )}
          </div>
        </div>

        {/* Key Themes Strip */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {mapping.keyThemes.map((theme, i) => (
            <span
              key={i}
              className="text-[8px] font-mono px-1.5 py-0.5 rounded border border-[#1e3a5f] text-[#94a3b8] bg-[#0a1628]"
            >
              {theme}
            </span>
          ))}
        </div>
      </div>

      {/* PMESII Dimension Grid */}
      <div className="p-3">
        <div className="grid grid-cols-6 gap-2">
          {DIMENSIONS.map((dim) => {
            const cfg = DIMENSION_CONFIG[dim];
            const factors = mapping.dimensions[dim];
            const avgAssessment =
              factors.reduce((s, f) => s + f.assessment, 0) / (factors.length || 1);
            const worstTrend = factors.some((f) => f.trend === "DEGRADING")
              ? "DEGRADING"
              : factors.some((f) => f.trend === "STABLE")
              ? "STABLE"
              : "IMPROVING";
            const indicatorCount = factors.reduce((s, f) => s + f.indicators.length, 0);
            const isExpanded = expandedDim === dim;
            const feedCount = liveFeedCounts[dim];

            return (
              <button
                key={dim}
                onClick={() => {
                  setExpandedDim(isExpanded ? null : dim);
                  setExpandedFactor(null);
                }}
                className={`text-left p-2.5 rounded border transition-all ${
                  isExpanded
                    ? "border-opacity-100 bg-opacity-20"
                    : "border-opacity-40 hover:border-opacity-80 bg-opacity-5"
                }`}
                style={{
                  borderColor: isExpanded ? cfg.color : `${cfg.color}60`,
                  background: isExpanded ? `${cfg.color}15` : `${cfg.color}05`,
                }}
              >
                {/* Dimension Header */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm">{cfg.icon}</span>
                  <span
                    className="text-xs font-black"
                    style={{ color: trendColor(worstTrend) }}
                  >
                    {trendIcon(worstTrend)}
                  </span>
                </div>

                <div
                  className="text-[9px] font-black tracking-widest mb-1"
                  style={{ color: cfg.color }}
                >
                  {cfg.label}
                </div>

                {/* Assessment Bar */}
                <div className="mb-1.5">
                  <div className="h-1.5 bg-[#1e3a5f] rounded overflow-hidden">
                    <div
                      className="h-full rounded transition-all duration-500"
                      style={{
                        width: `${Math.round((avgAssessment + 1) * 50)}%`,
                        background: assessmentColor(avgAssessment),
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span
                      className="text-[7px] font-bold"
                      style={{ color: assessmentColor(avgAssessment) }}
                    >
                      {assessmentLabel(avgAssessment)}
                    </span>
                    <span className="text-[7px] text-[#475569]">
                      {avgAssessment.toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-[7px] font-mono text-[#475569]">
                  <span>{factors.length} FACTORS</span>
                  <span>{indicatorCount} IND</span>
                </div>

                {/* Live Feed Count */}
                {feedCount > 0 && (
                  <div className="mt-1 text-[7px] font-mono flex items-center gap-1">
                    <span className="status-dot active" style={{ width: 4, height: 4 }} />
                    <span className="text-[#10b981]">{feedCount} LIVE</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Expanded Dimension Detail */}
        {expandedDim && (
          <div
            className="mt-3 p-3 rounded border bg-[#070d1a]"
            style={{
              borderColor: `${DIMENSION_CONFIG[expandedDim].color}40`,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">{DIMENSION_CONFIG[expandedDim].icon}</span>
                <span
                  className="text-xs font-black tracking-widest"
                  style={{ color: DIMENSION_CONFIG[expandedDim].color }}
                >
                  {DIMENSION_CONFIG[expandedDim].label} — DETAILED ASSESSMENT
                </span>
              </div>
              <button
                onClick={() => { setExpandedDim(null); setExpandedFactor(null); }}
                className="text-[9px] text-[#475569] hover:text-[#94a3b8] font-mono"
              >
                ✕ CLOSE
              </button>
            </div>

            <div className="space-y-2">
              {mapping.dimensions[expandedDim].map((factor) => (
                <FactorCard
                  key={factor.id}
                  factor={factor}
                  dimColor={DIMENSION_CONFIG[expandedDim].color}
                  isExpanded={expandedFactor === factor.id}
                  onToggle={() =>
                    setExpandedFactor(expandedFactor === factor.id ? null : factor.id)
                  }
                />
              ))}
            </div>

            {/* Live Feed Cross-Reference */}
            {liveFeeds.length > 0 && liveFeedCounts[expandedDim] > 0 && (
              <div className="mt-3 pt-2 border-t border-[#1e3a5f]">
                <div className="text-[9px] font-mono text-[#475569] tracking-wider mb-1.5">
                  LIVE FEED CROSS-REFERENCE ({liveFeedCounts[expandedDim]} ITEMS)
                </div>
                <div className="space-y-1 max-h-[120px] overflow-y-auto">
                  {liveFeeds
                    .filter((f) => {
                      const text = (f.title + " " + (f.summary ?? "")).toLowerCase();
                      switch (expandedDim) {
                        case "POLITICAL": return /election|government|politic|sanction|diplomac|treaty|alliance/.test(text);
                        case "MILITARY": return /military|missile|weapon|army|navy|air force|drone|strike|defense/.test(text);
                        case "ECONOMIC": return /econom|trade|tariff|gdp|inflation|investment|currency|oil|energy/.test(text);
                        case "SOCIAL": return /protest|refugee|migration|population|humanitarian|civil|social|public/.test(text);
                        case "INFORMATION": return /disinformation|propaganda|narrative|influence|cyber|hack|social media|media/.test(text);
                        case "INFRASTRUCTURE": return /infrastructure|telecom|cable|power|water|transport|port|base/.test(text);
                        default: return false;
                      }
                    })
                    .slice(0, 5)
                    .map((feed) => (
                      <a
                        key={feed.id}
                        href={feed.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-[#162035] transition-colors group"
                      >
                        <span className="status-dot active" style={{ width: 4, height: 4, flexShrink: 0 }} />
                        <span className="text-[9px] text-[#94a3b8] group-hover:text-[#00d4ff] truncate flex-1">
                          {feed.title}
                        </span>
                        <span className="text-[8px] text-[#475569] font-mono flex-shrink-0">
                          {feed.source}
                        </span>
                        <span className="text-[8px] text-[#334155] group-hover:text-[#0891b2] flex-shrink-0">↗</span>
                      </a>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Factor Card ──────────────────────────────────────────────────────────

function FactorCard({
  factor,
  dimColor,
  isExpanded,
  onToggle,
}: {
  factor: PMESIIFactor;
  dimColor: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="rounded border border-[#1e3a5f] bg-[#0a1628] overflow-hidden"
    >
      {/* Factor Header — always visible */}
      <button
        onClick={onToggle}
        className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-[#162035] transition-colors"
      >
        {/* Assessment gauge */}
        <div className="flex-shrink-0 w-10">
          <div className="h-1 bg-[#1e3a5f] rounded overflow-hidden">
            <div
              className="h-full rounded"
              style={{
                width: `${Math.round((factor.assessment + 1) * 50)}%`,
                background: assessmentColor(factor.assessment),
              }}
            />
          </div>
          <div
            className="text-[7px] font-bold text-center mt-0.5"
            style={{ color: assessmentColor(factor.assessment) }}
          >
            {factor.assessment.toFixed(1)}
          </div>
        </div>

        {/* Name & Description */}
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold text-[#e2e8f0]">{factor.name}</div>
          <div className="text-[8px] text-[#475569] truncate">{factor.description}</div>
        </div>

        {/* Trend */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <span
            className="text-xs font-black"
            style={{ color: trendColor(factor.trend) }}
          >
            {trendIcon(factor.trend)}
          </span>
          <span
            className="text-[7px] font-mono"
            style={{ color: trendColor(factor.trend) }}
          >
            {factor.trend}
          </span>
        </div>

        {/* ASCOPE badges */}
        <div className="flex gap-0.5 flex-shrink-0">
          {factor.ascope.map((a) => (
            <span
              key={a}
              className="text-[6px] px-1 py-0 rounded border border-[#1e3a5f] text-[#475569]"
              title={`ASCOPE: ${a}`}
            >
              {a.substring(0, 3)}
            </span>
          ))}
        </div>

        {/* Indicator count */}
        <span className="text-[8px] text-[#475569] font-mono flex-shrink-0">
          {factor.indicators.length} IND
        </span>

        {/* Expand arrow */}
        <span className="text-[#475569] text-[10px] flex-shrink-0">
          {isExpanded ? "▼" : "▶"}
        </span>
      </button>

      {/* Indicators — expanded */}
      {isExpanded && (
        <div className="px-3 pb-2 border-t border-[#1e3a5f]">
          <div className="mt-2 space-y-1.5">
            {factor.indicators.map((ind, i) => (
              <IndicatorRow key={i} indicator={ind} dimColor={dimColor} />
            ))}
          </div>

          {/* ASCOPE cross-reference */}
          <div className="mt-2 pt-1.5 border-t border-[#1e3a5f]">
            <div className="text-[7px] font-mono text-[#334155] tracking-wider mb-1">
              ASCOPE CROSS-CUT
            </div>
            <div className="flex gap-1">
              {factor.ascope.map((a) => (
                <span
                  key={a}
                  className="text-[8px] px-1.5 py-0.5 rounded border font-mono"
                  style={{
                    borderColor: `${dimColor}40`,
                    color: dimColor,
                    background: `${dimColor}10`,
                  }}
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Indicator Row ────────────────────────────────────────────────────────

function IndicatorRow({
  indicator,
  dimColor,
}: {
  indicator: PMESIIIndicator;
  dimColor: string;
}) {
  return (
    <div className="flex items-start gap-2 p-1.5 rounded bg-[#070d1a] border border-[#1e3a5f30]">
      {/* Status dot */}
      <span
        className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0"
        style={{ background: statusColor(indicator.status) }}
      />

      <div className="flex-1 min-w-0">
        {/* Label */}
        <div className="text-[9px] font-bold text-[#e2e8f0]">{indicator.label}</div>
        {/* Value */}
        <div className="text-[8px] text-[#94a3b8] leading-relaxed mt-0.5">
          {indicator.value}
        </div>
        {/* Source & Freshness */}
        <div className="flex items-center gap-2 mt-0.5">
          <a
            href={indicator.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[8px] font-mono hover:opacity-80 transition-opacity"
            style={{ color: dimColor }}
          >
            ↗ {indicator.source}
          </a>
          <span
            className="text-[7px] font-mono px-1 rounded"
            style={{
              color: freshnessColor(indicator.freshness),
              background: `${freshnessColor(indicator.freshness)}15`,
            }}
          >
            {indicator.freshness}
          </span>
          <span
            className="text-[7px] font-bold"
            style={{ color: statusColor(indicator.status) }}
          >
            {indicator.status}
          </span>
        </div>
      </div>
    </div>
  );
}
