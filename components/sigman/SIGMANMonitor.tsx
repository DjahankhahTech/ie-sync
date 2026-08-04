"use client";

import { useEffect } from "react";
import { useIEStore } from "@/store/ie-store";
import { GlossaryPanel } from "@/components/ui/GlossaryPanel";

// SIGMAN Monitor — open-source signature/OPSEC self-assessment. Scans the live
// OSINT for what is being revealed about FRIENDLY (US/allied) force posture that
// an adversary could exploit. Powered by /api/sigman (Claude). UNCLASS // OSINT.
// Posted 3x daily (0600/1200/1800 ET), server-cached, and prefetched in the
// background on app load so it's ready before the user opens this tab.

const SLOT_LABEL: Record<string, string> = { "0600": "0600 ET", "1200": "1200 ET", "1800": "1800 ET", "0000": "overnight" };

const riskColor = (r: string) => (r === "CRITICAL" ? "#ef4444" : r === "HIGH" ? "#f59e0b" : r === "MEDIUM" ? "#eab308" : "#10b981");
const postureColor = (p: string) => (p === "HIGH" ? "#ef4444" : p === "ELEVATED" ? "#f59e0b" : p === "MODERATE" ? "#eab308" : "#10b981");
const CATS = ["TECHNICAL", "PHYSICAL", "ADMINISTRATIVE", "INFORMATIONAL"] as const;
const catHint: Record<string, string> = {
  TECHNICAL: "emissions / cyber / technical disclosures",
  PHYSICAL: "locations / movements / installations",
  ADMINISTRATIVE: "personnel / social media / patterns / contracts",
  INFORMATIONAL: "disclosed intent / plans / messaging",
};

export function SIGMANMonitor() {
  // SIGMAN result lives in the store (prefetched in background; cleared on AOR
  // switch). `scan(true)` re-scans from the latest sources.
  const { activeGCC, sigman: result, sigmanLoading: loading, sigmanError: error, loadSigman } = useIEStore();
  const scan = (force = false) => loadSigman(activeGCC, force);

  // Ensure the scan is loaded if the background prefetch hasn't; guarded so it
  // won't double-fetch.
  useEffect(() => {
    if (!result && !loading) loadSigman(activeGCC);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGCC]);

  const a = result?.assessment;
  const byCat = (c: string) => a?.items.filter((i) => i.category === c) ?? [];
  const critical = a?.items.filter((i) => i.riskLevel === "CRITICAL").length ?? 0;
  const high = a?.items.filter((i) => i.riskLevel === "HIGH").length ?? 0;

  return (
    <div className="p-4 overflow-y-auto h-full space-y-4">
      {/* Header / scan */}
      <div className="tactical-card p-4 border border-[#0891b2]">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[#00d4ff] text-sm font-black tracking-widest">SIGNATURE MANAGEMENT (SIGMAN) — WHAT WE&apos;RE GIVING AWAY</div>
            <div className="text-[#475569] text-xs">
              A signature is anything observable — radio emissions, posted photos, ship movements, patterns — that tells an adversary where friendly (US/allied) forces are or what they&apos;re about to do. This scan checks open-source news for those giveaways. Powered by Claude over the live OSINT feed. Auto-updated 0600 / 1200 / 1800 ET; refresh for the latest sources.
            </div>
          </div>
          <button
            onClick={() => scan(true)}
            disabled={loading}
            className="px-4 py-2 text-xs bg-[#1e3a5f] border border-[#00d4ff] text-[#00d4ff] rounded hover:bg-[#00d4ff15] disabled:opacity-50 font-bold tracking-wider"
          >
            {loading ? "SCANNING OSINT…" : "↻ REFRESH (LATEST SOURCES)"}
          </button>
        </div>
        {error && <div className="mt-3 p-2 border border-[#ef4444] bg-[#ef444410] rounded text-[11px] text-[#ef4444] font-mono">✗ {error}</div>}
        {result && (
          <div className="mt-3 p-2 border border-[#f59e0b50] bg-[#f59e0b08] rounded text-[10px] text-[#94a3b8] flex items-start gap-2">
            <span className="text-[#f59e0b]">⚑</span>
            <div><span className="text-[#f59e0b] font-bold">{result.classification} · AI-DRAFT{result.slot ? ` · ${SLOT_LABEL[result.slot] ?? result.slot} post` : ""} — </span>{result.provenance} {new Date(result.generatedAt).toLocaleString()} · {result.sourceCount} sources · {result.model}.</div>
          </div>
        )}
      </div>

      {!result && !loading && (
        <div className="tactical-card p-8 text-center">
          <div className="text-[#1e3a5f] text-4xl mb-3">📡</div>
          <div className="text-[#475569] text-sm mb-1">No signature scan run yet</div>
          <div className="text-[#334155] text-xs max-w-md mx-auto">Press &quot;Refresh (latest sources)&quot; above to scan today&apos;s open-source news for anything that reveals friendly-force locations, movements, installations, or patterns in this theater.</div>
        </div>
      )}

      {a && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-4 gap-3">
            <Stat label="EXPOSURE INDEX" value={`${a.overallExposure}`} sub="/100" color={postureColor(a.posture)} />
            <Stat label="POSTURE" value={a.posture} color={postureColor(a.posture)} />
            <Stat label="CRITICAL" value={String(critical)} color="#ef4444" />
            <Stat label="HIGH" value={String(high)} color="#f59e0b" />
          </div>

          <div className="tactical-card p-3">
            <div className="text-[#475569] text-[10px] tracking-wider mb-1">ASSESSMENT SUMMARY</div>
            <div className="text-[#cbd5e1] text-sm">{a.summary}</div>
          </div>

          {/* By category */}
          {CATS.map((c) => {
            const items = byCat(c);
            return (
              <div key={c} className="tactical-card p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[#00d4ff] text-xs font-bold tracking-widest">{c} SIGNATURES</div>
                  <div className="text-[10px] text-[#475569]">{catHint[c]} · {items.length} finding(s)</div>
                </div>
                {items.length === 0 ? (
                  <div className="text-[#334155] text-xs">No {c.toLowerCase()} exposure detected in current OSINT.</div>
                ) : (
                  <div className="space-y-2">
                    {items.map((s, i) => (
                      <div key={i} className="border border-[#1e3a5f] rounded p-2.5 bg-[#070d1a]">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-[#e2e8f0] text-[12px] font-bold">{s.indicator}</div>
                          <span className="px-2 py-0.5 text-[9px] border rounded font-bold flex-shrink-0" style={{ borderColor: riskColor(s.riskLevel), color: riskColor(s.riskLevel) }}>{s.riskLevel} · {s.exposureScore}</span>
                        </div>
                        <div className="text-[#94a3b8] text-[11px] mt-1"><span className="text-[#475569]">Adversary exploitation:</span> {s.exposure}</div>
                        <div className="text-[#10b981] text-[11px] mt-1"><span className="text-[#475569]">Mitigation:</span> {s.recommendation}</div>
                        {s.sourceUrl && (
                          <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[#0891b2] text-[10px] mt-1 inline-block hover:text-[#00d4ff] underline">↗ {s.sourceTitle || "source"}</a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      <GlossaryPanel module="sigman" />
    </div>
  );
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="tactical-card p-3">
      <div className="text-[#475569] text-[10px] tracking-wider">{label}</div>
      <div className="text-2xl font-black mt-1" style={{ color }}>
        {value}{sub && <span className="text-sm text-[#475569]">{sub}</span>}
      </div>
    </div>
  );
}
