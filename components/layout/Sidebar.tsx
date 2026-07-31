"use client";

import { useState, useRef, useEffect } from "react";
import { useIEStore } from "@/store/ie-store";
import { cn } from "@/lib/utils";

const modules = [
  { id: "cop", label: "IE OVERLAY", icon: "⬡" },
  { id: "ie-map", label: "TACTICAL MAP", icon: "◬" },
  { id: "running-estimate", label: "RUNNING ESTIMATE", icon: "◈" },
  { id: "sensor-fusion", label: "LIVE FEEDS", icon: "◉" },
  { id: "io-planner", label: "IO PLANNER", icon: "◆" },
  { id: "sigman", label: "SIGMAN MONITOR", icon: "◎" },
  { id: "s-and-t", label: "S&T RESOURCES", icon: "⚛" },
  { id: "doctrine", label: "DOCTRINE LIBRARY", icon: "▤" },
];

// Top navigation — a single dropdown module switcher.
export function Sidebar() {
  const { activeModule, setActiveModule, alerts, activeGCC, liveFeeds, liveFeedsLoading } = useIEStore();
  const unackedAlerts = alerts.filter((a) => !a.acknowledged).length;
  const ioFeedCount = liveFeeds.filter((f) => f.ioRelevant).length;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const active = modules.find((m) => m.id === activeModule) ?? modules[0];

  // Close the dropdown on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <nav className="relative z-[1200] flex items-center gap-3 bg-[#070d1a] border-b border-[#1e3a5f] px-3 py-1.5 flex-shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2 pr-3 border-r border-[#1e3a5f] flex-shrink-0">
        <span className="text-[#00d4ff] font-black text-base tracking-widest">IE-SYNC</span>
        <span className="text-[#475569] text-[10px] font-mono hidden lg:inline">IO DECISION SUPPORT</span>
      </div>

      {/* Module dropdown */}
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 px-3 py-1.5 rounded border border-[#1e3a5f] bg-[#0f1829] hover:border-[#0891b2] transition-colors min-w-[230px]"
        >
          <span className="text-base text-[#00d4ff]">{active.icon}</span>
          <span className="text-[12px] font-bold tracking-wider text-[#00d4ff] flex-1 text-left">{active.label}</span>
          <svg className={cn("w-3.5 h-3.5 text-[#475569] transition-transform", open && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute left-0 top-11 w-[260px] bg-[#0f1829] border border-[#1e3a5f] rounded shadow-2xl z-50 p-1.5">
            <div className="text-[#475569] text-[9px] font-bold tracking-widest px-2 py-1">MODULES</div>
            {modules.map((mod) => {
              const isActive = activeModule === mod.id;
              const badge = mod.id === "sensor-fusion" && ioFeedCount > 0 ? ioFeedCount : null;
              return (
                <button
                  key={mod.id}
                  onClick={() => { setActiveModule(mod.id); setOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-left transition-colors",
                    isActive ? "bg-[#162035] text-[#00d4ff]" : "text-[#94a3b8] hover:bg-[#162035] hover:text-[#e2e8f0]"
                  )}
                >
                  <span className={cn("text-base", isActive ? "text-[#00d4ff]" : "text-[#475569]")}>{mod.icon}</span>
                  <span className="text-[12px] font-bold tracking-wider flex-1">{mod.label}</span>
                  {badge !== null && (
                    <span className="px-1.5 py-0.5 bg-[#ef4444] text-white text-[9px] font-black rounded-full">{badge}</span>
                  )}
                  {isActive && <span className="text-[#00d4ff] text-xs">✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: compact live status */}
      <div className="ml-auto flex items-center gap-3 flex-shrink-0 text-[10px] font-mono pl-3">
        <div className="flex items-center gap-1.5">
          <span className={`status-dot ${liveFeedsLoading ? "warning pulse-alert" : "active"}`} />
          <span className="text-[#475569]">{liveFeedsLoading ? "FETCHING…" : `${liveFeeds.length} ART`}</span>
        </div>
        {ioFeedCount > 0 && <span className="text-[#ef4444] font-bold">{ioFeedCount} IO</span>}
        {unackedAlerts > 0 && (
          <span className="flex items-center gap-1 text-[#ef4444] font-bold">
            <span className="status-dot danger" /> {unackedAlerts} ALERTS
          </span>
        )}
        <span className="text-[#475569] hidden md:inline">{activeGCC}</span>
      </div>
    </nav>
  );
}
