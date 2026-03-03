"use client";

import { useEffect, useState } from "react";
import { useIEStore } from "@/store/ie-store";
import type { SignatureRiskComposite, EMCONReading, OPSECViolation, SATVULWindow } from "@/lib/mock-data";
import { MetricContractPanel } from "@/components/ui/MetricContractPanel";

function SubScore({ label, score, weight }: { label: string; score: number; weight: string }) {
  const color = score > 55 ? "#ef4444" : score > 25 ? "#f59e0b" : "#10b981";
  return (
    <div className="p-3 border rounded border-[#1e3a5f] bg-[#070d1a]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] tracking-[0.12em] text-[#94a3b8] font-bold">{label}</span>
        <span className="text-[8px] text-[#475569]">weight: {weight}</span>
      </div>
      <div className="text-2xl font-black" style={{ color }}>{score}</div>
      <div className="h-1.5 bg-[#1e3a5f] rounded-full mt-1 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  );
}

function EMCONTable({ readings }: { readings: EMCONReading[] }) {
  const statusColors: Record<string, string> = {
    SILENT: "#475569", LOW: "#10b981", NORMAL: "#10b981", ELEVATED: "#f59e0b", VIOLATION: "#ef4444",
  };
  return (
    <div className="border border-[#1e3a5f] rounded p-3 bg-[#070d1a]">
      <div className="text-[9px] tracking-[0.12em] text-[#94a3b8] font-bold mb-2">EMCON READINGS ({readings.length})</div>
      <div className="space-y-1">
        {readings.map((r) => (
          <div key={r.id} className="flex items-center gap-2 text-[9px] py-1 border-b border-[#1e3a5f30]">
            <span className="w-2 h-2 rounded-full" style={{ background: statusColors[r.status] || "#475569" }} />
            <span className="w-36 text-[#e2e8f0]">{r.emitter}</span>
            <span className="w-16 font-mono" style={{ color: statusColors[r.status] }}>{r.reading_dbm} dBm</span>
            <span className="w-20 text-[#475569]">threshold: {r.threshold_dbm}</span>
            <span className="font-bold" style={{ color: statusColors[r.status] }}>{r.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OPSECTable({ violations }: { violations: OPSECViolation[] }) {
  const sevColors: Record<string, string> = { CRITICAL: "#ef4444", HIGH: "#f59e0b", MEDIUM: "#3b82f6", LOW: "#94a3b8" };
  return (
    <div className="border border-[#1e3a5f] rounded p-3 bg-[#070d1a]">
      <div className="text-[9px] tracking-[0.12em] text-[#94a3b8] font-bold mb-2">OPSEC VIOLATIONS ({violations.length})</div>
      <div className="space-y-1.5">
        {violations.map((v) => (
          <div key={v.id} className="p-2 border rounded" style={{ borderColor: `${sevColors[v.severity]}30` }}>
            <div className="flex items-center gap-2 text-[9px]">
              <span className="px-1 py-0.5 rounded text-[7px] font-bold" style={{ color: sevColors[v.severity], border: `1px solid ${sevColors[v.severity]}50` }}>{v.severity}</span>
              <span className="text-[#e2e8f0] font-bold">[{v.category.replace("_", " ")}]</span>
              <span className="text-[#e2e8f0]">{v.description}</span>
              {v.resolved && <span className="text-[#10b981] text-[8px] font-bold ml-auto">RESOLVED</span>}
              {!v.resolved && <span className="text-[#ef4444] text-[8px] font-bold ml-auto">OPEN</span>}
            </div>
            <div className="text-[8px] text-[#475569] mt-1">Unit: {v.unit} | Remediation: {v.remediation}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SATVULTable({ windows }: { windows: SATVULWindow[] }) {
  const riskColors: Record<string, string> = { HIGH: "#ef4444", MEDIUM: "#f59e0b", LOW: "#10b981" };
  const mitColors: Record<string, string> = { MITIGATED: "#10b981", PENDING: "#f59e0b", UNMITIGATED: "#ef4444" };
  return (
    <div className="border border-[#1e3a5f] rounded p-3 bg-[#070d1a]">
      <div className="text-[9px] tracking-[0.12em] text-[#94a3b8] font-bold mb-2">SATELLITE VULNERABILITY WINDOWS ({windows.length})</div>
      <div className="space-y-1">
        {windows.map((w) => (
          <div key={w.id} className="flex items-center gap-2 text-[9px] py-1.5 border-b border-[#1e3a5f30]">
            <span className="px-1 py-0.5 rounded text-[7px] font-bold" style={{ color: riskColors[w.riskLevel], border: `1px solid ${riskColors[w.riskLevel]}50` }}>{w.riskLevel}</span>
            <span className="w-44 text-[#e2e8f0]">{w.satellite}</span>
            <span className="w-10 text-[#475569]">{w.sensorType}</span>
            <span className="w-10 text-[#475569]">{w.elevationDeg}°</span>
            <span className="text-[#94a3b8] font-mono">{new Date(w.passStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            <span className="text-[#475569]">→</span>
            <span className="text-[#94a3b8] font-mono">{new Date(w.passEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            <span className="ml-auto font-bold text-[8px]" style={{ color: mitColors[w.mitigationStatus] }}>{w.mitigationStatus}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SignatureMgmtDashboard() {
  const { activeGCC, setSignatureRisk, signatureRisk } = useIEStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showContract, setShowContract] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/signature-management?gcc=${activeGCC}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data: SignatureRiskComposite) => { setSignatureRisk(data); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [activeGCC, setSignatureRisk]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-[#00d4ff] text-sm font-bold tracking-widest animate-pulse">LOADING SIGNATURE DATA...</div>
      </div>
    );
  }

  if (error || !signatureRisk) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-[#ef4444] text-sm">Error: {error || "No data"}</div>
      </div>
    );
  }

  const { composite, status, emconScore, opsecScore, satvulScore, emconReadings, opsecViolations, satvulWindows } = signatureRisk;
  const statusColors = { GREEN: "#10b981", AMBER: "#f59e0b", RED: "#ef4444" };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-[#00d4ff] text-lg font-black tracking-widest">SIGNATURE MANAGEMENT</span>
            <span className="px-2 py-0.5 rounded text-[8px] font-bold tracking-wider" style={{ border: `1px solid ${statusColors[status]}60`, color: statusColors[status], background: `${statusColors[status]}10` }}>
              RISK: {status}
            </span>
            <span className="px-2 py-0.5 rounded text-[8px] font-bold tracking-wider border border-[#f59e0b40] text-[#f59e0b] bg-[#f59e0b08]">
              TRL 4 PROTOTYPE
            </span>
          </div>
          <div className="text-[10px] text-[#475569] mt-1">EMCON / OPSEC / SATVUL — JP 3-13.3, MCRP 3-32D.1 | {activeGCC} AOR</div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black" style={{ color: statusColors[status] }}>{composite}</div>
          <div className="text-[8px] text-[#475569]">composite risk</div>
        </div>
      </div>

      {/* Sub-scores */}
      <div className="grid grid-cols-3 gap-3">
        <SubScore label="EMCON" score={emconScore} weight="0.35" />
        <SubScore label="OPSEC" score={opsecScore} weight="0.35" />
        <SubScore label="SATVUL" score={satvulScore} weight="0.30" />
      </div>

      {/* Metric contract toggle */}
      <button onClick={() => setShowContract(!showContract)} className="text-[9px] text-[#00d4ff] hover:underline">
        {showContract ? "▼ Hide" : "▶ Show"} Metric Contract (SM-COMPOSITE)
      </button>
      {showContract && (
        <div className="border border-[#1e3a5f] rounded p-3 bg-[#070d1a]">
          <MetricContractPanel metricId="SM-COMPOSITE" />
        </div>
      )}

      {/* Detail tables */}
      <EMCONTable readings={emconReadings} />
      <OPSECTable violations={opsecViolations} />
      <SATVULTable windows={satvulWindows} />

      {/* Formula */}
      <div className="border border-[#1e3a5f] rounded p-3 bg-[#070d1a]">
        <div className="text-[9px] tracking-[0.12em] text-[#94a3b8] font-bold mb-1">COMPOSITE FORMULA</div>
        <div className="text-[9px] text-[#e2e8f0] font-mono">composite = (EMCON × 0.35) + (OPSEC × 0.35) + (SATVUL × 0.30)</div>
        <div className="text-[8px] text-[#475569] mt-1">Lower scores indicate better signature discipline. All subcomponents scored 0-100.</div>
      </div>
    </div>
  );
}
