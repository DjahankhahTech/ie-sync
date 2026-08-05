"use client";

import { useIEStore } from "@/store/ie-store";
import { formatDTG } from "@/lib/utils";
import { useState, useEffect } from "react";
import { GCC_CONFIGS, type GCCId } from "@/lib/gcc-config";

const moduleMeta: Record<string, { title: string; blurb: string }> = {
  home: {
    title: "Home",
    blurb: "One open-source desk: OSINT, doctrine, news, adversary narrative, and S&T",
  },
  cop: {
    title: "Information Environment",
    blurb: "Open-source picture of the IE — themes, threats, and daily summary",
  },
  "ie-map": {
    title: "Map",
    blurb: "Physical, informational, and cognitive layers on the map",
  },
  "running-estimate": {
    title: "Adversary Narrative",
    blurb: "What anti-US audiences are reading in this theater, and the estimate behind it",
  },
  "sensor-fusion": {
    title: "Live OSINT",
    blurb: "Triage open-source reporting for the selected theater",
  },
  sigman: {
    title: "Signature management",
    blurb: "Where friendly activity may leak into open sources",
  },
  "s-and-t": {
    title: "Science & technology",
    blurb: "Journals and resources for information officers",
  },
  doctrine: {
    title: "Public doctrine",
    blurb: "Only research with a public web link",
  },
};

export function Header() {
  const {
    activeModule,
    alerts,
    acknowledgeAlert,
    activeGCC,
    setActiveGCC,
    liveFeedsFetchedAt,
    liveFeeds,
    runningEstimate,
  } = useIEStore();
  const [currentDTG, setCurrentDTG] = useState(formatDTG());
  const [showAlerts, setShowAlerts] = useState(false);
  const [showGCCPicker, setShowGCCPicker] = useState(false);
  const unacked = alerts.filter((a) => !a.acknowledged);
  const gcc = GCC_CONFIGS[activeGCC];
  const meta = moduleMeta[activeModule] ?? {
    title: "IE-SYNC",
    blurb: "Information environment decision support",
  };

  const feedAgeMins = liveFeedsFetchedAt
    ? Math.floor((Date.now() - new Date(liveFeedsFetchedAt).getTime()) / 60000)
    : null;
  const feedStale = feedAgeMins !== null && feedAgeMins > 30;
  const feedLabel =
    feedAgeMins === null
      ? "No feed yet"
      : feedAgeMins < 1
        ? "Just now"
        : feedAgeMins < 60
          ? `${feedAgeMins}m ago`
          : `${Math.floor(feedAgeMins / 60)}h ago`;

  const ieColor =
    runningEstimate.ieCondition === "HOSTILE"
      ? "var(--danger)"
      : runningEstimate.ieCondition === "UNCERTAIN"
        ? "var(--warning)"
        : "var(--success)";

  useEffect(() => {
    const interval = setInterval(() => setCurrentDTG(formatDTG()), 60000);
    return () => clearInterval(interval);
  }, []);

  const severityColor: Record<string, string> = {
    CRITICAL: "text-[var(--danger)]",
    HIGH: "text-orange-400",
    MEDIUM: "text-[var(--warning)]",
    LOW: "text-[var(--success)]",
  };

  return (
    <header className="relative z-[1100] bg-[#0a1220]/80 backdrop-blur border-b border-[var(--border)] px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[1.05rem] font-bold text-[var(--foreground)] tracking-tight truncate">
            {meta.title}
          </h1>
          <p className="text-[13px] text-[var(--muted)] mt-0.5 truncate">
            {gcc.abbr} · {meta.blurb}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowGCCPicker(!showGCCPicker);
                setShowAlerts(false);
              }}
              className="flex items-center gap-2 px-3 py-1.5 border rounded-lg transition-colors hover:border-[var(--accent-dim)]"
              style={{ borderColor: gcc.color, background: `${gcc.color}12` }}
            >
              <span className="text-lg leading-none">{gcc.flag}</span>
              <div className="text-left hidden sm:block">
                <div className="text-[13px] font-bold" style={{ color: gcc.color }}>
                  {gcc.abbr}
                </div>
                <div className="text-[11px] text-[var(--muted)]">Theater</div>
              </div>
            </button>

            {showGCCPicker && (
              <div className="absolute right-0 top-11 w-72 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl z-50">
                <div className="p-3 border-b border-[var(--border)]">
                  <div className="text-[13px] font-semibold">Select theater</div>
                  <div className="text-[12px] text-[var(--muted)] mt-0.5">
                    Filters feeds, estimate, and speculation products
                  </div>
                </div>
                <div className="p-2 space-y-1 max-h-80 overflow-y-auto">
                  {(Object.entries(GCC_CONFIGS) as [GCCId, typeof gcc][]).map(
                    ([id, cfg]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setActiveGCC(id);
                          setShowGCCPicker(false);
                        }}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left hover:bg-[var(--card-hover)] ${
                          activeGCC === id ? "bg-[var(--card-hover)]" : ""
                        }`}
                      >
                        <span className="text-xl">{cfg.flag}</span>
                        <div className="min-w-0">
                          <div className="text-[13px] font-bold" style={{ color: cfg.color }}>
                            {cfg.abbr}
                          </div>
                          <div className="text-[12px] text-[var(--muted)] truncate">
                            {cfg.aor}
                          </div>
                        </div>
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="text-right hidden md:block">
            <div className="text-[13px] font-mono text-[var(--accent)]">{currentDTG}</div>
            <div className="text-[11px] text-[var(--muted)]">Zulu</div>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowAlerts(!showAlerts);
                setShowGCCPicker(false);
              }}
              className="relative p-2 border border-[var(--border)] rounded-lg hover:border-[var(--danger)]"
              aria-label="Alerts"
            >
              <svg className="w-4 h-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {unacked.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--danger)] rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                  {unacked.length}
                </span>
              )}
            </button>

            {showAlerts && (
              <div className="absolute right-0 top-11 w-96 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto">
                <div className="p-3 border-b border-[var(--border)] flex items-center justify-between">
                  <span className="text-[13px] font-semibold">Alerts — {gcc.abbr}</span>
                  <button
                    type="button"
                    onClick={() => setShowAlerts(false)}
                    className="text-[var(--muted)] hover:text-white text-sm"
                  >
                    ✕
                  </button>
                </div>
                {alerts.length === 0 ? (
                  <div className="p-4 text-[13px] text-[var(--muted)]">
                    No alerts. Alerts come from live triage and assessments — not invented.
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 border-b border-[var(--border)] ${
                        alert.acknowledged ? "opacity-40" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className={`text-[12px] font-bold mb-1 ${severityColor[alert.severity]}`}>
                            [{alert.severity}] {alert.source}
                          </div>
                          <div className="text-[13px]">{alert.message}</div>
                          <div className="text-[11px] text-[var(--muted)] mt-1 font-mono">
                            {alert.timestamp}
                          </div>
                        </div>
                        {!alert.acknowledged && (
                          <button
                            type="button"
                            onClick={() => acknowledgeAlert(alert.id)}
                            className="btn btn-primary text-[11px] py-1 px-2"
                          >
                            MARK SEEN
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div
            className="hidden lg:flex flex-col items-end px-2.5 py-1.5 border rounded-lg text-right"
            style={{
              borderColor: feedStale ? "var(--danger)" : "var(--border)",
            }}
          >
            <span
              className="text-[12px] font-semibold"
              style={{
                color: feedStale
                  ? "var(--danger)"
                  : feedAgeMins === null
                    ? "var(--muted-strong)"
                    : "var(--success)",
              }}
            >
              OSINT {feedStale ? "stale" : feedAgeMins === null ? "pending" : "fresh"}
            </span>
            <span className="text-[11px] text-[var(--muted)]">
              {feedLabel} · {liveFeeds.length} items
            </span>
          </div>

          <div
            className="flex items-center gap-2 px-3 py-1.5 border rounded-lg"
            style={{ borderColor: ieColor, background: `${ieColor}14` }}
          >
            <span
              className={`status-dot ${
                runningEstimate.ieCondition === "HOSTILE"
                  ? "danger"
                  : runningEstimate.ieCondition === "UNCERTAIN"
                    ? "warning"
                    : "active"
              }`}
            />
            <span className="text-[13px] font-bold" style={{ color: ieColor }}>
              IE {runningEstimate.ieCondition}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
