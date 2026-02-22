"use client";

import { useState, useEffect } from "react";
import { useIEStore } from "@/store/ie-store";
import { threatColor, confidenceColor } from "@/lib/utils";
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
  ReferenceLine,
} from "recharts";

export function SIGMANMonitor() {
  const { signatureItems } = useIEStore();

  // Client-only timestamp — avoids SSR/hydration mismatch
  const [nowDTG, setNowDTG] = useState<string | null>(null);
  useEffect(() => { setNowDTG(new Date().toISOString().substring(0, 16)); }, []);

  const overallScore = Math.round(
    signatureItems.reduce((sum, s) => sum + s.exposureScore, 0) / signatureItems.length
  );

  const critical = signatureItems.filter((s) => s.riskLevel === "CRITICAL").length;
  const high = signatureItems.filter((s) => s.riskLevel === "HIGH").length;

  const chartData = signatureItems.map((s) => ({
    name: s.id,
    score: s.exposureScore,
    desc: s.description,
    risk: s.riskLevel,
  }));

  const byCategory = {
    TECHNICAL: signatureItems.filter((s) => s.category === "TECHNICAL"),
    ADMINISTRATIVE: signatureItems.filter((s) => s.category === "ADMINISTRATIVE"),
    PHYSICAL: signatureItems.filter((s) => s.category === "PHYSICAL"),
  };

  return (
    <div className="p-4 overflow-y-auto h-full space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[#00d4ff] text-sm font-black tracking-widest">SIGNATURE MANAGEMENT MONITOR</div>
          <div className="text-[#475569] text-xs font-mono">
            Technical / Administrative / Physical signature exposure — theater-specific assessment
          </div>
        </div>
        <div className="flex gap-4">
          <SigStatCard label="OVERALL EXPOSURE" value={`${overallScore}%`} color={confidenceColor(100 - overallScore)} />
          <SigStatCard label="CRITICAL SIGS" value={String(critical)} color="#ef4444" />
          <SigStatCard label="HIGH SIGS" value={String(high)} color="#f97316" />
          <SigStatCard label="TOTAL MONITORED" value={String(signatureItems.length)} color="#00d4ff" />
        </div>
      </div>

      {/* Overall exposure bar chart */}
      <div className="tactical-card p-4">
        <div className="text-[#00d4ff] text-xs font-bold tracking-widest mb-1">SIGNATURE EXPOSURE SCORE BY CATEGORY</div>
        <div className="text-[#475569] text-[10px] mb-4 font-mono">
          Threshold: 50% — Signatures exceeding threshold indicate exploitable adversary detection risk
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid stroke="#1e3a5f" strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 10 }} />
            <YAxis domain={[0, 100]} tick={{ fill: "#475569", fontSize: 10 }} />
            <Tooltip
              contentStyle={{ background: "#0f1829", border: "1px solid #1e3a5f", borderRadius: 4, fontSize: 11 }}
              labelStyle={{ color: "#00d4ff" }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, _?: any, props?: any) => [
                `${value ?? ""}% exposure`,
                props?.payload?.desc ?? "",
              ] as [string, string]}
            />
            <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: "THRESHOLD", fill: "#f59e0b", fontSize: 9 }} />
            <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="4 2" label={{ value: "CRITICAL", fill: "#ef4444", fontSize: 9 }} />
            <Bar dataKey="score" radius={[2, 2, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={
                    entry.score >= 80 ? "#ef4444" :
                    entry.score >= 60 ? "#f59e0b" :
                    "#10b981"
                  }
                  opacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Signature cards by category */}
      {(["TECHNICAL", "ADMINISTRATIVE", "PHYSICAL"] as const).map((category) => (
        <div key={category} className="tactical-card">
          <div className="px-4 py-3 border-b border-[#1e3a5f] flex items-center justify-between">
            <div className="text-[#00d4ff] text-xs font-bold tracking-widest">
              {category === "TECHNICAL" ? "⊞" : category === "ADMINISTRATIVE" ? "⊟" : "⊠"} {category} SIGNATURES
            </div>
            <div className="text-[#475569] text-[10px] font-mono">
              {byCategory[category].length} signatures monitored
            </div>
          </div>
          <div className="p-4 space-y-3">
            {byCategory[category].map((sig) => (
              <SigCard key={sig.id} sig={sig} />
            ))}
          </div>
        </div>
      ))}

      {/* OPSEC Checklist */}
      <div className="tactical-card p-4">
        <div className="text-[#00d4ff] text-xs font-bold tracking-widest mb-3">
          OPSEC CORRECTIVE ACTIONS — CRITICAL &amp; HIGH PRIORITY
        </div>
        <div className="space-y-2">
          {signatureItems
            .filter((s) => s.riskLevel === "CRITICAL" || s.riskLevel === "HIGH")
            .map((sig) => (
              <div key={sig.id} className="flex items-start gap-3 p-2.5 border border-[#ef444430] bg-[#ef444408] rounded">
                <span className="text-[#ef4444] flex-shrink-0">▸</span>
                <div>
                  <div className="text-[#ef4444] text-[10px] font-bold">[{sig.riskLevel}] {sig.id}: {sig.description}</div>
                  <div className="text-[#e2e8f0] text-xs mt-0.5">{sig.recommendation}</div>
                </div>
              </div>
            ))}
        </div>
        <div className="mt-3 text-[#475569] text-[10px] font-mono text-right">
          SIGMAN ASSESSMENT // {nowDTG ? `${nowDTG}Z` : "—"} // OPSEC OFFICER REVIEW REQUIRED
        </div>
      </div>

      {/* ── IO Glossary / Dictionary ───────────────────────────────── */}
      <GlossaryPanel module="sigman" />
    </div>
  );
}

function SigCard({ sig }: { sig: ReturnType<typeof useIEStore.getState>["signatureItems"][0] }) {
  const riskColor = threatColor(sig.riskLevel);
  const exposureColor =
    sig.exposureScore >= 80 ? "#ef4444" :
    sig.exposureScore >= 60 ? "#f59e0b" :
    "#10b981";

  return (
    <div className="p-3 border border-[#1e3a5f] bg-[#070d1a] rounded hover:border-[#0891b2] transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[#475569] text-[10px] font-mono">{sig.id}</span>
          <span
            className="px-1.5 py-0.5 rounded text-[9px] font-bold border"
            style={{ color: riskColor, borderColor: riskColor, background: `${riskColor}15` }}
          >
            {sig.riskLevel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#475569]">EXPOSURE:</span>
          <span className="font-black text-sm" style={{ color: exposureColor }}>
            {sig.exposureScore}%
          </span>
        </div>
      </div>

      <div className="text-[#e2e8f0] text-xs font-bold mb-1">{sig.description}</div>

      <div className="grid grid-cols-2 gap-3 mb-2">
        <div>
          <div className="text-[#475569] text-[9px]">CURRENT STATE</div>
          <div className="text-[#f59e0b] text-[10px] font-mono">{sig.currentValue}</div>
        </div>
        <div>
          <div className="text-[#475569] text-[9px]">THRESHOLD</div>
          <div className="text-[#94a3b8] text-[10px] font-mono">{sig.threshold}</div>
        </div>
      </div>

      {/* Exposure bar */}
      <div className="confidence-bar mb-2">
        <div
          className="confidence-fill"
          style={{ width: `${sig.exposureScore}%`, background: exposureColor }}
        />
      </div>

      <div className="flex items-start gap-1.5 text-[10px]">
        <span className="text-[#00d4ff] flex-shrink-0">→</span>
        <span className="text-[#94a3b8]">{sig.recommendation}</span>
      </div>
    </div>
  );
}

function SigStatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center px-4 py-2 border border-[#1e3a5f] rounded bg-[#070d1a]">
      <div className="text-[9px] text-[#475569] tracking-wider">{label}</div>
      <div className="font-black text-lg mt-0.5" style={{ color }}>{value}</div>
    </div>
  );
}
