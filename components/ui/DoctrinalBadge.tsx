"use client";

interface DoctrinalBadgeProps {
  /** Doctrinal workflow name (e.g. "Running Estimate") */
  workflow: string;
  /** JP/FM/MCDP reference (e.g. "JP 3-13 Ch. IV") */
  reference: string;
  /** Optional second reference */
  reference2?: string;
}

/**
 * DoctrinalBadge — Inline badge linking a module section to its doctrinal basis.
 * Renders as: [Running Estimate | JP 3-13 Ch. IV]
 * Used across all modules to establish doctrinal alignment.
 */
export function DoctrinalBadge({ workflow, reference, reference2 }: DoctrinalBadgeProps) {
  return (
    <span className="doctrinal-badge">
      <span className="text-[#94a3b8]">{workflow}</span>
      <span className="text-[#334155] mx-1">|</span>
      <span className="text-[#00d4ff]">{reference}</span>
      {reference2 && (
        <>
          <span className="text-[#334155] mx-1">|</span>
          <span className="text-[#00d4ff]">{reference2}</span>
        </>
      )}
    </span>
  );
}
