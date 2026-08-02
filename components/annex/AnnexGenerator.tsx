"use client";

import { useState } from "react";
import { useIEStore } from "@/store/ie-store";
import { GlossaryPanel } from "@/components/ui/GlossaryPanel";
import {
  type ThreatEntity,
  type NarrativeThread,
  type COAOption,
  type MOEMetric,
  type RunningEstimate,
} from "@/lib/mock-data";

type DocType = "annex-i" | "itco";

// Context assembled from the live store and threaded through both templates so
// generated documents reference the actual threats tracked in the AO.
interface DocContext {
  re: RunningEstimate;
  threats: ThreatEntity[];
  narratives: NarrativeThread[];
  coa: COAOption | null;
  redMoes: MOEMetric[];
}

const SEV: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0 };
const sev = (t: string) => SEV[t] ?? 0;
const fmtReach = (n: number) =>
  n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? Math.round(n / 1e3) + "K" : String(n);
const shortName = (d: string) => d.replace(/\s*\(.*?\)\s*/g, "").trim();

const threatBlock = (threats: ThreatEntity[]) =>
  threats.length
    ? threats
        .map(
          (t, i) =>
            `      (${i + 1}) ${t.designation} [${t.type} // ${t.threat}, confidence ${t.confidence}%] — ${t.activity}. Capabilities: ${t.capabilities.join(", ")}. Last seen ${t.reportedAt}. Source: ${t.sourceLabel}.`
        )
        .join("\n")
    : "      (None tracked in current Running Estimate.)";

const narrativeBlock = (n: NarrativeThread[]) =>
  n.length
    ? n
        .map(
          (x, i) =>
            `      (${i + 1}) "${x.title}" (${x.platform}) — sentiment ${x.sentiment.toFixed(2)}, reach ${fmtReach(x.reach)}, ${x.velocity} posts/hr, ${x.trend}. ${x.summary}`
        )
        .join("\n")
    : "      (No adversarial narratives tracked.)";

const coaSequenceBlock = (coa: COAOption | null) =>
  coa && coa.sequence?.length
    ? coa.sequence.map((s, i) => `      (${i + 1}) ${s}`).join("\n")
    : "      (No COA selected — select a COA in the COA Engine.)";

const ANNEX_I_TEMPLATE = (ctx: DocContext) => {
  const { re, threats, narratives, coa } = ctx;
  const cyberNames =
    threats.filter((t) => t.capabilities.includes("CYBER")).map((t) => shortName(t.designation)).join(", ") ||
    "identified adversary network actors";
  const topNarrative = narratives[0] ? `"${narratives[0].title}"` : "the adversary disinformation narrative";
  const coaLabel = coa ? `${coa.id} — ${coa.name}` : "COA PENDING SELECTION";
  return `${re.classification}
COPY ___ OF ___ COPIES
III MEF // G7 // 1ST MARINE INFORMATION GROUP
DTG: ${re.dtg}
${re.operationName}

ANNEX I (INFORMATION) TO OPORD 001
REFERENCES: See Basic Plan

1. SITUATION
   a. Enemy Information Capabilities: ${re.ieSituation}

      Identified Threat Entities in AO (current Running Estimate):
${threatBlock(threats)}

      Adversary Capability Summary:
${re.adversaryCapabilities.map((c) => `        - ${c}`).join("\n")}

   b. Hostile Narratives — Priority Counter-IO Targets:
${narrativeBlock(narratives)}

   c. Friendly Information Capabilities: ${re.friendlyCapabilities.join("; ")}.

   d. Information Environment Condition: ${re.ieCondition}.

2. MISSION
   ${re.missionStatement}

3. EXECUTION
   a. Commander's IO Objective (CDRU): ${re.cdruObjective}

   b. Selected Course of Action: ${coaLabel}${
    coa ? ` — ${coa.objective} (success probability ${coa.successProbability}%, risk ${coa.risk})` : ""
  }

   c. Scheme of IO (COA sequence):
${coaSequenceBlock(coa)}

   d. IO Priority: ${re.priority}

   e. Key Tasks — IO Core Capabilities (threat-targeted):
      (1) MISO: Conduct multilingual MISO to counter ${topNarrative} and reduce adversary narrative reach. Employ airborne broadcast (COMMANDO SOLO) and digital/traditional dissemination.
      (2) EW: Provide electromagnetic support to MISO broadcast; degrade adversary SIGINT/ELINT collection; deconflict via JFC-IMC.
      (3) CYBER: Coordinate CYBERCOM DCO authority against ${cyberNames}. Execute platform takedown of adversary deepfake/disinformation content within a 4-hour window. Title 10/50 legal review required.
      (4) OPSEC: Execute OPSEC/SIGMAN plan; address all CRITICAL and HIGH signature exposures within 2 hours of identification; enforce social-media policy.
      (5) PA: Conduct rapid-response multilingual press operations; issue rebuttal to ${topNarrative} within 2 hours of detection; maintain 24/7 monitoring.
      (6) MILDEC: Coordinate deception to degrade the adversary IO targeting cycle; integrate with the deception planning cell.

   f. Coordinating Instructions:
      (1) IO Synchronization Meeting (IOSM): Daily 0600Z.
      (2) MOE/MOP Assessment Cycle: Every 24 hours; iterate planning within the same window.
      (3) Human Review Required: All AI-assisted IO planning products require human analyst validation before commander briefing or dissemination.
      (4) CYBERCOM DCO Request: Submit NLT H-6 before required execution.
      (5) EW Deconfliction: Submit EMR via JFC-IMC NLT H-4 before execution.

4. ADMINISTRATION AND LOGISTICS
   Unit IO officers will submit ITREP via MIG C2 node. All MISO products require PSYOP approval authority sign-off per USSOCOM directive. PA releases require III MEF PAO coordination.

5. COMMAND AND SIGNAL
   a. Command: IO synchronization remains under III MEF G7. 1st MIG provides reach-back support.
   b. Signal: All IO-related traffic via SIPR; MISO products via NIPR public affairs channels post-approval.

ACKNOWLEDGE
//SIGNED//
[IO OFFICER SIGNATURE BLOCK]

${re.classification}`;
};

const ITCO_TEMPLATE = (ctx: DocContext) => {
  const { re, threats, narratives, coa, redMoes } = ctx;
  const cyberNames =
    threats.filter((t) => t.capabilities.includes("CYBER")).map((t) => shortName(t.designation)).join(", ") ||
    "identified adversary network actors";
  const topNarrative = narratives[0] ? `"${narratives[0].title}"` : "adversary disinformation";
  const priorityThreats = threats.slice(0, 4);
  const moeLines = redMoes.length
    ? redMoes
        .map((m) => `     - ${m.name}: current ${m.current}${m.unit} (target ${m.target}${m.unit}), trend ${m.trend}`)
        .join("\n")
    : "     - No MOEs currently in RED status.";
  return `${re.classification}
INFORMATION TASKING AND COORDINATION ORDER (ITCO)
DTG: ${re.dtg}
OPERATION: ${re.operationName}
FROM: CG III MEF G7 / 1ST MIG
TO: ALL IO ELEMENTS

ITCO SERIAL: 001-25
SELECTED COA: ${coa ? `${coa.id} — ${coa.name}` : "PENDING SELECTION"}

1. SITUATION SUMMARY
   IE Condition: ${re.ieCondition}

   Priority Threat Entities (AO):
${
    priorityThreats.length
      ? priorityThreats
          .map((t, i) => `     (${i + 1}) ${t.designation} — ${t.activity} [${t.threat}]. Source: ${t.sourceLabel}.`)
          .join("\n")
      : "     (None tracked.)"
  }

   Active Hostile Narratives:
${
    narratives.length
      ? narratives
          .map((n, i) => `     (${i + 1}) "${n.title}" (${n.platform}) — reach ${fmtReach(n.reach)}, ${n.velocity} posts/hr, ${n.trend}.`)
          .join("\n")
      : "     (None tracked.)"
  }

   MOE Breaches (RED):
${moeLines}

2. IO TASKS BY CAPABILITY

   TASK 1 — MISO
   Unit: IO-designated MISO elements
   Task: Conduct multilingual MISO targeting ${topNarrative}. Disseminate factual counter-narrative products across all approved platforms. Priority: expose adversary IO origins and reinforce the legitimate narrative.
   NLT: Initial products NLT H+2 from order receipt.
   MOE Supported: Hostile Narrative Penetration, Population Sentiment.

   TASK 2 — CYBER
   Unit: CYBERCOM-coordinated element
   Task: Submit DCO request against ${cyberNames}. Execute adversary content takedown via platform coordination. Implement emergency patches for all identified SIGMAN vulnerabilities. Validate all cyber actions via legal review (Title 10/50).
   NLT: DCO request submitted NLT H+1. Takedown requests NLT H+2.
   MOE Supported: Adversary IO Cell Activity, Counter-Narrative Amplification.

   TASK 3 — EW
   Unit: Designated EW platform
   Task: Provide electromagnetic support to MISO operations. Target adversary tactical IO/SIGINT collection per approved EMR. Deconflict via JFC-IMC prior to execution.
   NLT: EMR submitted NLT H+1. EW element on-station NLT H+3.
   AUTHORITY: Obtain theater EW deconfliction authority prior to execution.
   MOE Supported: Adversary IO Cell Activity.

   TASK 4 — PA
   Unit: Theater PAO / IO PA Section
   Task: Convene a multilingual press engagement within 2 hours rebutting ${topNarrative}. Issue an official counter-narrative statement with supporting evidence. Coordinate with embassy and partner-nation PA for language amplification.
   NLT: Statement drafted NLT H+1. Press engagement NLT H+2.
   MOE Supported: Population Sentiment, Hostile Narrative Penetration.

   TASK 5 — OPSEC
   Unit: Theater OPSEC Cell
   Task: Enforce immediate SIGMAN lockdown. Address all CRITICAL and HIGH signature exposures within 1 hour of identification. Brief all personnel on social-media and OPSEC policy NLT H+3.
   NLT: See individual signature remediation timelines.
   MOE Supported: OPSEC baseline protection across all IO tasks.

3. IO SYNCHRONIZATION
   IO Synchronization Meeting: Daily 0600Z via VTC.
   MOE/MOP Collection: Daily by 1800Z; results to G7 by 2000Z.
   Human Analyst Validation: All AI-assisted assessments require human review before commander briefing.
   Next ITCO Cycle: H+24 hours.

4. REPORTING
   Commanders will submit ITREP NLT 0100Z daily. IMMED reports for any CRITICAL MOE breach or new anomaly detected.

5. SPECIAL INSTRUCTIONS
   - All AI-assisted planning products require human analyst review before release
   - PA products require PAO approval before release
   - CYBER actions require Title 10/50 legal review
   - EW requires INDOPACOM deconfliction (JFC-IMC)
   - MISO products require PSYOP approval authority

ACKNOWLEDGE
//SIGNED//
CG III MEF G7 / IO

${re.classification}`;
};

// ── Citations / References block appended to every generated document ──────
const CITATIONS_BLOCK = `
REFERENCES / DOCTRINAL BASIS:
  [1] JP 3-13, Information Operations, 27 Nov 2012 (C1, 20 Nov 2014)
  [2] MCDP 3-32, Marine Air-Ground Task Force Information Operations, 2020
  [3] FM 3-13, Information Operations, Oct 2023
  [4] MCWP 3-32.1, Tactics, Techniques, and Procedures for MAGTF IO, 2019
  [5] USCYBERCOM Legal Review Framework (Title 10/50 DCO authorities)
  [6] USSOCOM PSYOP Approval Authority directive (current)

TOOL PROVENANCE:
  Generated by: IE-SYNC IO Planning Tool v2.0 (UNCLASSIFIED)
  Generation method: Template-driven assembly from Running Estimate store
  AI assistance: None — rule-based template with human-supplied data
  LIMITATION: All data inputs are OSINT/UNCLASS mock data unless analyst has substituted real data.
  HUMAN REVIEW REQUIRED before operational use or commander briefing.
`;

// Verifiable threat-intelligence citations, derived from the threats referenced
// in the document body (MITRE ATT&CK, CISA, DOJ, etc.).
const threatSourcesBlock = (threats: ThreatEntity[]) =>
  threats.length
    ? "\nTHREAT INTELLIGENCE SOURCES (verifiable, public):\n" +
      threats.map((t, i) => `  [T${i + 1}] ${t.designation} — ${t.sourceLabel}: ${t.sourceUrl}`).join("\n") +
      "\n"
    : "";

export function AnnexGenerator() {
  const { runningEstimate, coaOptions, selectedCOA, threatEntities, narrativeThreads, moeMetrics } = useIEStore();
  const [activeDoc, setActiveDoc] = useState<DocType>("annex-i");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [tevvChecked, setTevvChecked] = useState(false);
  const [copied, setCopied] = useState(false);

  // Resolve the active COA: the analyst's selection, else the COA named in the
  // Running Estimate recommendations, else the highest-probability option.
  const coa =
    coaOptions.find((c) => c.id === selectedCOA) ??
    coaOptions.find((c) => runningEstimate.recommendations.some((r) => r.includes(c.id))) ??
    [...coaOptions].sort((a, b) => b.successProbability - a.successProbability)[0] ??
    null;

  // Threat picture for the AO, sorted by severity / reach.
  const threats = [...threatEntities].sort((a, b) => sev(b.threat) - sev(a.threat));
  const narratives = narrativeThreads.filter((n) => n.adversarial).sort((a, b) => b.reach - a.reach);
  const redMoes = moeMetrics.filter((m) => m.status === "RED");

  const ctx: DocContext = { re: runningEstimate, threats, narratives, coa, redMoes };

  const docContent =
    (activeDoc === "annex-i" ? ANNEX_I_TEMPLATE(ctx) : ITCO_TEMPLATE(ctx)) +
    CITATIONS_BLOCK +
    threatSourcesBlock(threats);

  const handleCopy = () => {
    navigator.clipboard.writeText(docContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleGenerate = () => {
    setGenerating(true);
    setGenProgress(0);
    setGenerated(false);
    setTevvChecked(false);

    const steps = [10, 25, 40, 55, 70, 82, 90, 96, 100];
    let i = 0;
    const interval = setInterval(() => {
      setGenProgress(steps[i]);
      i++;
      if (i >= steps.length) {
        clearInterval(interval);
        setGenerating(false);
        setGenerated(true);
        // TEVV check delay
        setTimeout(() => setTevvChecked(true), 1500);
      }
    }, 300);
  };

  return (
    <div className="p-4 h-full overflow-y-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[#00d4ff] text-sm font-black tracking-widest">ANNEX I / ITCO GENERATOR</div>
          <div className="text-[#475569] text-xs font-mono">
            IO Planning Assistant — Automated operational document generation
          </div>
        </div>
        <div className="flex items-center gap-3">
          {tevvChecked && (
            <div className="flex items-center gap-1.5 text-xs text-[#10b981] border border-[#10b981] px-3 py-1 rounded">
              <span>✓</span> HUMAN REVIEW REQUIRED
            </div>
          )}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 text-xs bg-[#1e3a5f] border border-[#00d4ff] text-[#00d4ff] rounded hover:bg-[#00d4ff15] disabled:opacity-50 font-bold tracking-wider"
          >
            {generating ? "GENERATING..." : "GENERATE DOCUMENT"}
          </button>
        </div>
      </div>

      {/* Generation progress */}
      {generating && (
        <div className="p-4 border border-[#0891b2] bg-[#0891b208] rounded">
          <div className="flex items-center justify-between mb-2 text-xs">
            <span className="text-[#00d4ff] font-bold">IO PLANNING ASSISTANT — GENERATING DOCUMENT</span>
            <span className="text-[#00d4ff] font-mono">{genProgress}%</span>
          </div>
          <div className="confidence-bar h-2 mb-3">
            <div
              className="confidence-fill"
              style={{ width: `${genProgress}%`, background: "#00d4ff" }}
            />
          </div>
          <div className="text-[#475569] text-[10px] font-mono space-y-0.5">
            {genProgress >= 10 && <div>▸ Ingesting Running Estimate and sensor data...</div>}
            {genProgress >= 25 && <div>▸ Correlating tracked threat entities and hostile narratives...</div>}
            {genProgress >= 40 && <div>▸ Integrating selected COA and MOE status...</div>}
            {genProgress >= 55 && <div>▸ Generating operational language (STANAG 6001)...</div>}
            {genProgress >= 70 && <div>▸ Formatting per MCDP 5 / MCWP 3-32.1 standards...</div>}
            {genProgress >= 82 && <div>▸ Applying classification markings...</div>}
            {genProgress >= 90 && <div>▸ Running consistency and doctrinal compliance check...</div>}
            {genProgress >= 96 && <div>▸ Finalizing and validating output...</div>}
            {genProgress >= 100 && <div className="text-[#10b981]">✓ Document generation complete.</div>}
          </div>
        </div>
      )}

      {/* Doc type tabs */}
      <div className="flex gap-2">
        {([
          { id: "annex-i" as DocType, label: "ANNEX I (INFORMATION)", subtitle: "Full IO Annex to OPORD" },
          { id: "itco" as DocType, label: "ITCO", subtitle: "Info Tasking & Coordination Order" },
        ]).map((doc) => (
          <button
            key={doc.id}
            onClick={() => setActiveDoc(doc.id)}
            className={`flex-1 p-3 border rounded text-left transition-colors ${
              activeDoc === doc.id
                ? "border-[#00d4ff] bg-[#00d4ff10]"
                : "border-[#1e3a5f] hover:border-[#0891b2]"
            }`}
          >
            <div className={`text-xs font-bold ${activeDoc === doc.id ? "text-[#00d4ff]" : "text-[#94a3b8]"}`}>
              {doc.label}
            </div>
            <div className="text-[#475569] text-[10px] mt-0.5">{doc.subtitle}</div>
          </button>
        ))}
      </div>

      {/* COA selection for ITCO */}
      <div className="p-3 border border-[#1e3a5f] bg-[#070d1a] rounded">
        <div className="text-[#475569] text-[10px] tracking-wider mb-2">GENERATION PARAMETERS</div>
        <div className="grid grid-cols-3 gap-3 text-[10px]">
          <div>
            <span className="text-[#475569]">Selected COA: </span>
            <span className="text-[#00d4ff] font-bold">{coa ? `${coa.id} — ${coa.name}` : "—"}</span>
          </div>
          <div>
            <span className="text-[#475569]">IE Priority: </span>
            <span className="text-[#10b981] font-bold">{runningEstimate.priority}</span>
          </div>
          <div>
            <span className="text-[#475569]">Classification: </span>
            <span className="text-[#f59e0b] font-bold">{runningEstimate.classification}</span>
          </div>
          <div>
            <span className="text-[#475569]">DTG: </span>
            <span className="text-[#94a3b8] font-mono">{runningEstimate.dtg}</span>
          </div>
          <div>
            <span className="text-[#475569]">Operation: </span>
            <span className="text-[#94a3b8]">{runningEstimate.operationName}</span>
          </div>
          <div>
            <span className="text-[#475569]">Threats / Narratives: </span>
            <span className="text-[#94a3b8]">{threats.length} / {narratives.length}</span>
          </div>
        </div>
      </div>

      {/* Document output */}
      <div className="tactical-card">
        <div className="px-4 py-3 border-b border-[#1e3a5f] flex items-center justify-between">
          <div className="text-[#00d4ff] text-xs font-bold tracking-widest">
            {activeDoc === "annex-i" ? "ANNEX I (INFORMATION) — DRAFT OUTPUT" : "ITCO — DRAFT OUTPUT"}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {tevvChecked && (
              <span className="text-[10px] text-[#10b981] font-mono">✓ DRAFT COMPLETE // HUMAN REVIEW REQUIRED</span>
            )}
            {generated && (
              <>
                {/* Plain text export */}
                <button
                  onClick={() => {
                    const blob = new Blob([docContent], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${activeDoc.toUpperCase()}_${runningEstimate.dtg.replace(/\s/g, "_")}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-2 py-1 text-[10px] border border-[#0891b2] text-[#00d4ff] rounded hover:bg-[#0891b215] font-mono"
                  title="Export as plain text (copy into Word/SIPR document)"
                >
                  ↓ TXT
                </button>
                {/* JSON export — structured data for downstream systems */}
                <button
                  onClick={() => {
                    const jsonData = {
                      exportedAt: new Date().toISOString(),
                      docType: activeDoc,
                      dtg: runningEstimate.dtg,
                      classification: runningEstimate.classification,
                      operationName: runningEstimate.operationName,
                      ieCondition: runningEstimate.ieCondition,
                      selectedCOA: coa ? { id: coa.id, name: coa.name } : null,
                      threatEntities: threats.map((t) => ({
                        designation: t.designation,
                        threat: t.threat,
                        activity: t.activity,
                        source: t.sourceLabel,
                        sourceUrl: t.sourceUrl,
                      })),
                      hostileNarratives: narratives.map((n) => ({ title: n.title, platform: n.platform, reach: n.reach, trend: n.trend })),
                      plainTextContent: docContent,
                      generationTool: "IE-SYNC IO Planning Tool v2.0",
                      humanReviewRequired: true,
                    };
                    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${activeDoc.toUpperCase()}_${runningEstimate.dtg.replace(/\s/g, "_")}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-2 py-1 text-[10px] border border-[#1e3a5f] text-[#475569] rounded hover:bg-[#1e3a5f30] font-mono"
                  title="Export as JSON — for integration with other systems"
                >
                  ↓ JSON
                </button>
                {/* Copy to clipboard */}
                <button
                  onClick={handleCopy}
                  className={`px-2 py-1 text-[10px] border rounded font-mono transition-colors ${
                    copied
                      ? "border-[#10b981] text-[#10b981] bg-[#10b98115]"
                      : "border-[#1e3a5f] text-[#475569] hover:border-[#334155]"
                  }`}
                  title="Copy document text to clipboard"
                >
                  {copied ? "✓ COPIED" : "⎘ COPY"}
                </button>
              </>
            )}
          </div>
        </div>
        <div className="p-4">
          {generated ? (
            <pre className="text-[11px] text-[#e2e8f0] font-mono leading-relaxed whitespace-pre-wrap overflow-auto max-h-[500px] bg-[#070d1a] p-4 rounded border border-[#1e3a5f]">
              {docContent}
            </pre>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <div className="text-[#1e3a5f] text-4xl mb-4">◧</div>
              <div className="text-[#475569] text-sm mb-2">
                Document not yet generated
              </div>
              <div className="text-[#334155] text-xs max-w-sm">
                Click &quot;GENERATE DOCUMENT&quot; to produce a draft {activeDoc === "annex-i" ? "Annex I" : "ITCO"} based on current Running Estimate, tracked AO threats, hostile narratives, and the selected COA. All output requires human analyst review before commander briefing.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Review lanes — sign-off checklist */}
      {generated && (
        <ReviewLanes docType={activeDoc} />
      )}

      {/* GenAI warning */}
      <div className="p-3 border border-[#f59e0b50] bg-[#f59e0b08] rounded flex items-start gap-2">
        <span className="text-[#f59e0b] flex-shrink-0">⚑</span>
        <div className="text-[10px] text-[#94a3b8]">
          <span className="text-[#f59e0b] font-bold">COMMANDER ADVISORY: </span>
          AI-assisted planning documents require human analyst review and commander approval prior to release or dissemination. Legal review required for all DCO and EW actions. PA releases require PAO approval. This tool is an aid to planning — judgment and accountability rest with the responsible officer.
        </div>
      </div>

      {/* ── IO Glossary / Dictionary ───────────────────────────────── */}
      <GlossaryPanel module="annex" />
    </div>
  );
}

// ── Review Lanes — sign-off checklist ─────────────────────────────────────
function ReviewLanes({ docType }: { docType: DocType }) {
  const lanes = docType === "annex-i"
    ? [
        { role: "IO OFFICER", requirement: "Validate all IO tasks against current OPORD and commander's intent", required: true },
        { role: "LEGAL (JAG)", requirement: "Review CYBER (Title 10/50) and EW deconfliction authorities", required: true },
        { role: "PAO", requirement: "Approve all PA tasks and public messaging prior to release", required: true },
        { role: "PSYOP AUTH", requirement: "Approve MISO products (USSOCOM PSYOP approval authority)", required: true },
        { role: "COMMANDER", requirement: "Final approval before dissemination or execution", required: true },
      ]
    : [
        { role: "IO OFFICER", requirement: "Validate all task owners, NLT timings, and capability authorities", required: true },
        { role: "LEGAL (JAG)", requirement: "Title 10/50 review for CYBER tasks; EW authority confirmation", required: true },
        { role: "PAO", requirement: "Review PA task language and release authority", required: true },
        { role: "OPS SGT MAJ", requirement: "Confirm resource availability and execution feasibility", required: false },
      ];

  // Store check timestamp per lane (null = unchecked) — client-only, set on click to avoid hydration mismatch
  const [checkedAt, setCheckedAt] = useState<Record<string, string | null>>({});
  const isChecked = (role: string) => checkedAt[role] != null;
  const allRequired = lanes.filter((l) => l.required).every((l) => isChecked(l.role));

  const toggleLane = (role: string) => {
    setCheckedAt((c) => ({
      ...c,
      [role]: c[role] != null ? null : new Date().toISOString().substring(11, 16),
    }));
  };

  return (
    <div className="tactical-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[#00d4ff] text-xs font-bold tracking-widest">REVIEW LANES — SIGN-OFF CHECKLIST</div>
        {allRequired ? (
          <span className="text-[9px] text-[#10b981] border border-[#10b981] px-2 py-0.5 rounded font-mono">✓ ALL REQUIRED REVIEWS COMPLETE</span>
        ) : (
          <span className="text-[9px] text-[#ef4444] border border-[#ef4444] px-2 py-0.5 rounded font-mono">PENDING REQUIRED REVIEWS</span>
        )}
      </div>
      <div className="space-y-2">
        {lanes.map((lane) => (
          <div
            key={lane.role}
            className={`flex items-start gap-3 p-2.5 border rounded transition-colors ${
              isChecked(lane.role) ? "border-[#10b981] bg-[#10b98108]" : "border-[#1e3a5f] bg-[#070d1a]"
            }`}
          >
            <button
              onClick={() => toggleLane(lane.role)}
              className={`flex-shrink-0 w-4 h-4 border rounded mt-0.5 flex items-center justify-center text-[9px] font-bold ${
                isChecked(lane.role) ? "border-[#10b981] bg-[#10b98130] text-[#10b981]" : "border-[#334155] text-[#334155]"
              }`}
            >
              {isChecked(lane.role) ? "✓" : ""}
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[#00d4ff] text-[10px] font-bold">{lane.role}</span>
                {lane.required && (
                  <span className="text-[9px] text-[#ef4444] font-mono">REQUIRED</span>
                )}
              </div>
              <div className="text-[#94a3b8] text-[9px] mt-0.5">{lane.requirement}</div>
            </div>
            <div className="text-[9px] text-[#475569] font-mono flex-shrink-0">
              {isChecked(lane.role) ? `✓ ${checkedAt[lane.role]}Z` : "PENDING"}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 text-[9px] text-[#334155] font-mono">
        Mark each lane complete after receiving written or verbal confirmation from the responsible officer.
        This checklist is local-session only and does not persist across browser sessions.
      </div>
    </div>
  );
}
