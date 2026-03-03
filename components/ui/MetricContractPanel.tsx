"use client";

import { getMetricDefinition, type MetricDefinition } from "@/lib/metric-contracts";

interface MetricContractPanelProps {
  /** Metric ID (e.g. "MOE-IP-1") — looks up the full MetricDefinition */
  metricId: string;
  /** If true, show a collapsed summary instead of full contract */
  compact?: boolean;
}

const SOURCE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  public_osint: { label: "PUBLIC", color: "#10b981" },
  internal_system: { label: "INTERNAL", color: "#f59e0b" },
  classified_system: { label: "CLASSIFIED", color: "#ef4444" },
  reference_db: { label: "REFERENCE", color: "#3b82f6" },
};

/** Infer source classification from the source name string */
function inferSourceType(source: string): string {
  const s = source.toLowerCase();
  if (s.includes("classified") || s.includes("sipr") || s.includes("jwics")) return "classified_system";
  if (s.includes("internal") || s.includes("system") || s.includes("platform")) return "internal_system";
  if (s.includes("doctrine") || s.includes("reference") || s.includes("jp ") || s.includes("fm ")) return "reference_db";
  return "public_osint";
}

function SourceBadge({ source }: { source?: string }) {
  const sourceType = inferSourceType(source ?? "");
  const info = SOURCE_TYPE_LABELS[sourceType] ?? SOURCE_TYPE_LABELS.public_osint;
  return (
    <span
      className="px-1.5 py-0.5 rounded text-[7px] font-bold tracking-[0.1em]"
      style={{ border: `1px solid ${info.color}40`, color: info.color, background: `${info.color}10` }}
    >
      {info.label}
    </span>
  );
}

function ThresholdBar({ def }: { def: MetricDefinition }) {
  return (
    <div className="flex items-center gap-2 text-[9px]">
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-sm bg-[#10b981]" />
        <span className="text-[#10b981]">GREEN:</span>
        <span className="text-[#e2e8f0]">{def.thresholds.green}</span>
      </span>
      <span className="text-[#334155]">|</span>
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-sm bg-[#f59e0b]" />
        <span className="text-[#f59e0b]">AMBER:</span>
        <span className="text-[#e2e8f0]">{def.thresholds.amber}</span>
      </span>
      <span className="text-[#334155]">|</span>
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-sm bg-[#ef4444]" />
        <span className="text-[#ef4444]">RED:</span>
        <span className="text-[#e2e8f0]">{def.thresholds.red}</span>
      </span>
    </div>
  );
}

/**
 * MetricContractPanel — Renders a full MetricDefinition from lib/metric-contracts.ts.
 *
 * Shows: definition, formula, units, window, cadence, direction,
 * doctrinal basis, thresholds, data inputs with source classification,
 * confidence method, and known failure modes.
 */
export function MetricContractPanel({ metricId, compact = false }: MetricContractPanelProps) {
  const def = getMetricDefinition(metricId);

  if (!def) {
    return (
      <div className="text-[9px] text-[#94a3b8] italic p-2">
        Metric contract not found: {metricId}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="relative metric-contract-panel">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[9px] tracking-[0.12em] text-[#00d4ff] font-bold">
            {def.metric_id}
          </span>
          <span className="text-[9px] text-[#e2e8f0]">{def.name}</span>
        </div>
        <div className="text-[8px] text-[#94a3b8]">{def.formula}</div>
        <ThresholdBar def={def} />
      </div>
    );
  }

  return (
    <div className="relative metric-contract-panel space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] tracking-[0.15em] text-[#94a3b8] font-bold">
          METRIC CONTRACT
        </span>
        <span className="text-[10px] text-[#00d4ff] font-bold">{def.metric_id}</span>
        <div className="flex-1 h-px bg-[#1e3a5f]" />
        <span className="text-[8px] text-[#94a3b8]">v{def.metric_version}</span>
      </div>

      {/* Name & Definition */}
      <div>
        <div className="text-[11px] text-white font-bold mb-0.5">{def.name}</div>
        <div className="text-[9px] text-[#94a3b8] leading-relaxed">{def.definition}</div>
      </div>

      {/* Formula & Parameters Grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px]">
        <div>
          <span className="text-[#94a3b8]">FORMULA: </span>
          <span className="text-[#e2e8f0] font-mono">{def.formula}</span>
        </div>
        <div>
          <span className="text-[#94a3b8]">UNITS: </span>
          <span className="text-[#e2e8f0]">{def.units}</span>
        </div>
        <div>
          <span className="text-[#94a3b8]">WINDOW: </span>
          <span className="text-[#e2e8f0]">{def.window}</span>
        </div>
        <div>
          <span className="text-[#94a3b8]">CADENCE: </span>
          <span className="text-[#e2e8f0]">{def.update_cadence}</span>
        </div>
        <div>
          <span className="text-[#94a3b8]">DIRECTION: </span>
          <span className={def.direction === "lower_is_better" ? "text-[#10b981]" : "text-[#3b82f6]"}>
            {def.direction === "lower_is_better" ? "Lower is better" : "Higher is better"}
          </span>
        </div>
        <div>
          <span className="text-[#94a3b8]">DOCTRINE: </span>
          <span className="text-[#00d4ff]">{def.doctrinal_basis}</span>
        </div>
      </div>

      {/* Thresholds */}
      <div>
        <div className="text-[8px] tracking-[0.12em] text-[#94a3b8] font-bold mb-1">
          STATUS THRESHOLDS
        </div>
        <ThresholdBar def={def} />
      </div>

      {/* Data Inputs */}
      <div>
        <div className="text-[8px] tracking-[0.12em] text-[#94a3b8] font-bold mb-1">
          DATA INPUTS ({def.inputs.length})
        </div>
        <div className="space-y-1">
          {def.inputs.map((input, i) => (
            <div key={i} className="flex items-start gap-2 text-[9px]">
              <SourceBadge source={input.source} />
              <div className="flex-1">
                <span className="text-[#e2e8f0]">{input.name}</span>
                <span className="text-[#94a3b8]"> ({input.source})</span>
                <span className="text-[#0891b2] ml-1">[{input.freshness}]</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confidence Method */}
      <div>
        <div className="text-[8px] tracking-[0.12em] text-[#94a3b8] font-bold mb-1">
          CONFIDENCE METHOD
        </div>
        <div className="text-[9px] text-[#e2e8f0]">{def.confidence_method}</div>
      </div>

      {/* Filters */}
      {def.filters && (
        <div>
          <div className="text-[8px] tracking-[0.12em] text-[#94a3b8] font-bold mb-1">
            PRE-FILTERS
          </div>
          <div className="text-[9px] text-[#e2e8f0]">{def.filters}</div>
        </div>
      )}

      {/* Known Failure Modes */}
      <div>
        <div className="text-[8px] tracking-[0.12em] text-[#f59e0b] font-bold mb-1">
          KNOWN FAILURE MODES ({def.known_failure_modes.length})
        </div>
        <ul className="space-y-0.5">
          {def.known_failure_modes.map((mode, i) => (
            <li key={i} className="text-[8px] text-[#f59e0b99] flex items-start gap-1">
              <span className="text-[#f59e0b] mt-0.5 shrink-0">&bull;</span>
              <span>{mode}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 text-[8px] text-[#94a3b8] pt-1 border-t border-[#1e3a5f]">
        <span>OWNER: {def.owner}</span>
        <span>|</span>
        <span>VALIDATED: {def.last_validated_at}</span>
      </div>
    </div>
  );
}
