"use client";

interface ScoringRubricPanelProps {
  /** If true, show the compact version (no keyword lists) */
  compact?: boolean;
}

/**
 * ScoringRubricPanel — Always-visible feed scoring methodology panel.
 *
 * Surfaces the explicit scoring logic from app/api/feeds/route.ts:
 *   GEO/AOR Match    0-30  (10 pts per GCC keyword, capped)
 *   IO Relevance     0-40  (8 pts per IO keyword, capped)
 *   Threat Indicators 0-30 (10 pts per threat category, capped)
 *   TOTAL            0-100
 *
 * Also shows confidence determination and cross-source corroboration method.
 */
export function ScoringRubricPanel({ compact = false }: ScoringRubricPanelProps) {
  return (
    <div className="tactical-card p-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[9px] tracking-[0.15em] text-[#94a3b8] font-bold">
          FEED SCORING RUBRIC
        </span>
        <span className="text-[8px] text-[#0891b2]">TRANSPARENT BASIS</span>
        <div className="flex-1 h-px bg-[#1e3a5f]" />
      </div>

      {/* Scoring Table */}
      <table className="scoring-rubric-table">
        <thead>
          <tr>
            <th>COMPONENT</th>
            <th>RANGE</th>
            <th>METHOD</th>
            <th>CAP</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="text-[#00d4ff] font-semibold">GEO / AOR MATCH</td>
            <td>0 &ndash; 30</td>
            <td>GCC-specific keyword list match (10 pts each)</td>
            <td className="text-[#f59e0b]">30</td>
          </tr>
          <tr>
            <td className="text-[#00d4ff] font-semibold">IO RELEVANCE</td>
            <td>0 &ndash; 40</td>
            <td>24 IO keyword match (8 pts each)</td>
            <td className="text-[#f59e0b]">40</td>
          </tr>
          <tr>
            <td className="text-[#00d4ff] font-semibold">THREAT INDICATORS</td>
            <td>0 &ndash; 30</td>
            <td>5 threat categories with sub-keywords (10 pts each)</td>
            <td className="text-[#f59e0b]">30</td>
          </tr>
          <tr className="border-t border-[#0891b2]">
            <td className="text-white font-bold">TOTAL</td>
            <td className="text-white font-bold">0 &ndash; 100</td>
            <td colSpan={2} className="text-[#94a3b8]">
              Hard-capped sum of all components
            </td>
          </tr>
        </tbody>
      </table>

      {/* Confidence & Corroboration */}
      <div className="mt-2 grid grid-cols-2 gap-3">
        <div>
          <div className="text-[8px] tracking-[0.12em] text-[#94a3b8] font-bold mb-1">
            CONFIDENCE DETERMINATION
          </div>
          <div className="text-[9px] text-[#e2e8f0] space-y-0.5">
            <div>
              <span className="text-[#10b981] font-bold">HIGH</span>
              <span className="text-[#94a3b8]"> &mdash; </span>
              &ge;3 independent signal types
            </div>
            <div>
              <span className="text-[#f59e0b] font-bold">MEDIUM</span>
              <span className="text-[#94a3b8]"> &mdash; </span>
              2 signal types
            </div>
            <div>
              <span className="text-[#ef4444] font-bold">LOW</span>
              <span className="text-[#94a3b8]"> &mdash; </span>
              1 signal type or keyword-only
            </div>
          </div>
        </div>
        <div>
          <div className="text-[8px] tracking-[0.12em] text-[#94a3b8] font-bold mb-1">
            CROSS-SOURCE CORROBORATION
          </div>
          <div className="text-[9px] text-[#e2e8f0] space-y-0.5">
            <div>
              <span className="text-[#10b981] font-bold">CORROBORATED</span>
              <span className="text-[#94a3b8]"> &mdash; </span>
              &ge;2 sources with matching title fingerprint
            </div>
            <div>
              <span className="text-[#f59e0b] font-bold">UNVERIFIED</span>
              <span className="text-[#94a3b8]"> &mdash; </span>
              Single source only
            </div>
            <div>
              <span className="text-[#ef4444] font-bold">REFUTED</span>
              <span className="text-[#94a3b8]"> &mdash; </span>
              Contradicted by verified sources
            </div>
          </div>
        </div>
      </div>

      {/* Threat Categories (if not compact) */}
      {!compact && (
        <div className="mt-2">
          <div className="text-[8px] tracking-[0.12em] text-[#94a3b8] font-bold mb-1">
            THREAT INDICATOR CATEGORIES
          </div>
          <div className="flex flex-wrap gap-1">
            {["Cyber Operation", "Disinformation", "Influence Op", "Kinetic", "Escalation"].map(
              (cat) => (
                <span
                  key={cat}
                  className="px-2 py-0.5 text-[8px] border border-[#1e3a5f] rounded text-[#e2e8f0] bg-[#0f1829]"
                >
                  {cat}
                </span>
              ),
            )}
          </div>
        </div>
      )}

      {/* Limitation Disclaimer */}
      <div className="mt-2 px-2 py-1.5 border border-[#f59e0b33] rounded bg-[#f59e0b08] text-[8px] text-[#f59e0b]">
        <span className="font-bold">LIMITATION:</span> Keyword-based scoring only.
        ~15% false-positive rate. No NLP/NER entity resolution. Novel adversary
        tactics not in keyword list will be missed. Analyst review required before
        any operational use. Scores do not assess source credibility or publication bias.
      </div>
    </div>
  );
}
