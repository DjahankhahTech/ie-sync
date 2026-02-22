"use client";

import { useState, useEffect } from "react";
import { useIEStore } from "@/store/ie-store";
import { type COAOption } from "@/lib/mock-data";
import { confidenceColor, threatColor } from "@/lib/utils";
import { GlossaryPanel } from "@/components/ui/GlossaryPanel";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";

// ITCO task template — generated from selected COA sequence
interface ITCOTask {
  step: number;
  capability: string;
  task: string;
  owner: string;
  dueHours: number;   // hours from H-Hour
  authority: string;
  moeSupported: string;
  status: "PENDING" | "IN-PROGRESS" | "COMPLETE";
}

function buildITCOTasks(coa: { id: string; capabilities: string[]; sequence: string[] }): ITCOTask[] {
  const capabilityOwners: Record<string, { owner: string; authority: string; moe: string }> = {
    "MISO": { owner: "IO-designated MISO elements / 1st MIG", authority: "PSYOP Approval Authority (USSOCOM)", moe: "Hostile Narrative Penetration, Population Sentiment" },
    "CYBER": { owner: "CYBERCOM-coordinated element", authority: "Title 10/50 legal review required", moe: "Adversary IO Cell Activity, Counter-Narrative Amplification" },
    "EW": { owner: "Theater EW platform", authority: "EMR via JFC-IMC — deconfliction required", moe: "Adversary IO Cell Activity" },
    "PA": { owner: "Theater PAO / IO PA Section", authority: "III MEF PAO approval required", moe: "Population Sentiment, Hostile Narrative Penetration" },
    "OPSEC": { owner: "Theater OPSEC Cell", authority: "Unit OPSEC Officer", moe: "SIGMAN baseline — all capabilities" },
    "MILDEC": { owner: "Deception planning cell", authority: "JFC coordination required", moe: "Adversary COA assessment" },
  };

  return coa.sequence.map((step, i) => {
    // Match capability from step text or fall back to first capability
    const matchedCap = coa.capabilities.find((cap) => step.toUpperCase().includes(cap.split(" ")[0])) ?? coa.capabilities[i % coa.capabilities.length];
    const owners = capabilityOwners[matchedCap] ?? { owner: "IO Element", authority: "IO Officer review required", moe: "As assigned" };
    return {
      step: i + 1,
      capability: matchedCap,
      task: step,
      owner: owners.owner,
      dueHours: (i + 1) * 2,   // increment by 2h per step — planner should adjust
      authority: owners.authority,
      moeSupported: owners.moe,
      status: "PENDING" as const,
    };
  });
}

export function COAEngine() {
  const { coaOptions, selectedCOA, setSelectedCOA } = useIEStore();
  const [comparing, setComparing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executionStep, setExecutionStep] = useState(-1);
  const [showITCO, setShowITCO] = useState(false);
  const [itcoTasks, setItcoTasks] = useState<ITCOTask[]>([]);

  // Client-only timestamp — avoids SSR/hydration mismatch
  const [nowDTG, setNowDTG] = useState<string | null>(null);
  useEffect(() => { setNowDTG(new Date().toISOString().substring(0, 16)); }, []);

  const selected = coaOptions.find((c) => c.id === selectedCOA) ?? null;
  const bestCOA = coaOptions.length > 0
    ? coaOptions.reduce((best, c) => c.successProbability > best.successProbability ? c : best, coaOptions[0])
    : null;
  const highestMOE = coaOptions.length > 0
    ? coaOptions.reduce((best, c) => c.moePredicted > best.moePredicted ? c : best, coaOptions[0])
    : null;

  const handleExecute = () => {
    if (!selected) return;
    setExecuting(true);
    setExecutionStep(0);
    // Generate ITCO task list
    const tasks = buildITCOTasks(selected);
    setItcoTasks(tasks);
    const interval = setInterval(() => {
      setExecutionStep((prev) => {
        if (prev >= selected.sequence.length - 1) {
          clearInterval(interval);
          setTimeout(() => setShowITCO(true), 800);
          return prev;
        }
        return prev + 1;
      });
    }, 1200);
  };

  return (
    <div className="p-4 overflow-y-auto h-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[#00d4ff] text-sm font-black tracking-widest">COA RECOMMENDATION ENGINE</div>
          <div className="text-[#475569] text-xs font-mono">IO effects sequencing and comparative COA analysis</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setComparing(!comparing)}
            className={`px-3 py-1.5 text-xs border rounded transition-colors ${
              comparing ? "border-[#00d4ff] text-[#00d4ff] bg-[#00d4ff15]" : "border-[#1e3a5f] text-[#94a3b8] hover:border-[#0891b2]"
            }`}
          >
            {comparing ? "HIDE COMPARE" : "COMPARE COAs"}
          </button>
          {selected && (
            <button
              onClick={handleExecute}
              disabled={executing}
              className="px-3 py-1.5 text-xs border border-[#10b981] text-[#10b981] bg-[#10b98115] rounded hover:bg-[#10b98125] disabled:opacity-50 font-bold"
            >
              {executing ? "EXECUTING..." : "EXECUTE SELECTED COA"}
            </button>
          )}
        </div>
      </div>

      {/* Planning analysis banner — transparent basis, not magic numbers */}
      <div className="p-3 border border-[#f59e0b50] bg-[#f59e0b08] rounded flex items-start gap-3">
        <div className="text-[#f59e0b] text-xl">⬡</div>
        <div className="flex-1">
          <div className="text-[#f59e0b] text-[10px] font-bold tracking-widest mb-1">IO PLANNING ANALYSIS — COA COMPARISON SUMMARY</div>
          <div className="text-[#e2e8f0] text-xs mb-2">
            Highest success probability:{" "}
            <span className="text-[#00d4ff] font-bold">{bestCOA?.name ?? "—"}</span>{" "}
            ({bestCOA?.successProbability ?? "—"}%).{" "}
            Highest predicted MOE impact:{" "}
            <span className="text-[#10b981] font-bold">{highestMOE?.name ?? "—"}</span>{" "}
            ({highestMOE?.moePredicted ?? "—"}/100 predicted index).
          </div>
          {/* Scoring model transparency */}
          <div className="p-2 bg-[#0f1829] border border-[#1e3a5f] rounded text-[9px] font-mono text-[#475569] space-y-0.5">
            <div className="text-[#f59e0b] font-bold mb-1">SCORING MODEL BASIS — READ BEFORE USE:</div>
            <div>▸ Success Probability: planner-estimated likelihood based on asset availability, adversary responsiveness, and historical IO effect data. <span className="text-[#ef4444]">Not statistically validated.</span></div>
            <div>▸ Predicted MOE: estimated index improvement based on COA scope and target audience reach potential. <span className="text-[#ef4444]">Assumes nominal adversary response and authority latency.</span></div>
            <div>▸ Sensitivity: scores shift significantly if CYBERCOM authority is delayed (&gt;4h), adversary adapts within first 6h, or COMMANDO SOLO is unavailable.</div>
            <div className="text-[#10b981] mt-1">⚑ HUMAN REVIEW REQUIRED — IO Planner must validate assumptions before briefing commander.</div>
          </div>
        </div>
      </div>

      {/* COA Cards */}
      <div className="grid grid-cols-3 gap-4">
        {coaOptions.map((coa) => (
          <COACard
            key={coa.id}
            coa={coa}
            isSelected={selectedCOA === coa.id}
            isRecommended={coa.id === "COA-C"}
            onSelect={() => setSelectedCOA(coa.id === selectedCOA ? null : coa.id)}
          />
        ))}
      </div>

      {/* Comparison radar */}
      {comparing && (
        <div className="tactical-card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[#00d4ff] text-xs font-bold tracking-widest">COA COMPARISON — DOCUMENTED FACTORS</div>
            <span className="text-[9px] text-[#475569] font-mono border border-[#1e3a5f] px-2 py-0.5 rounded">
              † All scores = planner estimates. Not statistically validated.
            </span>
          </div>
          {/* Only chart axes that have actual data backing — remove fabricated Speed/LowRisk/Resources */}
          <div className="grid grid-cols-2 gap-4">
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={[
                { axis: "Success Prob †", A: coaOptions[0]?.successProbability ?? 0, B: coaOptions[1]?.successProbability ?? 0, C: coaOptions[2]?.successProbability ?? 0 },
                { axis: "MOE Impact †", A: coaOptions[0]?.moePredicted ?? 0, B: coaOptions[1]?.moePredicted ?? 0, C: coaOptions[2]?.moePredicted ?? 0 },
                { axis: "Capabilities", A: (coaOptions[0]?.capabilities.length ?? 0) * 16, B: (coaOptions[1]?.capabilities.length ?? 0) * 16, C: (coaOptions[2]?.capabilities.length ?? 0) * 16 },
              ]}>
                <PolarGrid stroke="#1e3a5f" />
                <PolarAngleAxis dataKey="axis" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <Radar name="COA-A" dataKey="A" stroke="#2288ff" fill="#2288ff" fillOpacity={0.1} />
                <Radar name="COA-B" dataKey="B" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} />
                <Radar name="COA-C" dataKey="C" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
              </RadarChart>
            </ResponsiveContainer>

            <div className="space-y-3">
              {coaOptions.map((coa, i) => {
                const colors = ["#2288ff", "#f59e0b", "#10b981"];
                const color = colors[i] ?? "#00d4ff";
                return (
                  <div key={coa.id} className="p-3 border rounded" style={{ borderColor: `${color}50` }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm" style={{ color }}>{coa.id}</span>
                      <span className="text-[10px] text-[#475569]">Risk: <span style={{ color: threatColor(coa.risk) }}>{coa.risk}</span></span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <MetricCompare label="Success Prob †" value={`${coa.successProbability}%`} color={color} />
                      <MetricCompare label="MOE Predicted †" value={`${coa.moePredicted}/100`} color={color} />
                      <MetricCompare label="Time-to-Effect" value={coa.timeToEffect} color={color} />
                      <MetricCompare label="# Capabilities" value={`${coa.capabilities.length} (${coa.capabilities.join("/")})`} color={color} />
                    </div>
                  </div>
                );
              })}
              <div className="text-[9px] text-[#334155] font-mono mt-1">
                † Planner-assigned estimate based on doctrine and available assets. Validate with IO Officer before use.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected COA detail */}
      {selected && (
        <div className="tactical-card p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[#00d4ff] text-sm font-black tracking-widest">{selected.id}: {selected.name}</div>
              <div className="text-[#94a3b8] text-xs mt-0.5">{selected.objective}</div>
            </div>
            <div className="flex gap-6 text-center">
              <StatBlock label="SUCCESS PROB †" value={`${selected.successProbability}%`} color={confidenceColor(selected.successProbability)} />
              <StatBlock label="PRED. MOE †" value={`${selected.moePredicted}/100`} color={confidenceColor(selected.moePredicted)} />
              <StatBlock label="TIME-TO-EFFECT" value={selected.timeToEffect} color="#00d4ff" />
              <StatBlock label="RISK LEVEL" value={selected.risk} color={threatColor(selected.risk)} />
            </div>
            <div className="text-[#334155] text-[9px] font-mono text-right mt-1">† Planner estimate — not statistically validated. Human review required.</div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 bg-[#070d1a] border border-[#1e3a5f] rounded">
              <div className="text-[#475569] text-[10px] tracking-wider mb-2">TARGET AUDIENCE</div>
              <div className="text-[#e2e8f0] text-xs">{selected.targetAudience}</div>
            </div>
            <div className="p-3 bg-[#070d1a] border border-[#1e3a5f] rounded">
              <div className="text-[#475569] text-[10px] tracking-wider mb-2">ESTIMATED EFFECT</div>
              <div className="text-[#10b981] text-xs font-bold">{selected.estimatedEffect}</div>
            </div>
          </div>

          <div className="mb-4 p-3 bg-[#070d1a] border border-[#1e3a5f] rounded">
            <div className="text-[#475569] text-[10px] tracking-wider mb-2">RESOURCE REQUIREMENTS</div>
            <div className="text-[#e2e8f0] text-xs">{selected.resourceRequirement}</div>
          </div>

          {/* Capabilities badges */}
          <div className="mb-4">
            <div className="text-[#475569] text-[10px] tracking-wider mb-2">IO CAPABILITIES EMPLOYED</div>
            <div className="flex flex-wrap gap-2">
              {selected.capabilities.map((cap) => (
                <span key={cap} className="px-2 py-1 border border-[#0891b2] text-[#00d4ff] rounded text-xs font-bold">
                  {cap}
                </span>
              ))}
            </div>
          </div>

          {/* Execution sequence */}
          <div>
            <div className="text-[#475569] text-[10px] tracking-wider mb-1">EXECUTION SEQUENCE — DOCTRINAL BASIS (MCDP 3-32 / JP 3-13)</div>
            <div className="text-[#334155] text-[9px] font-mono mb-3">Sequence is planner-defined per doctrine. Review with IO Officer and Legal before execution.</div>
            <div className="space-y-2">
              {selected.sequence.map((step, i) => {
                const isActive = executing && i <= executionStep;
                const isCurrent = executing && i === executionStep;
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-3 p-2.5 rounded border transition-all ${
                      isActive
                        ? "border-[#10b981] bg-[#10b98110]"
                        : "border-[#1e3a5f] bg-[#070d1a]"
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                        isActive ? "border-[#10b981] text-[#10b981]" : "border-[#334155] text-[#475569]"
                      } ${isCurrent ? "pulse-alert" : ""}`}
                    >
                      {isActive ? "✓" : i + 1}
                    </div>
                    <div className="text-xs" style={{ color: isActive ? "#e2e8f0" : "#94a3b8" }}>
                      {step}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ITCO Task List — generated on COA execution */}
      {showITCO && itcoTasks.length > 0 && (
        <div className="tactical-card border-l-2 border-l-[#10b981]">
          <div className="px-4 py-3 border-b border-[#1e3a5f] flex items-center justify-between">
            <div>
              <div className="text-[#10b981] text-xs font-bold tracking-widest">GENERATED ITCO TASK LIST — {selected?.id}</div>
              <div className="text-[#475569] text-[9px] font-mono mt-0.5">
                Auto-generated from COA sequence · DTG: {nowDTG ? `${nowDTG}Z` : "—"} · HUMAN REVIEW REQUIRED
              </div>
            </div>
            <button
              onClick={() => setShowITCO(false)}
              className="text-[#475569] text-[10px] border border-[#1e3a5f] px-2 py-0.5 rounded hover:border-[#334155]"
            >
              HIDE ▲
            </button>
          </div>
          <div className="p-3 overflow-x-auto">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="border-b border-[#1e3a5f] text-[#475569] text-[9px] tracking-wider">
                  <th className="text-left px-3 py-2">#</th>
                  <th className="text-left px-3 py-2">CAPABILITY</th>
                  <th className="text-left px-3 py-2">TASK</th>
                  <th className="text-left px-3 py-2">OWNER</th>
                  <th className="text-left px-3 py-2">NLT (H+)</th>
                  <th className="text-left px-3 py-2">AUTHORITY</th>
                  <th className="text-left px-3 py-2">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {itcoTasks.map((task) => (
                  <tr key={task.step} className="border-b border-[#1e3a5f] hover:bg-[#162035]">
                    <td className="px-3 py-2 text-[#475569]">{task.step}</td>
                    <td className="px-3 py-2">
                      <span className="px-1.5 py-0.5 border border-[#0891b2] text-[#00d4ff] rounded text-[9px]">{task.capability}</span>
                    </td>
                    <td className="px-3 py-2 text-[#94a3b8] max-w-[220px]">
                      <div className="truncate" title={task.task}>{task.task}</div>
                    </td>
                    <td className="px-3 py-2 text-[#e2e8f0] max-w-[150px]">
                      <div className="truncate" title={task.owner}>{task.owner}</div>
                    </td>
                    <td className="px-3 py-2 text-[#f59e0b] font-bold">H+{task.dueHours}h*</td>
                    <td className="px-3 py-2 text-[#ef4444] max-w-[120px]">
                      <div className="truncate" title={task.authority}>{task.authority}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-1.5 py-0.5 border border-[#f59e0b50] text-[#f59e0b] rounded text-[9px]">PENDING</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 space-y-1 text-[9px] text-[#334155] font-mono">
              <div>* H+hours are planner estimates. IO Officer must validate and assign actual DTGs before release.</div>
              <div>⚑ HUMAN REVIEW REQUIRED: All tasks require IO Officer sign-off, Legal review for CYBER/EW, PAO approval for PA products.</div>
              <div>▸ MOE supported: see individual task rows. Collect MOE data within 24h of each task execution.</div>
            </div>
          </div>
        </div>
      )}

      {!selected && (
        <div className="flex items-center justify-center h-24 border border-dashed border-[#1e3a5f] rounded text-[#475569] text-sm">
          SELECT A COA ABOVE TO VIEW DETAILED ANALYSIS AND EXECUTION SEQUENCE
        </div>
      )}

      {/* ── IO Glossary / Dictionary ───────────────────────────────── */}
      <GlossaryPanel module="coa" />
    </div>
  );
}

function COACard({
  coa,
  isSelected,
  isRecommended,
  onSelect,
}: {
  coa: COAOption;
  isSelected: boolean;
  isRecommended: boolean;
  onSelect: () => void;
}) {
  const riskColor = threatColor(coa.risk);

  return (
    <button
      onClick={onSelect}
      className={`tactical-card text-left p-4 transition-all w-full ${
        isSelected ? "border border-[#00d4ff] glow-accent" : "hover:border-[#1e3a5f]"
      } ${isRecommended ? "ring-1 ring-[#10b981]" : ""}`}
    >
      {isRecommended && (
        <div className="text-[10px] text-[#10b981] font-bold tracking-widest mb-2">
          ★ AI RECOMMENDED
        </div>
      )}
      <div className="text-[#00d4ff] font-black text-base mb-1">{coa.id}</div>
      <div className="text-[#e2e8f0] text-xs font-bold mb-2">{coa.name}</div>
      <div className="text-[#94a3b8] text-[10px] mb-3 leading-relaxed">{coa.objective}</div>

      {/* Success probability bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[9px] text-[#475569] mb-1">
          <span>SUCCESS PROBABILITY</span>
          <span style={{ color: confidenceColor(coa.successProbability) }}>{coa.successProbability}%</span>
        </div>
        <div className="confidence-bar">
          <div
            className="confidence-fill"
            style={{
              width: `${coa.successProbability}%`,
              background: confidenceColor(coa.successProbability),
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[9px]">
        <div>
          <div className="text-[#475569]">TIME-TO-EFFECT</div>
          <div className="text-[#94a3b8] font-mono">{coa.timeToEffect}</div>
        </div>
        <div>
          <div className="text-[#475569]">RISK</div>
          <div className="font-bold" style={{ color: riskColor }}>{coa.risk}</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {coa.capabilities.slice(0, 4).map((cap) => (
          <span key={cap} className="px-1.5 py-0.5 border border-[#1e3a5f] text-[#475569] rounded text-[9px]">
            {cap}
          </span>
        ))}
        {coa.capabilities.length > 4 && (
          <span className="text-[#475569] text-[9px]">+{coa.capabilities.length - 4}</span>
        )}
      </div>
    </button>
  );
}

function StatBlock({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div className="text-[9px] text-[#475569] tracking-wider">{label}</div>
      <div className="font-black text-sm mt-0.5" style={{ color }}>{value}</div>
    </div>
  );
}

function MetricCompare({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <span className="text-[#475569]">{label}: </span>
      <span style={{ color }} className="font-bold">{value}</span>
    </div>
  );
}
