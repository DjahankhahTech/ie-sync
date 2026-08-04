"use client";

import { useState, useEffect } from "react";
import { useIEStore } from "@/store/ie-store";
import { GlossaryPanel } from "@/components/ui/GlossaryPanel";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";

// ── MOE definitions — formula, data inputs, cadence, known biases ──────────
// These must be visible to any analyst reading the running estimate so they
// understand WHAT is being measured and HOW scores are derived.
const MOE_DEFINITIONS: Record<string, { formula: string; inputs: string; cadence: string; biasRisk: string }> = {
  "MOE-1": {
    formula: "% of sampled content in monitored channels attributed to adversary narrative",
    inputs: "SOCMINT platform scrape (Telegram/WeChat/CGTN); OSINT media monitoring",
    cadence: "Every 6 hours; 24hr rolling average",
    biasRisk: "Platform sampling bias; adversary may shift to unmonitored channels; language coverage gaps",
  },
  "MOE-2": {
    formula: "% of surveyed/monitored population expressing favorable sentiment toward friendly forces",
    inputs: "Social media sentiment analysis + available polling data + HUMINT reports",
    cadence: "Daily; lags real opinion by 24-72h",
    biasRisk: "Self-reporting bias; bots may inflate apparent hostile sentiment; no direct survey in active AO",
  },
  "MOE-3": {
    formula: "Count of confirmed adversary IO actions detected per 24-hour period",
    inputs: "SIGINT, CYBERCOM indicators, SOCMINT anomaly detection, HUMINT reporting",
    cadence: "Every 4 hours",
    biasRisk: "Detection-limited: undetected actions not counted; may reflect collection quality not actual activity",
  },
  "MOE-4": {
    formula: "Ratio of friendly-attributed content to adversary-attributed content in target information space",
    inputs: "OSINT media volume monitoring; PA/MISO product tracking",
    cadence: "Every 12 hours",
    biasRisk: "Quantity ≠ quality; viral adversary content may outperform higher-volume friendly content",
  },
  "MOE-5": {
    formula: "Ally confidence index (0-100) derived from liaison reports + partner nation media + diplomatic channels",
    inputs: "Liaison officer reports; partner nation media analysis; embassy reporting",
    cadence: "Weekly; high latency",
    biasRisk: "Diplomatic reporting lag; allies may underreport concerns; limited to official channels",
  },
  "MOE-6": {
    formula: "% of identified deepfake/synthetic media items successfully removed from monitored platforms",
    inputs: "AI-assisted detection log; platform takedown request tracking system",
    cadence: "Continuous; updated on detection event",
    biasRisk: "Detection-limited: undetected deepfakes excluded; platform compliance varies by jurisdiction",
  },
};

// ── Running Estimate Version History ──────────────────────────────────────
interface REVersion {
  version: string;       // e.g. "v1.0"
  savedAt: string;       // ISO
  analystInitials: string;
  ieCondition: string;
  ieSituationSnap: string;
  moeSnapshot: Array<{ id: string; current: number; status: string }>;
  changeNote: string;
}

// ── Recorded assessment history ───────────────────────────────────────────
// Real snapshots written by /api/analyze on each fresh generation. There is no
// synthetic fallback on purpose: an empty archive renders as an empty chart
// with an explanation, never as placeholder data that could be mistaken for a
// track record.
interface HistoryPoint {
  day: string;
  slot: string;
  adversarialReachShare: number | null;
  meanSentiment: number | null;
  adversarialThreads: number;
}

export function RunningEstimateModule() {
  const { runningEstimate, moeMetrics, mopMetrics, activeGCC, assessment, assessmentLoading, assessmentError, generateAssessment, suggestedMOE, suggestedMOP } = useIEStore();
  const [history, setHistory] = useState<HistoryPoint[] | null>(null);
  const [historyEnabled, setHistoryEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setHistory(null);
    fetch(`/api/history?gcc=${activeGCC}&days=30`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { enabled?: boolean; points?: HistoryPoint[] }) => {
        if (cancelled) return;
        setHistoryEnabled(d.enabled !== false);
        setHistory(Array.isArray(d.points) ? d.points : []);
      })
      .catch(() => { if (!cancelled) setHistory([]); });
    return () => { cancelled = true; };
  }, [activeGCC]);

  const historyChartData = (history ?? []).map((p) => ({
    // "08-01 1200" — day plus slot, since there are up to three points per day.
    label: `${p.day.slice(5)} ${p.slot}`,
    adversarialReachShare: p.adversarialReachShare,
    meanSentiment: p.meanSentiment,
    adversarialThreads: p.adversarialThreads,
  }));

  const [showMoeDefs, setShowMoeDefs] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<REVersion[]>([
    // Seed with a "v1.0" baseline so there's always a prior version to compare
    {
      version: "v1.0",
      savedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8h ago
      analystInitials: "JDO",
      ieCondition: runningEstimate.ieCondition,
      ieSituationSnap: runningEstimate.ieSituation.substring(0, 200),
      moeSnapshot: moeMetrics.map((m) => ({ id: m.id, current: m.current, status: m.status })),
      changeNote: "Initial baseline — watch handover from 0600Z shift",
    },
  ]);
  const [changeNote, setChangeNote] = useState("");
  const [analystInitials, setAnalystInitials] = useState("IO");
  const [showDiff, setShowDiff] = useState<string | null>(null); // version string to show diff for

  // Client-only timestamp — avoids SSR/hydration mismatch
  const [nowDTG, setNowDTG] = useState<string | null>(null);
  useEffect(() => { setNowDTG(new Date().toISOString().substring(0, 16)); }, []);

  // Auto-load the day's cached AI assessment on mount / AOR change (does not
  // regenerate — served from the daily cache warmed by cron at 06:00 ET).
  useEffect(() => {
    if (!assessment && !assessmentLoading) generateAssessment(activeGCC);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGCC]);

  const currentVersionLabel = `v${(1 + versions.length).toFixed(1)}`;

  const saveVersion = () => {
    const newVer: REVersion = {
      version: currentVersionLabel,
      savedAt: new Date().toISOString(),
      analystInitials,
      ieCondition: runningEstimate.ieCondition,
      ieSituationSnap: runningEstimate.ieSituation.substring(0, 200),
      moeSnapshot: moeMetrics.map((m) => ({ id: m.id, current: m.current, status: m.status })),
      changeNote: changeNote || "No change note provided",
    };
    setVersions((v) => [...v, newVer]);
    setChangeNote("");
    setShowVersions(true);
  };

  const ieConditionColor =
    runningEstimate.ieCondition === "HOSTILE"
      ? "#ef4444"
      : runningEstimate.ieCondition === "UNCERTAIN"
      ? "#f59e0b"
      : "#10b981";

  return (
    <div className="page-scroll page-scroll-wide">
      <header className="page-header">
        <div>
          <h1 className="page-title">Adversary estimate</h1>
          <p className="page-subtitle">
            Draft speculation on adversary activity and likely next moves in the information
            environment — grounded in open-source reporting. Review, challenge, and revise
            before any briefing.
          </p>
        </div>
      </header>

      {/* AI Assessment engine */}
      <div className="panel border-[var(--accent-dim)]">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="panel-title">Generate from live OSINT</h2>
            <p className="text-[14px] text-muted m-0 mt-1 max-w-2xl">
              Drafts the IE estimate, threat picture, hostile narratives, and COA options from
              open sources. Cached daily; refresh pulls the latest articles.
            </p>
          </div>
          <button
            type="button"
            onClick={() => generateAssessment(activeGCC, true)}
            disabled={assessmentLoading}
            className="btn btn-primary"
          >
            {assessmentLoading ? "Analyzing OSINT…" : "Refresh from latest sources"}
          </button>
        </div>
        {assessmentError && (
          <div className="notice notice-danger mt-3">✗ {assessmentError}</div>
        )}
        {assessment && (
          <div className="notice notice-warn mt-3">
            <strong>{assessment.classification} · AI draft.</strong>{" "}
            {assessment.provenance} Generated{" "}
            {new Date(assessment.generatedAt).toLocaleString()} from{" "}
            {assessment.sourceCount} OSINT sources · {assessment.model}.
          </div>
        )}
      </div>

      {/* Header */}
      <div className="panel">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="label">{runningEstimate.classification}</div>
            <div className="text-[1.15rem] font-bold mt-1">
              Running estimate — information environment
            </div>
            <div className="text-muted text-[15px] mt-0.5">
              {runningEstimate.operationName || "No operation name yet — generate an assessment"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[#475569] text-[10px] font-mono">DTG:</div>
            <div className="text-[#00d4ff] font-mono text-sm">{runningEstimate.dtg}</div>
            <div className="mt-2 px-3 py-1 border rounded text-sm font-bold" style={{ borderColor: ieConditionColor, color: ieConditionColor }}>
              IE: {runningEstimate.ieCondition}
            </div>
          </div>
        </div>

        <div className="mt-3 p-3 bg-[#070d1a] border border-[#1e3a5f] rounded">
          <div className="text-[#475569] text-[10px] tracking-wider mb-1">MISSION STATEMENT</div>
          <div className="text-[#e2e8f0] text-xs leading-relaxed">{runningEstimate.missionStatement}</div>
        </div>

        <div className="mt-3 p-3 bg-[#070d1a] border border-[#1e3a5f] rounded">
          <div className="text-[#475569] text-[10px] tracking-wider mb-1">CDRU OBJECTIVE</div>
          <div className="text-[#00d4ff] text-xs leading-relaxed">{runningEstimate.cdruObjective}</div>
        </div>

        {/* ── Version control bar ─────────────────────────────────────── */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[#475569] text-[9px] font-mono">ANALYST:</span>
            <input
              type="text"
              value={analystInitials}
              onChange={(e) => setAnalystInitials(e.target.value.substring(0, 4).toUpperCase())}
              className="w-12 px-1 py-0.5 bg-[#070d1a] border border-[#1e3a5f] rounded text-[9px] text-[#e2e8f0] focus:outline-none focus:border-[#0891b2] font-mono text-center"
              placeholder="JDO"
            />
          </div>
          <input
            type="text"
            value={changeNote}
            onChange={(e) => setChangeNote(e.target.value)}
            placeholder={`Change note for ${currentVersionLabel}...`}
            className="flex-1 min-w-[180px] px-2 py-0.5 bg-[#070d1a] border border-[#1e3a5f] rounded text-[9px] text-[#e2e8f0] placeholder-[#334155] focus:outline-none focus:border-[#0891b2] font-mono"
          />
          <button
            onClick={saveVersion}
            className="px-2 py-0.5 text-[9px] border border-[#00d4ff] text-[#00d4ff] rounded hover:bg-[#00d4ff15] font-mono font-bold whitespace-nowrap"
          >
            SAVE {currentVersionLabel}
          </button>
          <button
            onClick={() => setShowVersions(!showVersions)}
            className="px-2 py-0.5 text-[9px] border border-[#1e3a5f] text-[#475569] rounded hover:border-[#334155] font-mono"
          >
            HISTORY ({versions.length}) {showVersions ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {/* ── Version History Panel ────────────────────────────────────── */}
      {showVersions && (
        <div className="tactical-card p-4">
          <div className="text-[#00d4ff] text-xs font-bold tracking-widest mb-3">RUNNING ESTIMATE VERSION HISTORY</div>
          <div className="space-y-2">
            {[...versions].reverse().map((ver, idx) => {
              const prev = [...versions].reverse()[idx + 1] ?? null;
              const moeChanges = prev
                ? ver.moeSnapshot.filter((m) => {
                    const prevMoe = prev.moeSnapshot.find((p) => p.id === m.id);
                    return prevMoe && prevMoe.status !== m.status;
                  })
                : [];
              const ieChanged = prev && prev.ieCondition !== ver.ieCondition;
              return (
                <div key={ver.version} className="p-3 border border-[#1e3a5f] rounded bg-[#070d1a]">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[#00d4ff] text-[10px] font-black font-mono">{ver.version}</span>
                      <span className="text-[#475569] text-[9px] font-mono">{ver.savedAt.substring(0, 16)}Z</span>
                      <span className="px-1.5 py-0.5 border border-[#1e3a5f] text-[#94a3b8] rounded text-[9px] font-mono">{ver.analystInitials}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold border"
                        style={{
                          color: ver.ieCondition === "HOSTILE" ? "#ef4444" : ver.ieCondition === "UNCERTAIN" ? "#f59e0b" : "#10b981",
                          borderColor: ver.ieCondition === "HOSTILE" ? "#ef4444" : ver.ieCondition === "UNCERTAIN" ? "#f59e0b" : "#10b981",
                        }}>
                        IE: {ver.ieCondition}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowDiff(showDiff === ver.version ? null : ver.version)}
                      className="text-[9px] text-[#475569] border border-[#1e3a5f] px-1.5 py-0.5 rounded hover:border-[#334155] font-mono"
                    >
                      {showDiff === ver.version ? "HIDE DIFF" : "DIFF ▼"}
                    </button>
                  </div>
                  <div className="text-[#94a3b8] text-[9px] mt-1 font-mono italic">{ver.changeNote}</div>

                  {/* Diff view */}
                  {showDiff === ver.version && (
                    <div className="mt-2 space-y-1.5">
                      {ieChanged && (
                        <div className="text-[9px] font-mono p-1.5 bg-[#f59e0b08] border border-[#f59e0b30] rounded">
                          <span className="text-[#f59e0b]">Δ IE CONDITION: </span>
                          <span className="text-[#ef4444]">{prev?.ieCondition ?? "—"}</span>
                          <span className="text-[#475569]"> → </span>
                          <span className="text-[#10b981]">{ver.ieCondition}</span>
                        </div>
                      )}
                      {moeChanges.length > 0 ? (
                        <div className="space-y-1">
                          {moeChanges.map((m) => {
                            const prevMoe = prev?.moeSnapshot.find((p) => p.id === m.id);
                            return (
                              <div key={m.id} className="text-[9px] font-mono p-1 bg-[#060d1a] border border-[#1e3a5f] rounded flex items-center gap-2">
                                <span className="text-[#475569]">{m.id}:</span>
                                <span className="text-[#ef4444]">{prevMoe?.status ?? "—"}</span>
                                <span className="text-[#475569]">→</span>
                                <span className="text-[#10b981]">{m.status}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-[9px] text-[#334155] font-mono">No MOE status changes from previous version.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* IE Situation + Trend Charts */}
      <div className="grid grid-cols-2 gap-4">
        {/* Situation Narrative */}
        <div className="tactical-card p-4">
          <div className="text-[#00d4ff] text-xs font-bold tracking-widest mb-3">IE SITUATION ASSESSMENT</div>
          <div className="text-[#e2e8f0] text-xs leading-relaxed mb-4">{runningEstimate.ieSituation}</div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[#ef4444] text-[10px] font-bold tracking-wider mb-2">ADVERSARY CAPABILITIES</div>
              <ul className="space-y-1">
                {runningEstimate.adversaryCapabilities.map((cap, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[10px] text-[#94a3b8]">
                    <span className="text-[#ef4444] mt-0.5 flex-shrink-0">▸</span>
                    {cap}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-[#10b981] text-[10px] font-bold tracking-wider mb-2">FRIENDLY CAPABILITIES</div>
              <ul className="space-y-1">
                {runningEstimate.friendlyCapabilities.map((cap, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[10px] text-[#94a3b8]">
                    <span className="text-[#10b981] mt-0.5 flex-shrink-0">▸</span>
                    {cap}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Recorded assessment trend — real snapshots only */}
        <div className="tactical-card p-4">
          <div className="flex items-baseline justify-between mb-3">
            <div className="text-[#00d4ff] text-xs font-bold tracking-widest">ASSESSMENT TREND — RECORDED SNAPSHOTS</div>
            {historyChartData.length > 0 && (
              <div className="text-[9px] text-[#475569]">{historyChartData.length} snapshot{historyChartData.length === 1 ? "" : "s"} · 30d</div>
            )}
          </div>

          {history === null ? (
            <div className="h-[220px] flex items-center justify-center text-[10px] text-[#475569]">
              Loading recorded history…
            </div>
          ) : historyChartData.length === 0 ? (
            <div className="h-[220px] flex flex-col items-center justify-center gap-2 px-6 text-center">
              <div className="text-[#f59e0b] text-lg">⚑</div>
              <div className="text-[11px] text-[#94a3b8] font-bold">No recorded history yet</div>
              <div className="text-[10px] text-[#64748b] leading-relaxed max-w-md">
                {historyEnabled
                  ? "This chart plots only assessments this system actually generated and stored. The archive fills as the 0600/1200/1800 ET runs execute — expect a readable trend after roughly three days."
                  : "History storage is not provisioned (DATABASE_URL is unset), so no assessment is being retained. Until it is, every generated product is discarded when its cache expires."}
              </div>
              <div className="text-[9px] text-[#475569] mt-1">
                No placeholder data is shown here by design.
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={historyChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid stroke="#1e3a5f" strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#475569", fontSize: 9 }}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis tick={{ fill: "#475569", fontSize: 9 }} domain={[-100, 100]} />
                <Tooltip
                  contentStyle={{
                    background: "#0f1829",
                    border: "1px solid #1e3a5f",
                    borderRadius: "4px",
                    fontSize: "11px",
                    color: "#e2e8f0",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "10px", color: "#94a3b8" }} />
                {/* Neutral sentiment, not a target — the model emits sentiment on -1..1, scaled here to -100..100. */}
                <ReferenceLine y={0} stroke="#334155" strokeDasharray="4 2" label={{ value: "Neutral", fill: "#475569", fontSize: 9 }} />
                <Line type="monotone" dataKey="adversarialReachShare" stroke="#ef4444" name="Adversarial Reach Share %" dot={false} strokeWidth={2} connectNulls />
                <Line type="monotone" dataKey="meanSentiment" stroke="#10b981" name="Mean Narrative Sentiment" dot={false} strokeWidth={2} connectNulls />
                <Line type="monotone" dataKey="adversarialThreads" stroke="#f59e0b" name="Adversarial Threads" dot={false} strokeWidth={1.5} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          )}

          <div className="text-[9px] text-[#475569] mt-2 leading-relaxed">
            Derived from stored AI-DRAFT assessments — what the tool claimed at each run, not a measured intelligence series.
          </div>
        </div>
      </div>

      {/* Assumptions / Limitations / Risks */}
      <div className="grid grid-cols-3 gap-4">
        <InfoList title="PLANNING ASSUMPTIONS" items={runningEstimate.assumptions} color="#2288ff" icon="◈" />
        <InfoList title="LIMITATIONS" items={runningEstimate.limitations} color="#f59e0b" icon="⚑" />
        <InfoList title="RISK ASSESSMENT" items={runningEstimate.risks} color="#ef4444" icon="⚠" />
      </div>

      {/* Recommendations */}
      <div className="tactical-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[#00d4ff] text-xs font-bold tracking-widest">ANALYST RECOMMENDATIONS</div>
          <div className="text-[9px] px-2 py-0.5 border border-[#00d4ff50] text-[#00d4ff] rounded font-mono tracking-wider">
            IO DOCTRINE BASIS: JP 3-13 / FM 3-13
          </div>
        </div>
        <div className="space-y-2">
          {runningEstimate.recommendations.map((rec, i) => {
            const isImmediate = rec.startsWith("IMMEDIATE");
            const isUrgent = rec.startsWith("URGENT");
            const isPriority = rec.startsWith("PRIORITY");
            const color = isImmediate ? "#ef4444" : isUrgent ? "#f59e0b" : isPriority ? "#2288ff" : "#00d4ff";
            const label = isImmediate ? "IMMEDIATE" : isUrgent ? "URGENT" : isPriority ? "PRIORITY" : "SUSTAIN";
            return (
              <div key={i} className="flex items-start gap-2 p-2 bg-[#070d1a] border border-[#1e3a5f] rounded">
                <span className="px-1.5 py-0.5 text-[9px] font-black rounded flex-shrink-0 mt-0.5"
                  style={{ color, background: `${color}20`, border: `1px solid ${color}60` }}>
                  {label}
                </span>
                <span className="text-xs text-[#e2e8f0]">{rec}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-[#475569] text-[10px] font-mono text-right">
          ANALYST REVIEW REQUIRED BEFORE COMMANDER BRIEFING // {nowDTG ? `${nowDTG}Z` : "—"}
        </div>
      </div>

      {/* ── Potential Measures — MOE / MOP (AI-drafted from the assessment) ── */}
      {(suggestedMOE.length > 0 || suggestedMOP.length > 0) && (
        <div className="tactical-card flex-shrink-0 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[#00d4ff] text-xs font-bold tracking-widest">POTENTIAL MEASURES — MOE / MOP (AI-DRAFT)</div>
            <div className="text-[9px] px-2 py-0.5 border border-[#f59e0b50] text-[#f59e0b] rounded font-mono tracking-wider">
              PROPOSED FROM CURRENT ASSESSMENT
            </div>
          </div>
          <div className="text-[10px] text-[#475569]">
            Proposed by the AI assessment from the AO threats &amp; narratives. The analyst sets baselines and collection methods and validates before operational use.
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* MOE */}
            <div>
              <div className="text-[#10b981] text-[10px] font-bold tracking-wider mb-2">MEASURES OF EFFECTIVENESS — are we achieving the effect?</div>
              <div className="space-y-2">
                {suggestedMOE.map((m, i) => (
                  <div key={i} className="p-2.5 bg-[#070d1a] border border-[#1e3a5f] rounded text-[11px] text-[#cbd5e1] leading-relaxed">
                    <span className="text-[#475569] font-mono mr-1">MOE-{i + 1}</span> {m}
                  </div>
                ))}
                {suggestedMOE.length === 0 && <div className="text-[10px] text-[#334155]">None proposed.</div>}
              </div>
            </div>
            {/* MOP */}
            <div>
              <div className="text-[#00d4ff] text-[10px] font-bold tracking-wider mb-2">MEASURES OF PERFORMANCE — are the tasks being executed?</div>
              <div className="space-y-2">
                {suggestedMOP.map((m, i) => (
                  <div key={i} className="p-2.5 bg-[#070d1a] border border-[#1e3a5f] rounded text-[11px] text-[#cbd5e1] leading-relaxed">
                    <span className="text-[#475569] font-mono mr-1">MOP-{i + 1}</span> {m}
                  </div>
                ))}
                {suggestedMOP.length === 0 && <div className="text-[10px] text-[#334155]">None proposed.</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MOE Definition Cards (scoring transparency) — only when live metrics exist ── */}
      {moeMetrics.length > 0 && (
      <div className="tactical-card flex-shrink-0">
        <button
          onClick={() => setShowMoeDefs((v) => !v)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#162035] transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-[#00d4ff]">◈</span>
            <div className="text-left">
              <div className="text-[#00d4ff] text-xs font-bold tracking-widest">MOE SCORING BASIS — DEFINITION CARDS</div>
              <div className="text-[#475569] text-[9px] font-mono">Formula, data inputs, collection cadence, and known bias risks for each MOE</div>
            </div>
          </div>
          <span className="text-[#475569] text-xs font-mono">{showMoeDefs ? "▲ HIDE" : "▼ SHOW"}</span>
        </button>
        {showMoeDefs && (
          <div className="border-t border-[#1e3a5f] p-4 grid grid-cols-2 gap-3">
            {moeMetrics.map((moe) => {
              const def = MOE_DEFINITIONS[moe.id];
              const statusColor = { GREEN: "#10b981", AMBER: "#f59e0b", RED: "#ef4444" }[moe.status];
              return (
                <div key={moe.id} className="p-3 bg-[#070d1a] border border-[#1e3a5f] rounded hover:border-[#1e3a5f80] transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[#475569] text-[9px] font-mono">{moe.id}</span>
                      <div className="text-xs font-bold text-[#e2e8f0]">{moe.name}</div>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold border flex-shrink-0"
                      style={{ color: statusColor, borderColor: statusColor, background: `${statusColor}15` }}>
                      {moe.status}
                    </span>
                  </div>
                  {def ? (
                    <dl className="space-y-1 text-[9px]">
                      <div><dt className="text-[#475569] inline">FORMULA: </dt><dd className="text-[#94a3b8] inline">{def.formula}</dd></div>
                      <div><dt className="text-[#475569] inline">INPUTS: </dt><dd className="text-[#94a3b8] inline">{def.inputs}</dd></div>
                      <div><dt className="text-[#475569] inline">CADENCE: </dt><dd className="text-[#94a3b8] inline">{def.cadence}</dd></div>
                      <div><dt className="text-[#ef4444] inline">BIAS RISK: </dt><dd className="text-[#94a3b8] inline">{def.biasRisk}</dd></div>
                    </dl>
                  ) : (
                    <div className="text-[9px] text-[#334155] font-mono italic">Definition pending — analyst must document before operational use.</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* MOP Tracking Table — only when live metrics exist */}
      {mopMetrics.length > 0 && (
      <div className="tactical-card">
        <div className="px-4 py-3 border-b border-[#1e3a5f] flex items-center justify-between">
          <div className="text-[#00d4ff] text-xs font-bold tracking-widest">RECOMMENDED MEASURES OF PERFORMANCE</div>
          <div className="text-[9px] px-2 py-0.5 border border-[#f59e0b50] text-[#f59e0b] rounded font-mono tracking-wider">
            TASK EXECUTION STATUS
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-[#1e3a5f] text-[#475569] text-[10px] tracking-wider">
                <th className="text-left px-4 py-2">MOP</th>
                <th className="text-left px-4 py-2">CAPABILITY</th>
                <th className="text-left px-4 py-2">TASK</th>
                <th className="text-left px-4 py-2">PLANNED</th>
                <th className="text-left px-4 py-2">ACTUAL</th>
                <th className="text-left px-4 py-2">COMPLETION</th>
                <th className="text-left px-4 py-2">STATUS</th>
                <th className="text-left px-4 py-2">SOURCE</th>
              </tr>
            </thead>
            <tbody>
              {mopMetrics.map((mop) => {
                const pct = Math.min(100, Math.round((mop.actual / mop.planned) * 100));
                const statusColor = { GREEN: "#10b981", AMBER: "#f59e0b", RED: "#ef4444" }[mop.status];
                return (
                  <tr key={mop.id} className="border-b border-[#1e3a5f] hover:bg-[#162035]">
                    <td className="px-4 py-2.5 text-[#94a3b8]">{mop.id}</td>
                    <td className="px-4 py-2.5">
                      <span className="px-1.5 py-0.5 border border-[#0891b2] text-[#00d4ff] rounded text-[10px]">
                        {mop.capability}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[#e2e8f0]">{mop.task}</td>
                    <td className="px-4 py-2.5 text-[#94a3b8]">{mop.planned} {mop.unit}</td>
                    <td className="px-4 py-2.5 font-bold" style={{ color: statusColor }}>{mop.actual} {mop.unit}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="confidence-bar w-16">
                          <div className="confidence-fill" style={{ width: `${pct}%`, background: statusColor }} />
                        </div>
                        <span style={{ color: statusColor }}>{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold border"
                        style={{ color: statusColor, borderColor: statusColor, background: `${statusColor}15` }}>
                        {mop.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {mop.linkedEvents && mop.linkedEvents.length > 0 ? (
                        <div className="space-y-0.5">
                          {mop.linkedEvents.slice(0, 1).map((evt, i) => (
                            <a key={i} href={evt.url} target="_blank" rel="noopener noreferrer"
                              className="text-[9px] text-[#0891b2] hover:text-[#00d4ff] transition-colors block truncate max-w-[160px]"
                              title={`${evt.title} (${evt.source})`}>
                              {evt.source} ↗
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[#334155] text-[9px]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* ── IO Glossary / Dictionary ───────────────────────────────── */}
      <GlossaryPanel module="running-estimate" />
    </div>
  );
}

function InfoList({ title, items, color, icon }: {
  title: string;
  items: string[];
  color: string;
  icon: string;
}) {
  return (
    <div className="tactical-card p-4">
      <div className="text-xs font-bold tracking-widest mb-3" style={{ color }}>{title}</div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[10px] text-[#94a3b8]">
            <span style={{ color }} className="flex-shrink-0 mt-0.5">{icon}</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
