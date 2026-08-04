"use client";

import { useIEStore } from "@/store/ie-store";
import { GCC_CONFIGS } from "@/lib/gcc-config";
import { useLiveFeeds } from "@/hooks/useLiveFeeds";

/**
 * Mission brief / start-here for Marine Corps Information Officers.
 * Maps the tool to the ITCC cycle (MCWP 8-10) and the MIG watch desk workflow.
 */

const WATCH_CYCLE = [
  {
    step: "1",
    phase: "SENSE",
    label: "IE Overlay & Live Feeds",
    module: "cop",
    ref: "MCWP 8-10 // Battlespace awareness",
    desc: "Build the IE picture: PMESII-PT factors, OSINT triage, daily INFSUM, and known threat entities in the selected AOR.",
    action: "Open COP",
  },
  {
    step: "2",
    phase: "UNDERSTAND",
    label: "Running Estimate",
    module: "running-estimate",
    ref: "JP 3-13 Ch. IV // MCWP 8-10",
    desc: "Generate or review the AI-drafted IE running estimate, narrative threads, MOE/MOP suggestions, and shift-ready assessment language.",
    action: "Open Estimate",
  },
  {
    step: "3",
    phase: "DECIDE / PLAN",
    label: "IO Planner → COA · Annex I · ITCO",
    module: "io-planner",
    ref: "ITCC → ITCO // Annex I (Information)",
    desc: "Fill the planning worksheet (or AI-draft from OSINT), mark available IRCs, and produce a draft COA, Annex I, and Information Tasking & Coordinating Order.",
    action: "Open Planner",
  },
  {
    step: "4",
    phase: "PROTECT",
    label: "SIGMAN Monitor",
    module: "sigman",
    ref: "OPSEC / Signature management",
    desc: "Scan open sources for friendly signature leakage that could compromise MAGTF OPSEC or enable adversary targeting in the IE.",
    action: "Open SIGMAN",
  },
];

const ROLE_CARDS = [
  {
    role: "Watch Officer / Duty IO",
    focus: "Sense & report",
    modules: [
      { id: "cop", label: "IE Overlay" },
      { id: "sensor-fusion", label: "Live Feeds" },
      { id: "running-estimate", label: "Running Estimate" },
    ],
    blurb:
      "Triage OSINT, update the IE condition, draft the INFSUM, and hand over a current running estimate.",
  },
  {
    role: "IO / OIE Planner",
    focus: "Plan & synchronize",
    modules: [
      { id: "running-estimate", label: "Running Estimate" },
      { id: "io-planner", label: "IO Planner" },
      { id: "doctrine", label: "Doctrine" },
    ],
    blurb:
      "Turn the estimate into synchronized information activities — COA, Annex I, and ITCO for commander approval.",
  },
  {
    role: "OPSEC / SIGMAN Cell",
    focus: "Protect friendly info",
    modules: [
      { id: "sigman", label: "SIGMAN" },
      { id: "cop", label: "IE Overlay" },
      { id: "sensor-fusion", label: "Live Feeds" },
    ],
    blurb:
      "Monitor open-source signature exposure and recommend mitigations before they become adversary collection opportunities.",
  },
];

export function DoctrinalOverview() {
  const {
    activeGCC,
    setActiveModule,
    liveFeeds,
    runningEstimate,
    alerts,
    assessment,
    generateAssessment,
    assessmentLoading,
  } = useIEStore();
  useLiveFeeds();
  const gcc = GCC_CONFIGS[activeGCC];

  const ioCount = liveFeeds.filter((f) => f.ioRelevant).length;
  const unackedAlerts = alerts.filter((a) => !a.acknowledged).length;

  const ieConditionColor =
    runningEstimate.ieCondition === "HOSTILE"
      ? "#ef4444"
      : runningEstimate.ieCondition === "UNCERTAIN"
        ? "#f59e0b"
        : "#10b981";

  const feedsReady = liveFeeds.length > 0;
  const estimateReady = Boolean(assessment);

  return (
    <div className="p-4 h-full overflow-y-auto space-y-5">
      {/* ── Identity ───────────────────────────────────────────────── */}
      <div className="tactical-card p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[#00d4ff] text-xl font-black tracking-[0.15em]">
              IE-SYNC
            </div>
            <div className="text-[#e2e8f0] text-sm font-bold tracking-wider mt-1">
              Information Environment Synchronization for Marine Information Officers
            </div>
            <p className="text-[#94a3b8] text-xs mt-2 max-w-3xl leading-relaxed">
              Decision-support for{" "}
              <span className="text-[#e2e8f0]">1st MIG / III MEF</span> and MAGTF
              information staffs operating in and through the Information Environment.
              Grounded in <span className="text-[#e2e8f0]">MCWP 8-10</span> (Information
              in Marine Corps Operations), the{" "}
              <span className="text-[#e2e8f0]">ITCC / ITCO</span> cycle, and joint OIE
              doctrine (JP 3-04 / JP 3-13). All products are{" "}
              <span className="text-[#10b981] font-semibold">UNCLASSIFIED // OSINT</span>{" "}
              drafts that require human analyst validation before command use.
            </p>
          </div>
          <div className="text-left lg:text-right flex-shrink-0 space-y-1.5">
            <span className="inline-block trl-badge">TRL 4 · EXPERIMENTATION</span>
            <div className="text-[#94a3b8] text-[10px] font-mono">
              1st MIG // III MEF // USMC
            </div>
            <div className="text-[#f59e0b] text-[9px] font-bold tracking-[0.08em]">
              NOT A CLASSIFIED SYSTEM — OSINT ONLY
            </div>
          </div>
        </div>

        {/* Theater + status strip */}
        <div className="mt-4 pt-3 border-t border-[#1e3a5f] flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-mono">
          <div className="flex items-center gap-2">
            <span className="text-xl leading-none">{gcc.flag}</span>
            <div>
              <div className="text-xs font-black tracking-wider" style={{ color: gcc.color }}>
                {gcc.abbr}
              </div>
              <div className="text-[#475569]">{gcc.aor}</div>
            </div>
          </div>
          <div className="h-6 w-px bg-[#1e3a5f] hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <span className="text-[#475569]">IE CONDITION:</span>
            <span className="font-bold" style={{ color: ieConditionColor }}>
              {runningEstimate.ieCondition}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#475569]">OSINT:</span>
            <span className={feedsReady ? "text-[#10b981] font-bold" : "text-[#f59e0b]"}>
              {feedsReady ? `${liveFeeds.length} articles` : "Loading / empty"}
            </span>
            {ioCount > 0 && (
              <span className="text-[#ef4444] font-bold">({ioCount} IO-relevant)</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#475569]">ESTIMATE:</span>
            <span className={estimateReady ? "text-[#10b981] font-bold" : "text-[#f59e0b]"}>
              {estimateReady ? "CACHED / READY" : "NOT GENERATED"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#475569]">ALERTS:</span>
            <span
              className={
                unackedAlerts > 0 ? "text-[#ef4444] font-bold" : "text-[#94a3b8]"
              }
            >
              {unackedAlerts} open
            </span>
          </div>
        </div>
      </div>

      {/* ── Primary actions for the desk ───────────────────────────── */}
      <div className="tactical-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] tracking-[0.15em] text-[#94a3b8] font-bold">
            WATCH DESK — START HERE
          </span>
          <div className="flex-1 h-px bg-[#1e3a5f]" />
          <span className="text-[9px] text-[#475569] font-mono">
            Recommended first 5 minutes on shift
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveModule("cop")}
            className="px-3 py-2 rounded border border-[#0891b2] bg-[#0891b215] text-[#00d4ff] text-xs font-bold tracking-wider hover:bg-[#0891b230] transition-colors"
          >
            1 · Review IE Overlay
          </button>
          <button
            onClick={() => {
              setActiveModule("running-estimate");
              if (!assessment && !assessmentLoading) generateAssessment(activeGCC);
            }}
            className="px-3 py-2 rounded border border-[#0891b2] bg-[#0891b215] text-[#00d4ff] text-xs font-bold tracking-wider hover:bg-[#0891b230] transition-colors"
          >
            2 · {estimateReady ? "Review" : "Generate"} Running Estimate
          </button>
          <button
            onClick={() => setActiveModule("io-planner")}
            className="px-3 py-2 rounded border border-[#1e3a5f] text-[#94a3b8] text-xs font-bold tracking-wider hover:border-[#0891b2] hover:text-[#00d4ff] transition-colors"
          >
            3 · Draft ITCO / Annex I
          </button>
          <button
            onClick={() => setActiveModule("sigman")}
            className="px-3 py-2 rounded border border-[#1e3a5f] text-[#94a3b8] text-xs font-bold tracking-wider hover:border-[#0891b2] hover:text-[#00d4ff] transition-colors"
          >
            4 · Check SIGMAN
          </button>
          <button
            onClick={() => setActiveModule("doctrine")}
            className="px-3 py-2 rounded border border-[#1e3a5f] text-[#94a3b8] text-xs font-bold tracking-wider hover:border-[#0891b2] hover:text-[#00d4ff] transition-colors"
          >
            Doctrine Library
          </button>
        </div>
        {!feedsReady && (
          <div className="mt-3 p-2.5 rounded border border-[#f59e0b40] bg-[#f59e0b08] text-[11px] text-[#f59e0b] leading-relaxed">
            <span className="font-bold">Feeds not populated yet.</span> Open{" "}
            <button
              onClick={() => setActiveModule("cop")}
              className="underline font-bold hover:text-white"
            >
              IE Overlay
            </button>{" "}
            or{" "}
            <button
              onClick={() => setActiveModule("sensor-fusion")}
              className="underline font-bold hover:text-white"
            >
              Live Feeds
            </button>{" "}
            and wait for the OSINT ingest (or hit REFRESH). AI products draft from
            whatever open-source items are available for the selected theater.
          </div>
        )}
      </div>

      {/* ── ITCC-aligned workflow ──────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] tracking-[0.15em] text-[#94a3b8] font-bold">
            INFORMATION OFFICER WORKFLOW
          </span>
          <div className="flex-1 h-px bg-[#1e3a5f]" />
          <span className="text-[9px] text-[#475569]">
            Aligns to MCWP 8-10 ITCC (Information Tasking &amp; Coordinating Cycle)
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {WATCH_CYCLE.map((wf) => (
            <button
              key={wf.step}
              onClick={() => setActiveModule(wf.module)}
              className="workflow-card text-left group"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded border border-[#0891b2] flex items-center justify-center text-[11px] text-[#00d4ff] font-bold group-hover:bg-[#0891b220]">
                  {wf.step}
                </span>
                <div className="min-w-0">
                  <div className="text-[9px] text-[#0891b2] font-mono font-bold tracking-wider">
                    {wf.phase}
                  </div>
                  <div className="text-xs text-[#00d4ff] font-bold tracking-wider truncate">
                    {wf.label}
                  </div>
                </div>
              </div>
              <div className="text-[9px] text-[#475569] font-mono mb-1.5">{wf.ref}</div>
              <div className="text-[11px] text-[#94a3b8] leading-relaxed">{wf.desc}</div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[9px] text-[#10b981] font-bold flex items-center gap-1">
                  <span className="status-dot active" /> LIVE MODULE
                </span>
                <span className="text-[9px] text-[#0891b2] font-bold group-hover:text-[#00d4ff]">
                  {wf.action} →
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Role lanes ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] tracking-[0.15em] text-[#94a3b8] font-bold">
            BY ROLE — MAGTF INFORMATION STAFF
          </span>
          <div className="flex-1 h-px bg-[#1e3a5f]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {ROLE_CARDS.map((card) => (
            <div key={card.role} className="tactical-card p-4">
              <div className="text-[#00d4ff] text-xs font-bold tracking-wider">
                {card.role}
              </div>
              <div className="text-[9px] text-[#0891b2] font-mono mt-0.5 mb-2">
                {card.focus.toUpperCase()}
              </div>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed mb-3">
                {card.blurb}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {card.modules.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setActiveModule(m.id)}
                    className="px-2 py-1 text-[10px] font-bold border border-[#1e3a5f] rounded text-[#94a3b8] hover:border-[#0891b2] hover:text-[#00d4ff] transition-colors"
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── What this is / is not ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="tactical-card p-4">
          <div className="text-[#10b981] text-xs font-bold tracking-wider mb-2">
            WHAT IE-SYNC GIVES YOU
          </div>
          <ul className="space-y-1.5 text-[11px] text-[#94a3b8] leading-relaxed list-none">
            <li>
              <span className="text-[#10b981] font-bold">•</span> Theater-filtered
              OSINT for the selected AOR (INDOPACOM default for III MEF)
            </li>
            <li>
              <span className="text-[#10b981] font-bold">•</span> AI-drafted Running
              Estimate, Daily INFSUM, and SIGMAN scan (human-validated drafts)
            </li>
            <li>
              <span className="text-[#10b981] font-bold">•</span> Worksheet-driven COA,
              Annex I (Information), and ITCO generation for planning cells
            </li>
            <li>
              <span className="text-[#10b981] font-bold">•</span> Transparent scoring,
              source links, and a doctrine library cited in products
            </li>
            <li>
              <span className="text-[#10b981] font-bold">•</span> Glossary of IO / OIE
              terms built for officers new to the information warfighting function
            </li>
          </ul>
        </div>
        <div className="tactical-card p-4">
          <div className="text-[#f59e0b] text-xs font-bold tracking-wider mb-2">
            WHAT IT IS NOT
          </div>
          <ul className="space-y-1.5 text-[11px] text-[#94a3b8] leading-relaxed list-none">
            <li>
              <span className="text-[#f59e0b] font-bold">•</span> Not SIPR / JWICS —
              no classified feeds, no real-time force tracking, no C2 authority
            </li>
            <li>
              <span className="text-[#f59e0b] font-bold">•</span> Not a substitute for
              the commander&apos;s estimate or approved ITCO — AI outputs are drafts
            </li>
            <li>
              <span className="text-[#f59e0b] font-bold">•</span> Not live adversary
              tracking — threat entities are reference / assessment-derived, not
              sensor tracks
            </li>
            <li>
              <span className="text-[#f59e0b] font-bold">•</span> Not a replacement for
              MIG COC tools, IBMCS, or formal assessment boards
            </li>
            <li>
              <span className="text-[#f59e0b] font-bold">•</span> TRL 4 concept
              demonstrator for experimentation and evaluation under controlled use
            </li>
          </ul>
        </div>
      </div>

      {/* ── Doctrine anchors ───────────────────────────────────────── */}
      <div className="tactical-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] tracking-[0.15em] text-[#94a3b8] font-bold">
            DOCTRINAL ANCHORS
          </span>
          <div className="flex-1 h-px bg-[#1e3a5f]" />
          <button
            onClick={() => setActiveModule("doctrine")}
            className="text-[9px] text-[#0891b2] font-bold hover:text-[#00d4ff]"
          >
            OPEN DOCTRINE LIBRARY →
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
          {[
            { pub: "MCWP 8-10", note: "Information in Marine Corps Operations · ITCC / ITCO" },
            { pub: "JP 3-04", note: "Information in Joint Operations" },
            { pub: "JP 3-13", note: "Information Operations · running estimate" },
            { pub: "MCDP 8 / MCWP 3-32", note: "Information & MAGTF IO TTPs" },
          ].map((d) => (
            <div
              key={d.pub}
              className="p-2.5 rounded border border-[#1e3a5f] bg-[#070d1a]"
            >
              <div className="text-[#00d4ff] font-bold font-mono">{d.pub}</div>
              <div className="text-[#475569] mt-1 leading-snug">{d.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Maturation note (compact) ──────────────────────────────── */}
      <div className="tactical-card p-3">
        <div className="text-[10px] text-[#475569] leading-relaxed">
          <span className="text-[#94a3b8] font-bold">MATURATION:</span> TRL 4 component
          validation (lab). Target environments for controlled evaluation: Marine Corps
          innovation pathways, III MEF G-7, 1st MIG S-3, and joint OIE experimentation
          venues. Partnership interest is welcome for TRL 6–7 maturation under
          appropriate funding and security controls.
        </div>
      </div>
    </div>
  );
}
