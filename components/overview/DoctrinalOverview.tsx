"use client";

import { useIEStore } from "@/store/ie-store";
import { GCC_CONFIGS } from "@/lib/gcc-config";
import { useLiveFeeds } from "@/hooks/useLiveFeeds";

const PATHS = [
  {
    step: "1",
    title: "Live OSINT",
    module: "sensor-fusion",
    desc: "Theater-filtered open-source reporting, scored for information-operations relevance with a transparent, analyst-challengeable rubric.",
  },
  {
    step: "2",
    title: "News & daily summary",
    module: "cop",
    desc: "The day's information-environment picture: an AI executive summary of theater reporting and the themes that matter to an information officer.",
  },
  {
    step: "3",
    title: "Adversary activity",
    module: "running-estimate",
    desc: "Known threat actors with public attribution, hostile narratives, and a draft estimate of what adversaries may do next — labeled as speculation for human review.",
  },
  {
    step: "4",
    title: "Doctrine",
    module: "doctrine",
    desc: "Public doctrine and research for the information warfighting function — every entry carries a working public link.",
  },
  {
    step: "5",
    title: "S&T resources",
    module: "s-and-t",
    desc: "Journals, research organizations, conferences, and training for staying current on information science & technology.",
  },
];

export function DoctrinalOverview() {
  const {
    activeGCC,
    setActiveModule,
    liveFeeds,
    runningEstimate,
    assessment,
    generateAssessment,
    assessmentLoading,
  } = useIEStore();
  useLiveFeeds();
  const gcc = GCC_CONFIGS[activeGCC];

  const ioCount = liveFeeds.filter((f) => f.ioRelevant).length;
  const feedsReady = liveFeeds.length > 0;
  const estimateReady = Boolean(assessment);

  const ieColor =
    runningEstimate.ieCondition === "HOSTILE"
      ? "var(--danger)"
      : runningEstimate.ieCondition === "UNCERTAIN"
        ? "var(--warning)"
        : "var(--success)";

  return (
    <div className="page-scroll">
      <header className="page-header">
        <div>
          <p className="label mb-1">1st MIG · III MEF · Marine Information Officers</p>
          <h1 className="page-title">One source for the information environment.</h1>
          <p className="page-subtitle">
            IE-SYNC is a single open-source desk for military Information Officers. It
            combines live OSINT, theater news, adversary activity, public doctrine, and
            science &amp; technology resources — the daily read for understanding the
            information environment. Everything here is{" "}
            <strong className="text-[var(--success)]">UNCLASSIFIED // OSINT</strong> and
            AI-drafted content requires human validation before command use.
          </p>
        </div>
        <span className="trl-badge" title="Technology Readiness Level 4 — a working prototype under evaluation, not a fielded system">Prototype · TRL 4</span>
      </header>

      {/* Theater status */}
      <div className="panel flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{gcc.flag}</span>
          <div>
            <div className="font-bold text-[15px]" style={{ color: gcc.color }}>
              {gcc.abbr}
            </div>
            <div className="text-[13px] text-muted">{gcc.aor}</div>
          </div>
        </div>
        <div>
          <div className="label">IE condition</div>
          <div className="font-bold text-[15px]" style={{ color: ieColor }}>
            {runningEstimate.ieCondition}
          </div>
        </div>
        <div>
          <div className="label">Open-source articles</div>
          <div className="font-bold text-[15px]">
            {feedsReady ? liveFeeds.length : "—"}
            {ioCount > 0 && (
              <span className="text-[var(--danger)] font-semibold text-[13px] ml-1.5">
                ({ioCount} relevant to information ops)
              </span>
            )}
          </div>
        </div>
        <div>
          <div className="label">Adversary estimate</div>
          <div
            className="font-bold text-[15px]"
            style={{ color: estimateReady ? "var(--success)" : "var(--warning)" }}
          >
            {estimateReady ? "Draft ready" : "Not generated"}
          </div>
        </div>
      </div>

      {/* Start here */}
      <div className="panel">
        <h2 className="panel-title mb-1">Start here</h2>
        <p className="text-[14px] text-muted mb-4">
          Recommended first minutes on the desk for the selected theater.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={() => setActiveModule("cop")}>
            1 · View the IE
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setActiveModule("running-estimate");
              if (!assessment && !assessmentLoading) generateAssessment(activeGCC);
            }}
          >
            2 · {estimateReady ? "Review" : "Generate"} adversary estimate
          </button>
          <button type="button" className="btn" onClick={() => setActiveModule("doctrine")}>
            Public doctrine
          </button>
          <button type="button" className="btn" onClick={() => setActiveModule("s-and-t")}>
            S&amp;T resources
          </button>
        </div>
        {!feedsReady && (
          <div className="notice notice-warn mt-4">
            <strong>Feeds not loaded yet.</strong> Open Information Environment or Live OSINT
            and wait for ingest (or refresh). Estimates draft from whatever open-source items
            are available for this theater — the tool does not invent news.
          </div>
        )}
      </div>

      {/* Workflow */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-[15px] font-bold m-0">What&apos;s inside</h2>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PATHS.map((p) => (
            <button
              key={p.step}
              type="button"
              className="workflow-card"
              onClick={() => setActiveModule(p.module)}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <span className="w-8 h-8 rounded-lg border border-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] font-bold text-sm">
                  {p.step}
                </span>
                <span className="font-semibold text-[15px] text-[var(--foreground)]">
                  {p.title}
                </span>
              </div>
              <p className="text-[14px] text-muted m-0 leading-relaxed">{p.desc}</p>
              <div className="mt-3 text-[13px] font-semibold text-[var(--accent-dim)]">
                Open →
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* What / not */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="panel">
          <h3 className="text-[14px] font-bold text-[var(--success)] m-0 mb-2">
            What this captures
          </h3>
          <ul className="m-0 pl-4 space-y-2 text-[14px] text-muted">
            <li>Theater-filtered open-source reporting about the information environment</li>
            <li>A daily AI news summary of what the theater reporting says</li>
            <li>Known adversary actors and influence patterns (public attribution)</li>
            <li>Draft speculation on adversary activity in the IE, cited to open sources</li>
            <li>Public doctrine and S&amp;T resources — research links with public URLs only</li>
          </ul>
        </div>
        <div className="panel">
          <h3 className="text-[14px] font-bold text-[var(--warning)] m-0 mb-2">
            What this is not
          </h3>
          <ul className="m-0 pl-4 space-y-2 text-[14px] text-muted">
            <li>Not classified intelligence or a SIPR/JWICS system</li>
            <li>Not a substitute for the commander’s estimate or approved orders</li>
            <li>Not real-time adversary tracking — reference and assessment, not tracks</li>
            <li>Speculation is labeled as such; humans own the judgment</li>
          </ul>
        </div>
      </div>

      <div className="notice notice-info">
        <strong>About speculation.</strong> “Adversary estimate” products reason from open
        reporting about possible hostile information activities (narratives, cyber,
        influence, EW, etc.). They are analytic drafts — confidence varies, sources are
        cited where available, and officers must challenge and revise before briefing.
      </div>
    </div>
  );
}
