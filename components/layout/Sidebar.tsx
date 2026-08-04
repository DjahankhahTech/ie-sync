"use client";

import { useIEStore } from "@/store/ie-store";
import { cn } from "@/lib/utils";

/**
 * Workflow-ordered modules for Marine Corps Information Officers.
 * Sense the IE → Understand (estimate) → Plan (ITCO) → Protect signatures → Reference.
 */
const workflowGroups: {
  phase: string;
  modules: { id: string; label: string; short: string; icon: string }[];
}[] = [
  {
    phase: "ORIENT",
    modules: [
      { id: "home", label: "MISSION BRIEF", short: "HOME", icon: "▣" },
      { id: "cop", label: "IE OVERLAY", short: "COP", icon: "⬡" },
      { id: "ie-map", label: "TACTICAL MAP", short: "MAP", icon: "◬" },
      { id: "sensor-fusion", label: "LIVE FEEDS", short: "FEEDS", icon: "◉" },
    ],
  },
  {
    phase: "ASSESS",
    modules: [
      { id: "running-estimate", label: "RUNNING ESTIMATE", short: "EST", icon: "◈" },
    ],
  },
  {
    phase: "PLAN",
    modules: [
      { id: "io-planner", label: "IO PLANNER / ITCO", short: "PLAN", icon: "◆" },
      { id: "sigman", label: "SIGMAN", short: "SIG", icon: "◎" },
    ],
  },
  {
    phase: "REF",
    modules: [
      { id: "doctrine", label: "DOCTRINE", short: "DOC", icon: "▤" },
      { id: "s-and-t", label: "S&T", short: "S&T", icon: "⚛" },
    ],
  },
];

const flatModules = workflowGroups.flatMap((g) => g.modules);

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
    <nav className="relative z-[1200] flex flex-col bg-[#070d1a] border-b border-[#1e3a5f] flex-shrink-0">
      {/* Brand row */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-[#1e3a5f]/40">
        <div className="flex items-center gap-2 pr-3 border-r border-[#1e3a5f] flex-shrink-0">
          <span className="text-[#00d4ff] font-black text-base tracking-widest">IE-SYNC</span>
          <div className="hidden md:flex flex-col leading-tight">
            <span className="text-[#94a3b8] text-[10px] font-mono">
              INFORMATION ENVIRONMENT SYNC
            </span>
            <span className="text-[#475569] text-[9px] font-mono">
              1st MIG // III MEF // USMC INFORMATION OFFICERS
            </span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3 flex-shrink-0 text-[10px] font-mono">
          <div className="flex items-center gap-1.5">
            <span
              className={`status-dot ${liveFeedsLoading ? "warning pulse-alert" : "active"}`}
            />
            <span className="text-[#475569]">
              {liveFeedsLoading ? "FETCHING…" : `${liveFeeds.length} ART`}
            </span>
          </div>
          {ioFeedCount > 0 && (
            <span className="text-[#ef4444] font-bold">{ioFeedCount} IO</span>
          )}
          {unackedAlerts > 0 && (
            <span className="flex items-center gap-1 text-[#ef4444] font-bold">
              <span className="status-dot danger" /> {unackedAlerts} ALERTS
            </span>
          )}
          <span className="text-[#475569] hidden sm:inline">{activeGCC}</span>
        </div>
      </div>

      {/* Workflow tabs — horizontal, phase-grouped */}
      <div className="flex items-stretch gap-0 overflow-x-auto px-1 py-1">
        {workflowGroups.map((group, gi) => (
          <div key={group.phase} className="flex items-stretch flex-shrink-0">
            {gi > 0 && (
              <div className="w-px bg-[#1e3a5f] mx-1 self-stretch my-1" aria-hidden />
            )}
            <div className="flex flex-col justify-center px-1">
              <span className="text-[8px] font-bold tracking-widest text-[#475569] px-1.5 mb-0.5 hidden lg:block">
                {group.phase}
              </span>
              <div className="flex items-center gap-0.5">
                {group.modules.map((mod) => {
                  const isActive = activeModule === mod.id;
                  const badge =
                    mod.id === "sensor-fusion" && ioFeedCount > 0 ? ioFeedCount : null;
                  return (
                    <button
                      key={mod.id}
                      onClick={() => setActiveModule(mod.id)}
                      title={mod.label}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded text-left transition-colors whitespace-nowrap",
                        isActive
                          ? "bg-[#162035] text-[#00d4ff] border border-[#0891b2]"
                          : "text-[#94a3b8] hover:bg-[#162035] hover:text-[#e2e8f0] border border-transparent"
                      )}
                    >
                      <span
                        className={cn(
                          "text-sm",
                          isActive ? "text-[#00d4ff]" : "text-[#475569]"
                        )}
                      >
                        {mod.icon}
                      </span>
                      <span className="text-[11px] font-bold tracking-wider hidden xl:inline">
                        {mod.label}
                      </span>
                      <span className="text-[11px] font-bold tracking-wider xl:hidden">
                        {mod.short}
                      </span>
                      {badge !== null && (
                        <span className="px-1.5 py-0.5 bg-[#ef4444] text-white text-[9px] font-black rounded-full">
                          {badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Screen-reader list of all modules for completeness */}
      <span className="sr-only">
        Modules: {flatModules.map((m) => m.label).join(", ")}
      </span>
    </nav>
  );
}
