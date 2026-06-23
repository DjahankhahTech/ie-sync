"use client";

import { useIEStore } from "@/store/ie-store";
import { GCC_CONFIGS } from "@/lib/gcc-config";
import { getDefinitionsForGCC } from "@/lib/metric-contracts";
import { ScoringRubricPanel } from "@/components/ui/ScoringRubricPanel";
import { MetricContractPanel } from "@/components/ui/MetricContractPanel";
import { useLiveFeeds } from "@/hooks/useLiveFeeds";

// ── GCC prefix map for metric lookups ────────────────────────────────────────
const GCC_PREFIX: Record<string, string> = {
  INDOPACOM: "IP",
  CENTCOM: "CC",
  EUCOM: "EU",
  AFRICOM: "AF",
  SOUTHCOM: "SC",
  NORTHCOM: "NC",
  SPACECOM: "SP",
  CYBERCOM: "CY",
};

const WORKFLOWS = [
  {
    label: "Running Estimate",
    module: "running-estimate",
    ref: "JP 3-13 Ch. IV",
    desc: "Continuously updated IO assessment with version history, MOE/MOP trend analysis, and shift handover.",
    status: "LIVE",
  },
  {
    label: "COA Development",
    module: "coa",
    ref: "JP 3-13 Ch. III",
    desc: "Course of Action analysis with radar comparison, success probability, and execution sequencing.",
    status: "LIVE",
  },
  {
    label: "Annex Generation",
    module: "annex",
    ref: "MCDP 5",
    desc: "Automated Annex I (Information) and ITCO generation with role-based review lanes.",
    status: "LIVE",
  },
  {
    label: "GCC Segmentation",
    module: "cop",
    ref: "JP 3-0",
    desc: "Theater-specific data isolation across 6 Geographic Combatant Commands with independent feeds.",
    status: "LIVE",
  },
];

export function DoctrinalOverview() {
  const {
    activeGCC, setActiveModule, liveFeeds, moeMetrics, runningEstimate, alerts,
  } = useIEStore();
  useLiveFeeds();
  const gcc = GCC_CONFIGS[activeGCC];
  const prefix = GCC_PREFIX[activeGCC] ?? "IP";
  const definitions = getDefinitionsForGCC(prefix);
  const sampleMetricId = definitions[0]?.metric_id ?? `MOE-${prefix}-1`;

  const ioCount = liveFeeds.filter((f) => f.ioRelevant).length;
  const unackedAlerts = alerts.filter((a) => !a.acknowledged).length;
  const redMoes = moeMetrics.filter((m) => m.status === "RED").length;
  const amberMoes = moeMetrics.filter((m) => m.status === "AMBER").length;
  const greenMoes = moeMetrics.filter((m) => m.status === "GREEN").length;

  const ieConditionColor = runningEstimate.ieCondition === "HOSTILE"
    ? "#ef4444" : runningEstimate.ieCondition === "UNCERTAIN"
    ? "#f59e0b" : "#10b981";

  return (
    <div className="p-4 h-full overflow-y-auto space-y-5">

      {/* ── Section 1: System Identity ───────────────────────────────── */}
      <div className="tactical-card p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[#00d4ff] text-xl font-black tracking-[0.2em]">
              IE-SYNC
            </div>
            <div className="text-[#e2e8f0] text-sm font-bold tracking-wider mt-1">
              Information Environment Synchronization Tool
            </div>
            <div className="text-[#94a3b8] text-xs mt-1 max-w-2xl leading-relaxed">
              A security-aware TRL 4 concept demonstrator designed for Information Environment
              decision support experimentation. IE-SYNC demonstrates transparent OSINT scoring,
              narrative tracking, and doctrinal IO workflow integration for experimentation and
              evaluation within Marine Corps and joint innovation environments.
            </div>
          </div>
          <div className="text-right flex-shrink-0 space-y-2">
            <span className="trl-badge">TRL 4 CONCEPT DEMONSTRATOR</span>
            <div className="text-[#94a3b8] text-[10px] font-mono">1st MIG {"//"} III MEF</div>
            <div className="text-[#f59e0b] text-[9px] font-bold tracking-[0.1em]">
              FOR EXPERIMENTATION AND EVALUATION ONLY
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-[#1e3a5f] text-[9px] text-[#94a3b8] leading-relaxed">
          IE-SYNC seeks integration partnerships to mature toward TRL 6-7 under controlled
          development funding. It maps to four doctrinal IO workflows per JP 3-13 and FM 3-13,
          providing transparent scoring logic, evidence-based metrics, and cross-source
          corroboration — not a generic dashboard.
        </div>
      </div>

      {/* ── Section 2: Doctrinal Workflow Map ────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] tracking-[0.15em] text-[#94a3b8] font-bold">
            DOCTRINAL WORKFLOW MAPPING
          </span>
          <div className="flex-1 h-px bg-[#1e3a5f]" />
          <span className="text-[8px] text-[#475569]">Per JP 3-13 / FM 3-13</span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {WORKFLOWS.map((wf, i) => (
            <button
              key={wf.label}
              onClick={() => setActiveModule(wf.module)}
              className="workflow-card text-left"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded border border-[#0891b2] flex items-center justify-center text-[10px] text-[#00d4ff] font-bold">
                  {i + 1}
                </span>
                <span className="text-xs text-[#00d4ff] font-bold tracking-wider">
                  {wf.label}
                </span>
              </div>
              <div className="text-[9px] text-[#0891b2] font-mono mb-1">{wf.ref}</div>
              <div className="text-[9px] text-[#94a3b8] leading-relaxed">{wf.desc}</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="flex items-center gap-1 text-[8px]">
                  <span className="status-dot active" />
                  <span className="text-[#10b981] font-bold">{wf.status}</span>
                </span>
                <span className="text-[8px] text-[#0891b2]">GO TO &rarr;</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Section 3: Key Capabilities Hero ─────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] tracking-[0.15em] text-[#94a3b8] font-bold">
            KEY DIFFERENTIATING CAPABILITIES
          </span>
          <div className="flex-1 h-px bg-[#1e3a5f]" />
          <span className="text-[8px] text-[#475569]">Not a generic dashboard — doctrinal alignment</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Capability 1: Explicit Scoring Logic */}
          <div className="tactical-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full border border-[#00d4ff] flex items-center justify-center text-[10px] text-[#00d4ff] font-bold">1</span>
              <span className="text-xs text-[#00d4ff] font-bold tracking-wider">EXPLICIT SCORING LOGIC</span>
            </div>
            <div className="text-[9px] text-[#94a3b8] mb-2 leading-relaxed">
              Every feed item is scored using a transparent, reproducible rubric.
              No black-box algorithms. The scoring formula, keyword lists, and
              limitations are visible to every analyst.
            </div>
            <ScoringRubricPanel compact />
          </div>

          {/* Capability 2: Evidence Basis */}
          <div className="tactical-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full border border-[#00d4ff] flex items-center justify-center text-[10px] text-[#00d4ff] font-bold">2</span>
              <span className="text-xs text-[#00d4ff] font-bold tracking-wider">EVIDENCE BASIS</span>
            </div>
            <div className="text-[9px] text-[#94a3b8] mb-2 leading-relaxed">
              Every metric is backed by a MetricDefinition contract specifying data inputs,
              source classification, collection freshness, and known failure modes.
              No &ldquo;magic numbers&rdquo; &mdash; if we cannot explain it, we do not show it.
            </div>
            <div className="space-y-1.5 text-[9px]">
              <div className="flex items-center gap-2">
                <span className="text-[#00d4ff] font-bold">{definitions.length}</span>
                <span className="text-[#94a3b8]">MetricDefinitions for {activeGCC}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                <SourceBadge label="PUBLIC OSINT" color="#10b981" />
                <SourceBadge label="INTERNAL SYSTEM" color="#f59e0b" />
                <SourceBadge label="CLASSIFIED SYSTEM" color="#ef4444" />
                <SourceBadge label="REFERENCE DB" color="#3b82f6" />
              </div>
              <div className="text-[8px] text-[#475569]">
                Each input carries: source name, organization, freshness SLA, reference URL (public only), and access classification.
              </div>
            </div>
          </div>

          {/* Capability 3: Cross-Source Corroboration */}
          <div className="tactical-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full border border-[#00d4ff] flex items-center justify-center text-[10px] text-[#00d4ff] font-bold">3</span>
              <span className="text-xs text-[#00d4ff] font-bold tracking-wider">CROSS-SOURCE CORROBORATION</span>
            </div>
            <div className="text-[9px] text-[#94a3b8] mb-2 leading-relaxed">
              Feed items are automatically checked for corroboration across multiple
              independent sources using title fingerprint matching.
            </div>
            <div className="space-y-1.5">
              <div className="grid grid-cols-3 gap-2 text-[9px]">
                <div className="p-1.5 border border-[#10b981] bg-[#10b98108] rounded text-center">
                  <div className="text-[#10b981] font-bold">CORROBORATED</div>
                  <div className="text-[#94a3b8] text-[8px]">&ge;2 independent sources</div>
                </div>
                <div className="p-1.5 border border-[#f59e0b] bg-[#f59e0b08] rounded text-center">
                  <div className="text-[#f59e0b] font-bold">UNVERIFIED</div>
                  <div className="text-[#94a3b8] text-[8px]">Single source only</div>
                </div>
                <div className="p-1.5 border border-[#ef4444] bg-[#ef444408] rounded text-center">
                  <div className="text-[#ef4444] font-bold">REFUTED</div>
                  <div className="text-[#94a3b8] text-[8px]">Contradicted by verified</div>
                </div>
              </div>
              <div className="text-[8px] text-[#475569]">
                Confidence: &ge;3 signal types = HIGH | 2 = MEDIUM | 1 signal type = LOW
              </div>
            </div>
          </div>

          {/* Capability 4: Metric Contract Definitions */}
          <div className="tactical-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full border border-[#00d4ff] flex items-center justify-center text-[10px] text-[#00d4ff] font-bold">4</span>
              <span className="text-xs text-[#00d4ff] font-bold tracking-wider">METRIC CONTRACT DEFINITIONS</span>
            </div>
            <div className="text-[9px] text-[#94a3b8] mb-2 leading-relaxed">
              Every MOE is governed by a formal MetricDefinition: formula, inputs,
              cadence, thresholds, doctrinal basis, and documented failure modes.
              Sample contract for {activeGCC}:
            </div>
            <MetricContractPanel metricId={sampleMetricId} compact />
          </div>
        </div>
      </div>

      {/* ── Section 4: Active GCC Status ─────────────────────────────── */}
      <div className="tactical-card p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[9px] tracking-[0.15em] text-[#94a3b8] font-bold">
            ACTIVE GCC STATUS
          </span>
          <div className="flex-1 h-px bg-[#1e3a5f]" />
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xl">{gcc.flag}</span>
            <div>
              <div className="text-xs font-black tracking-wider" style={{ color: gcc.color }}>{gcc.abbr}</div>
              <div className="text-[#475569] text-[9px] font-mono">{gcc.aor}</div>
            </div>
          </div>

          <div className="h-6 w-px bg-[#1e3a5f]" />

          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-[#94a3b8]">IE:</span>
            <span className="text-xs font-bold" style={{ color: ieConditionColor }}>
              {runningEstimate.ieCondition}
            </span>
          </div>

          <div className="h-6 w-px bg-[#1e3a5f]" />

          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-[#94a3b8]">PRIORITY:</span>
            <span className="text-xs font-bold text-[#00d4ff]">{runningEstimate.priority}</span>
          </div>

          <div className="h-6 w-px bg-[#1e3a5f]" />

          <div className="text-[9px]">
            <span className="text-[#94a3b8]">FEEDS:</span>
            <span className="text-white font-bold ml-1">{liveFeeds.length}</span>
            <span className="text-[#94a3b8]"> total,</span>
            <span className="text-[#ef4444] font-bold ml-1">{ioCount}</span>
            <span className="text-[#94a3b8]"> IO-relevant</span>
          </div>

          <div className="h-6 w-px bg-[#1e3a5f]" />

          <div className="text-[9px]">
            <span className="text-[#94a3b8]">MOEs:</span>
            <span className="text-[#ef4444] font-bold ml-1">{redMoes} RED</span>
            <span className="text-[#f59e0b] font-bold ml-1">{amberMoes} AMBER</span>
            <span className="text-[#10b981] font-bold ml-1">{greenMoes} GREEN</span>
          </div>

          <div className="h-6 w-px bg-[#1e3a5f]" />

          <div className="text-[9px]">
            <span className="text-[#94a3b8]">ALERTS:</span>
            <span className={unackedAlerts > 0 ? "text-[#ef4444] font-bold ml-1" : "text-[#94a3b8] ml-1"}>
              {unackedAlerts} unacknowledged
            </span>
          </div>
        </div>
      </div>

      {/* ── Section 5: Integration Partnership Context ────────────────── */}
      <div className="tactical-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[9px] tracking-[0.15em] text-[#94a3b8] font-bold">
            TRL MATURATION PATHWAY
          </span>
          <div className="flex-1 h-px bg-[#1e3a5f]" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 border border-[#f59e0b] bg-[#f59e0b08] rounded">
            <div className="text-[#f59e0b] text-xs font-bold tracking-wider mb-1">
              TRL 4 &mdash; CURRENT
            </div>
            <div className="text-[9px] text-[#94a3b8] leading-relaxed">
              Component validation in lab environment. Transparent OSINT scoring,
              narrative tracking, doctrinal workflow integration demonstrated.
              Security-hardened (NIST 800-171 controls active).
            </div>
          </div>
          <div className="p-3 border border-[#0891b2] bg-[#0891b208] rounded">
            <div className="text-[#0891b2] text-xs font-bold tracking-wider mb-1">
              TRL 6 &mdash; TARGET
            </div>
            <div className="text-[9px] text-[#94a3b8] leading-relaxed">
              System/subsystem model demonstration in relevant environment.
              Integration with live IC/DoD feeds. NLP/NER scoring upgrade.
              CAC/PIV authentication. Classified system interfaces.
            </div>
          </div>
          <div className="p-3 border border-[#334155] bg-[#33415508] rounded">
            <div className="text-[#94a3b8] text-xs font-bold tracking-wider mb-1">
              TRL 7 &mdash; FUTURE
            </div>
            <div className="text-[9px] text-[#94a3b8] leading-relaxed">
              System prototype demonstration in operational environment.
              Full SIPR integration. Real-time analyst collaboration.
              Production hardening for III MEF deployment.
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-[#1e3a5f]">
          <div className="text-[9px] text-[#94a3b8] leading-relaxed">
            <span className="text-[#00d4ff] font-bold">TARGET ENVIRONMENTS:</span> Marine Corps
            Innovation Command (MCIC), Joint IO Warfare Center (JIOWC), III MEF G7,
            1st MIG S3, joint innovation programs under controlled development funding.
          </div>
        </div>
      </div>

    </div>
  );
}

// ── Helper Components ──────────────────────────────────────────────────────

function SourceBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="px-1.5 py-0.5 rounded text-[7px] font-bold tracking-[0.08em]"
      style={{ border: `1px solid ${color}40`, color, background: `${color}10` }}
    >
      {label}
    </span>
  );
}
