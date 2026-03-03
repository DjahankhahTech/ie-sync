"use client";

import { useIEStore } from "@/store/ie-store";
import { GCC_CONFIGS } from "@/lib/gcc-config";
import { cn } from "@/lib/utils";
import { formatDTG } from "@/lib/utils";

const modules = [
  { id: "cop", label: "IE OVERLAY", subtitle: "Common Op Picture", icon: "⬡" },
  { id: "running-estimate", label: "RUNNING ESTIMATE", subtitle: "Live IE Assessment", icon: "◈" },
  { id: "sensor-fusion", label: "LIVE FEEDS", subtitle: "OSINT by Theater", icon: "◉" },
  { id: "coa", label: "COA ENGINE", subtitle: "Decision Support", icon: "◆" },
  { id: "sigman", label: "SIGMAN MONITOR", subtitle: "Signature Mgmt", icon: "◎" },
  { id: "annex", label: "ANNEX GENERATOR", subtitle: "Annex I / ITCO", icon: "◧" },
  { id: "conceal-reveal", label: "CONCEAL/REVEAL", subtitle: "JP 3-13.3 Posture", icon: "◐" },
  { id: "signature-mgmt", label: "SIG MANAGEMENT", subtitle: "EMCON/OPSEC/SATVUL", icon: "◑" },
  { id: "adversary-perceptions", label: "ADV PERCEPTIONS", subtitle: "State Media Analysis", icon: "◒" },
  { id: "gray-zone", label: "GRAY ZONE", subtitle: "Sub-Threshold Activity", icon: "◓" },
  { id: "abmd", label: "ABMD FUSION", subtitle: "Missile Defense OSINT", icon: "◈" },
];

export function Sidebar() {
  const { activeModule, setActiveModule, alerts, anomalyCount, activeGCC, liveFeeds, liveFeedsLoading, liveFeedsFetchedAt } = useIEStore();
  const unackedAlerts = alerts.filter((a) => !a.acknowledged).length;
  const gcc = GCC_CONFIGS[activeGCC];
  const ioFeedCount = liveFeeds.filter((f) => f.ioRelevant).length;

  // Data freshness
  const feedAgeMins = liveFeedsFetchedAt
    ? Math.floor((Date.now() - new Date(liveFeedsFetchedAt).getTime()) / 60000)
    : null;
  const feedStale = feedAgeMins !== null && feedAgeMins > 30;

  return (
    <aside className="w-64 flex-shrink-0 bg-[#070d1a] border-r border-[#1e3a5f] flex flex-col">
      {/* Logo area */}
      <div className="p-4 border-b border-[#1e3a5f]">
        <div className="text-[#00d4ff] font-black text-lg tracking-widest">IE-SYNC</div>
        <div className="text-[#94a3b8] text-xs tracking-wider mt-0.5">INFORMATION NAVIGATOR v2.1</div>
        <div className="text-[#94a3b8] text-xs mt-1 font-mono">IO DECISION SUPPORT</div>
      </div>

      {/* Active GCC chip */}
      <div className="mx-3 mt-3 p-2.5 border rounded" style={{ borderColor: `${gcc.color}60`, background: `${gcc.color}08` }}>
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none">{gcc.flag}</span>
          <div>
            <div className="text-xs font-black tracking-wider" style={{ color: gcc.color }}>{gcc.abbr}</div>
            <div className="text-[#475569] text-[9px] font-mono">{gcc.aor}</div>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[9px]">
          <div className="flex items-center gap-1">
            {liveFeedsLoading ? (
              <span className="status-dot warning pulse-alert" />
            ) : (
              <span className="status-dot active" />
            )}
            <span className="text-[#475569]">
              {liveFeedsLoading ? "FETCHING..." : `${liveFeeds.length} articles`}
            </span>
          </div>
          {ioFeedCount > 0 && (
            <span className="text-[#ef4444] font-bold">{ioFeedCount} IO RELEVANT</span>
          )}
        </div>
      </div>

      {/* Alert summary */}
      {unackedAlerts > 0 && (
        <div className="mx-3 mt-2 p-2 border border-[#ef4444] bg-[#ef444415] rounded text-xs">
          <div className="flex items-center gap-2">
            <span className="status-dot danger" />
            <span className="text-[#ef4444] font-bold">{unackedAlerts} ACTIVE ALERTS</span>
          </div>
          {anomalyCount > 0 && (
            <div className="text-[#94a3b8] mt-1 text-[10px]">{anomalyCount} anomalies detected</div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto mt-2">
        {modules.map((mod) => {
          const isActive = activeModule === mod.id;
          const badge = mod.id === "sensor-fusion" && ioFeedCount > 0 ? ioFeedCount : null;
          return (
            <button
              key={mod.id}
              onClick={() => setActiveModule(mod.id)}
              className={cn(
                "w-full text-left p-3 rounded transition-all group",
                isActive
                  ? "bg-[#1e3a5f] border border-[#00d4ff] glow-accent"
                  : "hover:bg-[#0f1829] border border-transparent hover:border-[#1e3a5f]"
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn("text-lg", isActive ? "text-[#00d4ff]" : "text-[#334155] group-hover:text-[#0891b2]")}>
                  {mod.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className={cn("text-xs font-bold tracking-wider", isActive ? "text-[#00d4ff]" : "text-[#94a3b8] group-hover:text-[#e2e8f0]")}>
                    {mod.label}
                  </div>
                  <div className="text-[10px] text-[#475569] group-hover:text-[#64748b]">{mod.subtitle}</div>
                </div>
                {badge !== null && (
                  <span className="flex-shrink-0 px-1.5 py-0.5 bg-[#ef4444] text-white text-[9px] font-black rounded-full">
                    {badge}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* System status */}
      <div className="p-3 border-t border-[#1e3a5f] space-y-2">
        <StatusRow label="SYSTEM" value="ONLINE" color="green" />
        {/* IO PLANNING TOOL — not an autonomous AI decision-maker */}
        <StatusRow label="IO PLNG TOOL" value="READY" color="green" />
        <StatusRow
          label="LIVE FEEDS"
          value={liveFeedsLoading ? "FETCHING" : "LIVE"}
          color={liveFeedsLoading ? "yellow" : "green"}
          pulse={liveFeedsLoading}
        />
        <StatusRow
          label="OSINT FRESHNESS"
          value={
            liveFeedsLoading ? "UPDATING" :
            feedStale ? "STALE >30m" :
            feedAgeMins === null ? "NO DATA" :
            feedAgeMins < 1 ? "< 1m" : `${feedAgeMins}m`
          }
          color={feedStale ? "red" : feedAgeMins === null ? "yellow" : "green"}
          pulse={feedStale}
        />
        <StatusRow label="HUMAN REVIEW" value="REQUIRED" color="yellow" />
        <div className="text-[#475569] text-[10px] font-mono mt-2 text-center">
          {formatDTG()}
        </div>
      </div>
    </aside>
  );
}

function StatusRow({
  label,
  value,
  color,
  pulse = false,
}: {
  label: string;
  value: string;
  color: "green" | "yellow" | "red";
  pulse?: boolean;
}) {
  const colors = {
    green: "text-[#10b981]",
    yellow: "text-[#f59e0b]",
    red: "text-[#ef4444]",
  };
  const dotClass = {
    green: "active",
    yellow: "warning",
    red: "danger",
  };

  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="text-[#475569] tracking-wider">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className={`status-dot ${dotClass[color]} ${pulse ? "pulse-alert" : ""}`} />
        <span className={cn("font-bold", colors[color])}>{value}</span>
      </div>
    </div>
  );
}
