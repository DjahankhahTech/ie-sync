"use client";

import { useIEStore } from "@/store/ie-store";
import { cn } from "@/lib/utils";

/** Clear, plain-language modules ordered as the IO's daily read: news → OSINT → adversary → reference. */
const modules: { id: string; label: string; hint: string }[] = [
  { id: "home", label: "Home", hint: "Purpose & how to use" },
  { id: "cop", label: "Information Environment", hint: "Daily summary, news, and themes" },
  { id: "ie-map", label: "Map", hint: "Layers & locations" },
  { id: "sensor-fusion", label: "Live OSINT", hint: "Open-source feeds" },
  { id: "running-estimate", label: "Adversary Narrative", hint: "What anti-US audiences are reading" },
  { id: "sigman", label: "Signatures", hint: "Friendly exposure" },
  { id: "doctrine", label: "Public Doctrine", hint: "Open research links" },
  { id: "s-and-t", label: "S&T", hint: "Research resources" },
];

export function Sidebar() {
  const {
    activeModule,
    setActiveModule,
    alerts,
    activeGCC,
    liveFeeds,
    liveFeedsLoading,
  } = useIEStore();
  const unackedAlerts = alerts.filter((a) => !a.acknowledged).length;
  const ioFeedCount = liveFeeds.filter((f) => f.ioRelevant).length;

  return (
    <nav className="relative z-[1200] flex flex-col bg-[#0a1220] border-b border-[var(--border)] flex-shrink-0">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <div className="text-[var(--accent)] font-bold text-lg tracking-tight leading-none">
              IE-SYNC
            </div>
            <div className="text-[12px] text-[var(--muted)] mt-0.5 truncate">
              OSINT · Doctrine · News · Adversary narrative · S&T — one source for information officers
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3 flex-shrink-0 text-[12px] text-[var(--muted)]">
          <div className="flex items-center gap-1.5">
            <span
              className={`status-dot ${liveFeedsLoading ? "warning pulse-alert" : liveFeeds.length ? "active" : "warning"}`}
            />
            <span>
              {liveFeedsLoading
                ? "Loading feeds…"
                : `${liveFeeds.length} articles${ioFeedCount ? ` · ${ioFeedCount} IO` : ""}`}
            </span>
          </div>
          {unackedAlerts > 0 && (
            <span className="text-[var(--danger)] font-semibold">{unackedAlerts} alerts</span>
          )}
          <span className="hidden sm:inline font-medium text-[var(--foreground)]/70">
            {activeGCC}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto px-3 pb-2.5">
        {modules.map((mod) => {
          const isActive = activeModule === mod.id;
          const badge =
            mod.id === "sensor-fusion" && ioFeedCount > 0 ? ioFeedCount : null;
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => setActiveModule(mod.id)}
              title={mod.hint}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-colors border",
                isActive
                  ? "bg-[rgba(14,165,233,0.12)] border-[var(--accent-dim)] text-[var(--accent)]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)]"
              )}
            >
              {mod.label}
              {badge !== null && (
                <span className="px-1.5 py-0.5 bg-[var(--danger)] text-white text-[10px] font-bold rounded-full">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
