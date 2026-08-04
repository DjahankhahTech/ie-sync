"use client";

import { useState, useEffect } from "react";
import { useIEStore } from "@/store/ie-store";
import { getHistoricalThreats, layerOf } from "@/lib/threat-library";
import { GCC_CONFIGS } from "@/lib/gcc-config";
import { threatColor, confidenceColor } from "@/lib/utils";
import { useLiveFeeds } from "@/hooks/useLiveFeeds";
import { GlossaryPanel } from "@/components/ui/GlossaryPanel";
import { DailyINFSUM } from "@/components/infsum/DailyINFSUM";
import { MediaFeedPanel } from "@/components/media-feeds/MediaFeedPanel";
import { PMESIIMap } from "./PMESIIMap";
import {
  getMetricDefinition,
  generateMetricRun,
  generateMetricTrend,
  generateMetricDrivers,
  type MetricTrendPoint,
} from "@/lib/metric-contracts";
import { getLinkStatusBadge, type LinkStatus } from "@/lib/source-links";

export function IEOverlay() {
  const {
    threatEntities,
    moeMetrics,
    alerts,
    activeGCC,
    liveFeeds,
    setActiveModule,
    liveFeedsLoading,
    liveFeedsFetchedAt,
    liveFeedsError,
  } = useIEStore();
  const { refetch } = useLiveFeeds();
  const gcc = GCC_CONFIGS[activeGCC];

  // Historical / reference fallback so the threat-entity table is never empty
  // before a live AI assessment has run. (The full map + narrative board now
  // live in the dedicated TACTICAL MAP tab.)
  const usingHistorical = threatEntities.length === 0;
  const baseThreats = usingHistorical ? getHistoricalThreats(activeGCC) : threatEntities;
  const threatsWithLayer = baseThreats.map((e) => ({ ...e, _layer: layerOf(e) }));

  const criticalAlerts = alerts.filter((a) => !a.acknowledged && a.severity === "CRITICAL");
  const highAlerts = alerts.filter((a) => !a.acknowledged && a.severity === "HIGH");
  const ioFeeds = liveFeeds.filter((f) => f.ioRelevant).slice(0, 5);
  const totalFeeds = liveFeeds.length;
  const staleFeeds = liveFeeds.filter((f) => {
    try {
      return Date.now() - new Date(f.published).getTime() > 24 * 60 * 60 * 1000;
    } catch { return false; }
  }).length;

  // Compute ingest lag
  const [ingestLagLabel, setIngestLagLabel] = useState<string>("—");
  useEffect(() => {
    if (liveFeedsFetchedAt) {
      const lag = Math.round((Date.now() - new Date(liveFeedsFetchedAt).getTime()) / 60000);
      setIngestLagLabel(lag < 1 ? "<1m" : `${lag}m`);
    }
  }, [liveFeedsFetchedAt]);

  return (
    <div className="page-scroll page-scroll-wide gap-4">
      <header className="page-header">
        <div>
          <h1 className="page-title">Information environment — {gcc.abbr}</h1>
          <p className="page-subtitle">
            Open-source picture of the military information environment for this theater.
            Use it to see what is happening, then open the Adversary Estimate to speculate
            on what they may do next.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={liveFeedsLoading}
          className="btn btn-primary"
        >
          {liveFeedsLoading ? "Refreshing…" : "Refresh feeds"}
        </button>
      </header>

      {/* Status */}
      <div className="panel flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
        <div className="flex items-center gap-2">
          <span
            className={`status-dot ${
              liveFeedsLoading
                ? "warning pulse-alert"
                : liveFeedsError
                  ? "danger"
                  : totalFeeds > 0
                    ? "active"
                    : "warning"
            }`}
          />
          <span className="text-muted">Feeds</span>
          <span className="font-semibold">
            {liveFeedsLoading
              ? "Loading"
              : liveFeedsError
                ? "Error"
                : totalFeeds > 0
                  ? `${totalFeeds} articles`
                  : "Empty"}
          </span>
        </div>
        <div>
          <span className="text-muted">Lag </span>
          <span className="font-medium">{ingestLagLabel}</span>
        </div>
        <div>
          <span className="text-muted">Stale (&gt;24h) </span>
          <span className={staleFeeds > 5 ? "text-[var(--warning)] font-semibold" : "font-medium"}>
            {staleFeeds}
          </span>
        </div>
        <div>
          <span className="text-muted">IO-relevant </span>
          <span className="font-medium">
            {ioFeeds.length} of {totalFeeds}
          </span>
        </div>
        <div>
          <span className="text-muted">Alerts </span>
          <span
            className={
              criticalAlerts.length > 0
                ? "text-[var(--danger)] font-bold"
                : "font-medium"
            }
          >
            {criticalAlerts.length} critical · {highAlerts.length} high
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xl leading-none">{gcc.flag}</span>
          <span className="font-bold" style={{ color: gcc.color }}>
            {gcc.aor}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" onClick={() => setActiveModule("running-estimate")}>
          Speculate on adversary action
        </button>
        <button type="button" className="btn" onClick={() => setActiveModule("io-planner")}>
          Plan response
        </button>
        <button type="button" className="btn" onClick={() => setActiveModule("sensor-fusion")}>
          Triage OSINT
        </button>
        <button type="button" className="btn" onClick={() => setActiveModule("sigman")}>
          Check signatures
        </button>
        <button type="button" className="btn" onClick={() => setActiveModule("ie-map")}>
          Map layers
        </button>
      </div>

      {!liveFeedsLoading && (liveFeedsError || totalFeeds === 0) && (
        <div className={liveFeedsError ? "notice notice-danger" : "notice notice-warn"}>
          <strong>
            {liveFeedsError ? "Could not load open-source feeds." : "No live articles yet."}
          </strong>{" "}
          {liveFeedsError
            ? `Error: ${liveFeedsError}. Retry or switch theater. Threat list below stays on historical reference until an estimate runs.`
            : `IE-SYNC does not invent news. When public RSS returns nothing for ${gcc.abbr}, this stays empty. Refresh, check network access, or continue with the environment map and reference threats.`}
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => refetch()}
              disabled={liveFeedsLoading}
            >
              Retry feeds
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setActiveModule("running-estimate")}
            >
              Open adversary estimate
            </button>
          </div>
        </div>
      )}

      {/* ── Critical Alert Banner — Actionable ─────────────────────── */}
      {criticalAlerts.length > 0 && (
        <div className="p-3 border border-[#ef4444] bg-[#ef444410] rounded flex-shrink-0 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[#ef4444] text-lg">⚠</span>
            <span className="text-[#ef4444] text-xs font-black tracking-widest">
              {criticalAlerts.length} CRITICAL ALERT{criticalAlerts.length > 1 ? "S" : ""} — IMMEDIATE ACTION REQUIRED
            </span>
          </div>
          {criticalAlerts.slice(0, 3).map((a) => (
            <ActionableAlert key={a.id} alert={a} />
          ))}
        </div>
      )}

      {/* ── PMESII-PT Operational Environment Map ─────────────── */}
      <PMESIIMap />

      {/* ── Daily Information Summary ───────────────────────────── */}
      <DailyINFSUM />

      {/* ── IE Media Feed (Video/Image OSINT) ───────────────────── */}
      <MediaFeedPanel />

      {/* IE Tactical Overlay map + Narrative Threat Board now live in the dedicated TACTICAL MAP tab */}

      {/* ── Threat Entity Tracking Table ─────────────────────────── */}
      <div className="panel p-0 flex-shrink-0">
        <div className="panel-head flex-wrap">
          <div>
            <h2 className="panel-title">Adversary actors in the IE</h2>
            <p className="text-[13px] text-muted m-0 mt-0.5">
              Publicly attributed actors relevant to planning — not live tracks
            </p>
          </div>
          <div className="text-[13px] text-muted text-right">
            {threatsWithLayer.length} · {gcc.abbr} ·{" "}
            <span className={usingHistorical ? "text-[var(--warning)]" : "text-[var(--success)]"}>
              {usingHistorical ? "Reference library" : "From latest estimate"}
            </span>
          </div>
        </div>
        {usingHistorical && (
          <div className="notice notice-warn rounded-none border-x-0 border-t-0">
            <strong>Reference list.</strong> Curated open-source actors for {gcc.abbr} until
            an Adversary Estimate produces a fused set. Not sensor detections or current locations.
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Designation</th>
                <th>Layer</th>
                <th>Type</th>
                <th>Location</th>
                <th>Activity</th>
                <th>Threat</th>
                <th>Conf.</th>
                <th>Capabilities</th>
                <th title="Report time from assessment or catalog — not a sighting">Reported</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {threatsWithLayer.map((entity) => {
                const layerColor = entity._layer === "PHYSICAL" ? "#10b981" : entity._layer === "TECHNICAL" ? "#00d4ff" : entity._layer === "UNKNOWN" ? "#64748b" : "#f59e0b";
                return (
                <tr key={entity.id}>
                  <td>
                    <span className="font-bold" style={{ color: threatColor(entity.threat) }}>
                      {entity.designation}
                    </span>
                  </td>
                  <td>
                    <span
                      className="px-1.5 py-0.5 rounded text-[11px] font-semibold border"
                      style={{
                        color: layerColor,
                        borderColor: layerColor,
                        background: `${layerColor}15`,
                      }}
                    >
                      {entity._layer}
                    </span>
                  </td>
                  <td className="text-muted">{entity.type}</td>
                  <td className="text-muted max-w-[10rem]">
                    <div className="leading-snug">{entity.location}</div>
                  </td>
                  <td className="min-w-[14rem]">
                    <div className="leading-snug">{entity.activity}</div>
                  </td>
                  <td>
                    <ThreatBadge level={entity.threat} />
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="confidence-bar w-12">
                        <div
                          className="confidence-fill"
                          style={{
                            width: `${entity.confidence}%`,
                            background: confidenceColor(entity.confidence),
                          }}
                        />
                      </div>
                      <span style={{ color: confidenceColor(entity.confidence) }}>
                        {entity.confidence}%
                      </span>
                    </div>
                  </td>
                  <td className="text-muted text-[13px]">
                    {entity.capabilities.join(" · ")}
                  </td>
                  <td className="text-muted text-[12px] font-mono whitespace-nowrap">
                    {new Date(entity.reportedAt).toISOString().replace("T", " ").substring(0, 16)}Z
                  </td>
                  <td>
                    <SourceLinkBadge url={entity.sourceUrl} label={entity.sourceLabel} />
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── IO Glossary / Dictionary ─────────────────────────────── */}
      <GlossaryPanel module="cop" />
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

// ── Confidence Badge ────────────────────────────────────────────────

function ConfidenceBadge({ level }: { level: "HIGH" | "MEDIUM" | "LOW" }) {
  const colors = { HIGH: "#10b981", MEDIUM: "#f59e0b", LOW: "#ef4444" };
  const color = colors[level];
  return (
    <span
      className="text-[8px] font-bold px-1 py-0 rounded border"
      style={{ color, borderColor: `${color}60`, background: `${color}10` }}
      title={`Confidence: ${level} — based on source diversity and sample size`}
    >
      {level}
    </span>
  );
}

// ── Source Link Badge (with health status) ──────────────────────────

function SourceLinkBadge({ url, label }: { url: string; label: string }) {
  const [linkStatus, setLinkStatus] = useState<LinkStatus>("UNCHECKED");
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!url || url === "#") {
      setLinkStatus("DEAD");
      return;
    }
    // Async link check — fires on mount
    let cancelled = false;
    const checkLink = async () => {
      try {
        const res = await fetch(`/api/link-check?url=${encodeURIComponent(url)}`);
        if (!res.ok) {
          if (!cancelled) setLinkStatus("DEAD");
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setLinkStatus(data.status ?? "DEAD");
          setCheckedAt(data.checked_at ?? null);
        }
      } catch {
        if (!cancelled) setLinkStatus("DEAD");
      }
    };
    checkLink();
    return () => { cancelled = true; };
  }, [url]);

  const badge = getLinkStatusBadge(linkStatus);

  if (linkStatus === "DEAD" || linkStatus === "BLOCKED") {
    const archiveUrl = `https://web.archive.org/web/*/${encodeURIComponent(url)}`;
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-mono">
        <span
          className="px-1 py-0 rounded border"
          style={{ color: badge.color, borderColor: `${badge.color}60`, background: badge.bgColor }}
          title={`Status: ${badge.label}${checkedAt ? ` (checked ${checkedAt})` : ""}`}
        >
          {badge.icon} {badge.label}
        </span>
        <a
          href={archiveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#a855f7] hover:text-[#c084fc] underline"
          title="View archived version (Internet Archive)"
        >
          Archive ↗
        </a>
      </span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[9px] font-mono hover:opacity-80 transition-opacity"
      title={`${badge.label}: ${url}${checkedAt ? ` (checked ${checkedAt})` : ""}`}
    >
      <span
        className="px-1 py-0 rounded border"
        style={{ color: badge.color, borderColor: `${badge.color}60`, background: badge.bgColor }}
      >
        {badge.icon}
      </span>
      <span className="text-[#0891b2] truncate max-w-[130px]">
        ↗ {label}
      </span>
    </a>
  );
}

// ── Actionable Alert ────────────────────────────────────────────────

function ActionableAlert({ alert }: { alert: { id: string; severity: string; message: string; source: string; timestamp: string } }) {
  const { acknowledgeAlert } = useIEStore();

  // Derive recommended action from alert message
  const getRecommendedAction = (msg: string): string => {
    if (msg.includes("APT") || msg.includes("CYBER") || msg.includes("C2")) return "Request CYBERCOM DCO authority; isolate affected endpoints";
    if (msg.includes("DEEPFAKE") || msg.includes("deepfake")) return "Initiate platform takedown request; PA counter-statement";
    if (msg.includes("BOT") || msg.includes("bot") || msg.includes("inauthentic")) return "Flag for SOCMINT cell; request platform CIB investigation";
    if (msg.includes("MOE BREACH")) return "Convene IO Assessment Board; update Running Estimate";
    if (msg.includes("SIGINT") || msg.includes("intercept")) return "Alert collection management; update SIGINT requirements";
    return "Analyst review required — assign to watch officer";
  };

  return (
    <div className="p-2 bg-[#0a1628] border border-[#ef444430] rounded">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[#fca5a5] text-[10px] font-mono leading-relaxed">
            {alert.message.substring(0, 200)}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[8px] text-[#475569] font-mono">SRC: {alert.source}</span>
            <span className="text-[8px] text-[#334155]">•</span>
            <span className="text-[8px] text-[#475569] font-mono">
              {(() => { try { return new Date(alert.timestamp).toISOString().replace("T", " ").substring(0, 16) + "Z"; } catch { return "—"; } })()}
            </span>
          </div>
          {/* Recommended Action */}
          <div className="mt-1.5 p-1.5 bg-[#1e3a5f20] rounded">
            <div className="text-[8px] font-mono text-[#f59e0b] tracking-wider">RECOMMENDED ACTION:</div>
            <div className="text-[9px] text-[#94a3b8] font-mono">{getRecommendedAction(alert.message)}</div>
          </div>
        </div>
        <div className="flex flex-col gap-1 flex-shrink-0">
          <button
            onClick={() => acknowledgeAlert(alert.id)}
            className="text-[8px] px-2 py-0.5 border border-[#10b981] text-[#10b981] rounded hover:bg-[#10b98115] font-mono"
          >
            ACK
          </button>
          <button
            onClick={() => acknowledgeAlert(alert.id)}
            className="text-[8px] px-2 py-0.5 border border-[#334155] text-[#475569] rounded hover:bg-[#1e3a5f] font-mono"
          >
            ASSIGN
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Narrative Card ──────────────────────────────────────────────────

function NarrativeCard({ thread }: { thread: ReturnType<typeof useIEStore.getState>["narrativeThreads"][0] }) {
  const sentimentPct = Math.round((thread.sentiment + 1) * 50);
  const isAdversarial = thread.adversarial;
  const trendColor = thread.trend === "RISING" ? "#ef4444" : thread.trend === "FALLING" ? "#10b981" : "#f59e0b";
  const trendArrow = thread.trend === "RISING" ? "↑" : thread.trend === "FALLING" ? "↓" : "→";
  const borderClass = isAdversarial ? "border-[#ef444450] bg-[#ef444408]" : "border-[#10b98150] bg-[#10b98108]";

  return (
    <div className={`p-2.5 rounded border ${borderClass}`}>
      <div className="flex items-start justify-between gap-1 mb-1">
        <div className="flex items-center gap-1.5">
          <span className={`text-[8px] font-black px-1 py-0.5 rounded border flex-shrink-0 ${
            isAdversarial ? "text-[#ef4444] border-[#ef444460] bg-[#ef444415]" : "text-[#10b981] border-[#10b98160] bg-[#10b98115]"
          }`}>
            {isAdversarial ? "HOSTILE" : "FRIENDLY"}
          </span>
          <div className="text-[#e2e8f0] text-[10px] font-bold leading-tight">{thread.title}</div>
        </div>
        <span style={{ color: trendColor }} className="text-sm font-black flex-shrink-0" title={`Trend: ${thread.trend}`}>{trendArrow}</span>
      </div>

      <div className="text-[#475569] text-[9px] mb-1.5 font-mono truncate" title={thread.platform}>
        📡 {thread.platform}
      </div>

      <div className="text-[#94a3b8] text-[9px] mb-2 leading-relaxed">
        {thread.summary}
      </div>

      <div className="mb-1.5">
        <div className="flex justify-between text-[8px] text-[#475569] mb-0.5">
          <span>HOSTILE (−1.0)</span>
          <span className="text-[#334155]">SENTIMENT: {thread.sentiment.toFixed(2)}</span>
          <span>FAVORABLE (+1.0)</span>
        </div>
        <div className="h-1.5 bg-[#1e3a5f] rounded overflow-hidden" title="Sentiment: −1.0 = fully hostile, 0 = neutral, +1.0 = fully favorable.">
          <div
            className="h-full transition-all"
            style={{
              width: `${sentimentPct}%`,
              background: sentimentPct < 40 ? "#ef4444" : sentimentPct > 60 ? "#10b981" : "#f59e0b",
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 mb-1.5 text-[9px] font-mono">
        <div className="bg-[#070d1a] border border-[#1e3a5f] rounded px-1.5 py-1">
          <div className="text-[#475569] text-[8px]">REACH</div>
          <div className="text-[#94a3b8] font-bold">{(thread.reach / 1e6).toFixed(1)}M</div>
          <div className="text-[8px] text-[#334155]">est. impressions/24hr</div>
        </div>
        <div className="bg-[#070d1a] border border-[#1e3a5f] rounded px-1.5 py-1">
          <div className="text-[#475569] text-[8px]">VELOCITY</div>
          <div style={{ color: trendColor }} className="font-bold">{thread.velocity.toLocaleString()}</div>
          <div className="text-[8px] text-[#334155]">shares/hr at collection</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[8px] font-mono" style={{ color: trendColor }}>
          TREND: {thread.trend}
        </span>
        <span className="text-[8px] text-[#334155] font-mono">
          {isAdversarial ? "IO CELL ATTRIBUTED" : "FRIENDLY IO"}
        </span>
      </div>
    </div>
  );
}

// ── MOE Tile (with ⓘ Definition Drawer + Metric Detail Panel) ──────

function MOETile({ moe }: { moe: ReturnType<typeof useIEStore.getState>["moeMetrics"][0] }) {
  const [view, setView] = useState<"tile" | "definition" | "detail">("tile");
  const statusColors = { GREEN: "#10b981", AMBER: "#f59e0b", RED: "#ef4444" };
  const color = statusColors[moe.status];
  const trendArrow = moe.trend === "UP" ? "↑" : moe.trend === "DOWN" ? "↓" : "→";

  // Direction-aware progress
  const lowerIsBetter = moe.lowerIsBetter ?? false;
  let progressPct: number;
  let progressLabel: string;
  if (lowerIsBetter) {
    const worst = Math.max(moe.current, moe.target * 2);
    progressPct = Math.round(Math.max(0, Math.min(100, ((worst - moe.current) / (worst - moe.target)) * 100)));
    progressLabel = `${progressPct}% toward target (need ≤ ${moe.target} ${moe.unit})`;
  } else {
    progressPct = Math.round(Math.max(0, Math.min(100, (moe.current / moe.target) * 100)));
    progressLabel = `${progressPct}% of target (need ≥ ${moe.target} ${moe.unit})`;
  }

  const displayVal = (v: number) =>
    v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` :
    v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v);
  const unitLabel = moe.unit.includes("%") ? "%" : ` ${moe.unit}`;

  // Freshness
  const [ageLabel, setAgeLabel] = useState("—");
  const [isStale, setIsStale] = useState(false);
  useEffect(() => {
    const ageMin = Math.round((Date.now() - new Date(moe.lastUpdated).getTime()) / 60000);
    setAgeLabel(ageMin < 60 ? `${ageMin}m ago` : `${Math.floor(ageMin / 60)}h ago`);
    setIsStale(ageMin > 180); // Stale if >3 hours
  }, [moe.lastUpdated]);

  // Get definition and run data
  const definition = getMetricDefinition(moe.id);
  const run = generateMetricRun(moe.id, moe.current, moe.lastUpdated);
  const drivers = generateMetricDrivers(moe.id);

  // ── Definition Drawer ──────────────────────────────────────────
  if (view === "definition" && definition) {
    return (
      <div className="tactical-card p-2.5 text-[8px] font-mono overflow-y-auto" style={{ borderTopColor: color, borderTopWidth: 2, maxHeight: 400 }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[#f59e0b] tracking-wider font-bold">ⓘ METRIC DEFINITION</span>
          <button onClick={() => setView("tile")} className="text-[#475569] hover:text-[#94a3b8]">✕ close</button>
        </div>

        <div className="space-y-2">
          <div>
            <div className="text-[#475569]">METRIC ID</div>
            <div className="text-[#94a3b8]">{definition.metric_id} (v{definition.metric_version})</div>
          </div>
          <div>
            <div className="text-[#475569]">DEFINITION</div>
            <div className="text-[#94a3b8] leading-relaxed">{definition.definition}</div>
          </div>
          <div>
            <div className="text-[#475569]">FORMULA</div>
            <div className="text-[#00d4ff]">{definition.formula}</div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <div className="text-[#475569]">UNITS</div>
              <div className="text-[#94a3b8]">{definition.units}</div>
            </div>
            <div>
              <div className="text-[#475569]">WINDOW</div>
              <div className="text-[#94a3b8]">{definition.window}</div>
            </div>
            <div>
              <div className="text-[#475569]">UPDATE CADENCE</div>
              <div className="text-[#94a3b8]">{definition.update_cadence}</div>
            </div>
            <div>
              <div className="text-[#475569]">DIRECTION</div>
              <div className="text-[#94a3b8]">{definition.direction === "lower_is_better" ? "↓ Lower is better" : "↑ Higher is better"}</div>
            </div>
          </div>
          <div>
            <div className="text-[#475569]">INPUTS ({definition.inputs.length})</div>
            {definition.inputs.map((inp, i) => (
              <div key={i} className="text-[#94a3b8] mt-0.5 pl-1 border-l border-[#1e3a5f]">
                <span className="text-[#e2e8f0]">{inp.name}</span> · {inp.source} · {inp.freshness}
                {inp.reference && (
                  <a href={inp.reference} target="_blank" rel="noopener noreferrer" className="text-[#0891b2] ml-1">↗</a>
                )}
              </div>
            ))}
          </div>
          <div>
            <div className="text-[#475569]">FILTERS</div>
            <div className="text-[#94a3b8]">{definition.filters}</div>
          </div>
          <div>
            <div className="text-[#475569]">CONFIDENCE METHOD</div>
            <div className="text-[#94a3b8]">{definition.confidence_method}</div>
          </div>
          <div>
            <div className="text-[#475569]">THRESHOLDS</div>
            <div className="flex gap-2">
              <span className="text-[#10b981]">G: {definition.thresholds.green}</span>
              <span className="text-[#f59e0b]">A: {definition.thresholds.amber}</span>
              <span className="text-[#ef4444]">R: {definition.thresholds.red}</span>
            </div>
          </div>
          <div>
            <div className="text-[#ef4444]">KNOWN FAILURE MODES</div>
            {definition.known_failure_modes.map((fm, i) => (
              <div key={i} className="text-[#94a3b8] mt-0.5 pl-1 border-l border-[#ef444440]">• {fm}</div>
            ))}
          </div>
          <div className="pt-1 border-t border-[#1e3a5f]">
            <span className="text-[#475569]">OWNER:</span> <span className="text-[#94a3b8]">{definition.owner}</span>
            <br />
            <span className="text-[#475569]">LAST VALIDATED:</span> <span className="text-[#94a3b8]">{definition.last_validated_at}</span>
            <br />
            <span className="text-[#475569]">BASIS:</span> <span className="text-[#94a3b8]">{definition.doctrinal_basis}</span>
          </div>
        </div>

        <button
          onClick={() => setView("detail")}
          className="w-full mt-2 text-[8px] py-1 border border-[#0891b2] text-[#00d4ff] rounded hover:bg-[#0891b215] font-mono"
        >
          VIEW EVIDENCE DRILLDOWN →
        </button>
      </div>
    );
  }

  // ── Metric Detail Panel (Evidence Drilldown) ───────────────────
  if (view === "detail") {
    const trendData = generateMetricTrend(moe.id, moe.current, moe.trend);
    return (
      <div className="tactical-card p-2.5 text-[8px] font-mono overflow-y-auto" style={{ borderTopColor: color, borderTopWidth: 2, maxHeight: 400 }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[#00d4ff] tracking-wider font-bold">📊 METRIC DETAIL</span>
          <button onClick={() => setView("tile")} className="text-[#475569] hover:text-[#94a3b8]">✕ close</button>
        </div>

        <div className="text-[10px] text-[#e2e8f0] font-bold mb-2">{moe.name}</div>

        {/* Mini trend chart (text-based sparkline) */}
        <div className="mb-2">
          <div className="text-[#475569] mb-0.5">TREND ({trendData.length} points, 6hr intervals)</div>
          <MiniTrendChart data={trendData} color={color} target={moe.target} />
        </div>

        {/* Confidence + Sample */}
        <div className="grid grid-cols-3 gap-1 mb-2">
          <div className="bg-[#070d1a] border border-[#1e3a5f] rounded p-1.5">
            <div className="text-[#475569]">CONFIDENCE</div>
            <ConfidenceBadge level={run.confidence} />
          </div>
          <div className="bg-[#070d1a] border border-[#1e3a5f] rounded p-1.5">
            <div className="text-[#475569]">SAMPLE</div>
            <div className="text-[#94a3b8] font-bold">{run.sample_size?.toLocaleString() ?? "—"}</div>
          </div>
          <div className="bg-[#070d1a] border border-[#1e3a5f] rounded p-1.5">
            <div className="text-[#475569]">CI BAND</div>
            <div className="text-[#94a3b8]">{run.ci_lower?.toFixed(1)}–{run.ci_upper?.toFixed(1)}</div>
          </div>
        </div>

        {/* Drivers — "Why" summary */}
        <div className="mb-2">
          <div className="text-[#f59e0b] mb-0.5">DRIVEN BY:</div>
          {drivers.map((d, i) => (
            <div key={i} className="flex items-center gap-1 mt-0.5">
              <span className={d.impact === "negative" ? "text-[#ef4444]" : d.impact === "positive" ? "text-[#10b981]" : "text-[#f59e0b]"}>
                {d.impact === "negative" ? "▼" : d.impact === "positive" ? "▲" : "→"}
              </span>
              <span className="text-[#94a3b8]">{d.label}</span>
              <span className="text-[#334155]">({d.category})</span>
              <span className="text-[#475569]">{d.magnitude}%</span>
            </div>
          ))}
        </div>

        {/* Linked Real-World Events */}
        {moe.linkedEvents && moe.linkedEvents.length > 0 && (
          <div className="mb-2">
            <div className="text-[#00d4ff] mb-0.5">LINKED EVENTS ({moe.linkedEvents.length})</div>
            {moe.linkedEvents.map((evt, i) => (
              <div key={i} className="mt-1 pl-1.5 border-l-2 border-[#00d4ff40]">
                <a href={evt.url} target="_blank" rel="noopener noreferrer"
                  className="text-[#e2e8f0] hover:text-[#00d4ff] transition-colors block leading-tight">
                  {evt.title} ↗
                </a>
                <div className="text-[#475569] mt-0.5">{evt.source}</div>
                <div className="text-[#334155] italic">{evt.relevance}</div>
              </div>
            ))}
          </div>
        )}

        {/* Strategic Alignment */}
        {moe.strategyAlignment && (
          <div className="mb-2">
            <div className="text-[#a855f7] mb-0.5">STRATEGIC ALIGNMENT</div>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <span className="px-1 py-0 bg-[#a855f715] border border-[#a855f740] text-[#a855f7] rounded text-[7px] font-bold">NSS</span>
                <span className="text-[#94a3b8]">{moe.strategyAlignment.nssObjective}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="px-1 py-0 bg-[#0891b215] border border-[#0891b240] text-[#00d4ff] rounded text-[7px] font-bold">NDS</span>
                <span className="text-[#94a3b8]">{moe.strategyAlignment.ndsLine}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="px-1 py-0 bg-[#10b98115] border border-[#10b98140] text-[#10b981] rounded text-[7px] font-bold">COCOM</span>
                <span className="text-[#94a3b8]">{moe.strategyAlignment.cocomPriority}</span>
              </div>
              <div className="text-[#475569] italic mt-0.5 pl-1 border-l-2 border-[#a855f740]">{moe.strategyAlignment.strategicNarrative}</div>
            </div>
          </div>
        )}

        {/* OSINT Collection Sources */}
        {moe.osintSources && moe.osintSources.length > 0 && (
          <div className="mb-2">
            <div className="text-[#10b981] mb-0.5">OSINT COLLECTION ({moe.osintSources.length} sources · {moe.osintSources.reduce((sum, s) => sum + s.dataPoints, 0).toLocaleString()} data points)</div>
            {moe.osintSources.map((src, i) => {
              const typeColors: Record<string, string> = { SOCMINT: "#00d4ff", GOVINT: "#10b981", ACADINT: "#a855f7", TECHINT: "#f59e0b", MEDIAINT: "#94a3b8" };
              const confColors: Record<string, string> = { HIGH: "#10b981", MEDIUM: "#f59e0b", LOW: "#ef4444" };
              return (
                <div key={i} className="flex items-center gap-1.5 mt-0.5 pl-1 border-l border-[#10b98140]">
                  <span className="px-1 py-0 rounded border text-[7px] font-bold" style={{ color: typeColors[src.type] || "#94a3b8", borderColor: `${typeColors[src.type] || "#94a3b8"}40` }}>{src.type}</span>
                  <span className="text-[#e2e8f0] flex-1">{src.name}</span>
                  <span className="text-[7px] font-bold" style={{ color: confColors[src.confidence] || "#94a3b8" }}>{src.confidence}</span>
                  <span className="text-[#334155]">{src.dataPoints.toLocaleString()}pts</span>
                  <span className="text-[#475569]">{src.lastCollection}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Evidence refs */}
        <div className="mb-2">
          <div className="text-[#475569] mb-0.5">EVIDENCE TRAIL ({run.evidence_refs.length})</div>
          {run.evidence_refs.map((ref, i) => (
            <div key={i} className="flex items-center gap-1 mt-0.5 pl-1 border-l border-[#1e3a5f]">
              <span className="text-[#94a3b8]">{ref.label}</span>
              {ref.url && (
                <a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-[#0891b2]">↗</a>
              )}
              <span className="text-[#334155] ml-auto">
                {(() => { try { return new Date(ref.timestamp).toISOString().substring(11, 16) + "Z"; } catch { return ""; } })()}
              </span>
            </div>
          ))}
        </div>

        {/* MetricRun metadata */}
        <div className="pt-1 border-t border-[#1e3a5f] text-[#334155]">
          <div>COMPUTED: {(() => { try { return new Date(run.computed_at).toISOString().replace("T", " ").substring(0, 16) + "Z"; } catch { return "—"; } })()}</div>
          <div>WINDOW: {(() => { try { return new Date(run.window_start).toISOString().substring(0, 10); } catch { return ""; } })()} → {(() => { try { return new Date(run.window_end).toISOString().substring(0, 10); } catch { return ""; } })()}</div>
          <div>INPUTS HASH: {run.inputs_hash}</div>
        </div>

        <button
          onClick={() => setView("definition")}
          className="w-full mt-2 text-[8px] py-1 border border-[#f59e0b40] text-[#f59e0b] rounded hover:bg-[#f59e0b15] font-mono"
        >
          ⓘ VIEW DEFINITION
        </button>
      </div>
    );
  }

  // ── Default Tile View ──────────────────────────────────────────
  return (
    <div
      className="tactical-card p-3 hover:border-[#334155] transition-colors"
      style={{ borderTopColor: color, borderTopWidth: 2 }}
    >
      {/* Header: ID + freshness + confidence */}
      <div className="flex items-center justify-between mb-0.5">
        <div className="text-[8px] text-[#334155] tracking-wider font-mono">{moe.id}</div>
        <div className="flex items-center gap-1">
          {isStale && (
            <span className="text-[7px] px-1 py-0 bg-[#ef444420] text-[#ef4444] rounded border border-[#ef444440] font-mono">STALE</span>
          )}
          <ConfidenceBadge level={run.confidence} />
        </div>
      </div>

      {/* Freshness label */}
      <div className="flex items-center justify-between mb-1">
        <div className="text-[8px] text-[#334155] font-mono">{ageLabel}</div>
        <div className="text-[8px] text-[#334155] font-mono">{definition?.window ?? "—"}</div>
      </div>

      {/* Name */}
      <div className="text-[10px] text-[#94a3b8] mb-2 leading-tight">{moe.name}</div>

      {/* Current vs Target */}
      <div className="flex items-end justify-between mb-1.5">
        <div>
          <div className="font-black text-lg leading-none" style={{ color }}>
            {displayVal(moe.current)}{unitLabel}
          </div>
          <div className="text-[8px] text-[#334155] font-mono mt-0.5">CURRENT</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-[#475569] font-mono font-bold">
            {lowerIsBetter ? "≤" : "≥"} {displayVal(moe.target)}{unitLabel}
          </div>
          <div className="text-[8px] text-[#334155] font-mono">TARGET</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="confidence-bar mb-1" title={progressLabel}>
        <div className="confidence-fill" style={{ width: `${progressPct}%`, background: color }} />
      </div>
      <div className="text-[8px] text-[#334155] font-mono mb-1.5 text-right" title={progressLabel}>
        {progressPct}% toward target
      </div>

      {/* "Why" summary — driven by */}
      {drivers.length > 0 && (
        <div className="text-[8px] text-[#475569] font-mono mb-1.5 leading-relaxed">
          <span className="text-[#f59e0b]">Driven by:</span>{" "}
          {drivers.map((d, i) => (
            <span key={i}>
              <span className={d.impact === "negative" ? "text-[#ef4444]" : "text-[#10b981]"}>
                {d.label}
              </span>
              {i < drivers.length - 1 ? ", " : ""}
            </span>
          ))}
        </div>
      )}

      {/* Linked Real-World Sources */}
      {moe.linkedEvents && moe.linkedEvents.length > 0 && (
        <div className="mb-1.5 pt-1 border-t border-[#1e3a5f]">
          <div className="text-[7px] text-[#00d4ff] tracking-wider mb-0.5">LINKED SOURCES</div>
          {moe.linkedEvents.map((evt, i) => (
            <a key={i} href={evt.url} target="_blank" rel="noopener noreferrer"
              className="block text-[8px] text-[#0891b2] hover:text-[#00d4ff] transition-colors leading-tight mb-0.5 font-mono">
              ↗ {evt.source}
            </a>
          ))}
        </div>
      )}

      {/* Strategy Alignment Badge */}
      {moe.strategyAlignment && (
        <div className="mb-1.5 text-[7px] font-mono">
          <span className="text-[#a855f7]">STRATEGY: </span>
          <span className="text-[#94a3b8]">{moe.strategyAlignment.cocomPriority.length > 50 ? moe.strategyAlignment.cocomPriority.substring(0, 50) + "..." : moe.strategyAlignment.cocomPriority}</span>
        </div>
      )}

      {/* Status + trend + direction */}
      <div className="flex justify-between items-center">
        <span className="text-[9px] font-bold" style={{ color }}>{moe.status}</span>
        <span className="text-[8px] text-[#334155] font-mono">{lowerIsBetter ? "↓ goal" : "↑ goal"}</span>
        <span className="text-sm font-black" style={{ color }} title={`Trend: ${moe.trend}`}>{trendArrow}</span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-1 mt-2 pt-1.5 border-t border-[#1e3a5f]">
        <button
          onClick={() => setView("definition")}
          className="flex-1 text-[8px] py-0.5 border border-[#f59e0b40] text-[#f59e0b] rounded hover:bg-[#f59e0b15] font-mono"
        >
          ⓘ Definition
        </button>
        <button
          onClick={() => setView("detail")}
          className="flex-1 text-[8px] py-0.5 border border-[#0891b240] text-[#00d4ff] rounded hover:bg-[#0891b215] font-mono"
        >
          📊 Drilldown
        </button>
      </div>
    </div>
  );
}

// ── Mini Trend Chart (text-based sparkline) ─────────────────────────

function MiniTrendChart({
  data,
  color,
  target,
}: {
  data: MetricTrendPoint[];
  color: string;
  target: number;
}) {
  if (data.length === 0) return null;

  const values = data.map((d) => d.value);
  const min = Math.min(...values, target) * 0.9;
  const max = Math.max(...values, target) * 1.1;
  const range = max - min || 1;
  const chartHeight = 40;
  const chartWidth = "100%";

  // Normalize to 0-chartHeight
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = chartHeight - ((d.value - min) / range) * chartHeight;
    return `${x},${y}`;
  }).join(" ");

  const targetY = chartHeight - ((target - min) / range) * chartHeight;

  return (
    <div className="bg-[#070d1a] border border-[#1e3a5f] rounded p-1.5">
      <svg viewBox={`0 0 100 ${chartHeight}`} style={{ width: chartWidth, height: chartHeight }} preserveAspectRatio="none">
        {/* Target line */}
        <line
          x1="0" y1={targetY} x2="100" y2={targetY}
          stroke="#475569" strokeWidth="0.5" strokeDasharray="2,2"
        />
        {/* Data line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="flex justify-between text-[7px] text-[#334155] mt-0.5">
        <span>{values[0]?.toFixed(1)}</span>
        <span className="text-[#475569]">--- target: {target}</span>
        <span style={{ color }}>{values[values.length - 1]?.toFixed(1)}</span>
      </div>
    </div>
  );
}

// ── Threat Badge ────────────────────────────────────────────────────

function ThreatBadge({ level }: { level: string }) {
  const color = threatColor(level);
  return (
    <span
      className="px-2 py-0.5 rounded text-[10px] font-bold border"
      style={{ color, borderColor: color, background: `${color}15` }}
    >
      {level}
    </span>
  );
}
