"use client";

import { useState, useEffect } from "react";
import { JOURNALS, RESEARCH_ORGS, CONFERENCES, TRAINING, type STLink } from "@/lib/st-resources";
import { GlossaryPanel } from "@/components/ui/GlossaryPanel";

interface STItem { title: string; summary: string; link: string; source: string; published: string }

// Science & Technology (S&T) tab — latest research/white papers + curated
// journals, research organizations, and conferences relevant to IO officers.
export function STTab() {
  const [items, setItems] = useState<STItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const r = await fetch("/api/st-feed");
        const j = await r.json();
        if (!cancelled) { if (j.items) setItems(j.items); else setError("No feed items."); }
      } catch { if (!cancelled) setError("S&T feed unreachable."); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const timeAgo = (p: string) => {
    const t = Date.parse(p); if (!t) return "";
    const m = Math.floor((Date.now() - t) / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div className="p-4 overflow-y-auto h-full space-y-4">
      <div>
        <div className="text-[#00d4ff] text-sm font-black tracking-widest">S&amp;T RESOURCES — IO PLANNER &amp; OFFICER LIBRARY</div>
        <div className="text-[#475569] text-xs font-mono">Latest research &amp; white papers, plus curated journals, research orgs, conferences, and training opportunities for OIE planners and officers.</div>
      </div>

      {/* Latest research / white papers (live) */}
      <div className="tactical-card">
        <div className="px-4 py-3 border-b border-[#1e3a5f] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`status-dot ${loading ? "warning pulse-alert" : "active"}`} />
            <div className="text-[#00d4ff] text-xs font-bold tracking-widest">LATEST RESEARCH &amp; WHITE PAPERS</div>
          </div>
          <span className="text-[#475569] text-[10px] font-mono">{loading ? "loading…" : `${items.length} items`}</span>
        </div>
        {error && <div className="px-4 py-3 text-[#ef4444] text-[11px] font-mono">✗ {error}</div>}
        <div className="divide-y divide-[#1e3a5f] max-h-[340px] overflow-y-auto">
          {items.map((it, i) => (
            <a key={i} href={it.link} target="_blank" rel="noopener noreferrer" className="block px-4 py-2.5 hover:bg-[#162035] transition-colors group">
              <div className="flex items-start justify-between gap-3">
                <div className="text-[#e2e8f0] text-[12px] group-hover:text-[#00d4ff] transition-colors">{it.title}</div>
                <span className="text-[#475569] text-[9px] font-mono flex-shrink-0 whitespace-nowrap">{timeAgo(it.published)}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[#0891b2] text-[10px] font-mono">{it.source}</span>
                <span className="text-[#334155]">·</span>
                <span className="text-[#475569] text-[10px] truncate">{it.summary.slice(0, 120)}</span>
              </div>
            </a>
          ))}
          {!loading && items.length === 0 && !error && (
            <div className="px-4 py-6 text-center text-[#475569] text-xs">No research items returned right now.</div>
          )}
        </div>
      </div>

      {/* Curated resource columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <LinkColumn title="JOURNALS &amp; PUBLICATIONS" links={JOURNALS} color="#00d4ff" />
        <LinkColumn title="RESEARCH ORGANIZATIONS" links={RESEARCH_ORGS} color="#22d3ee" />
        <LinkColumn title="CONFERENCES &amp; SYMPOSIA" links={CONFERENCES} color="#f59e0b" />
        <LinkColumn title="TRAINING OPPORTUNITIES" links={TRAINING} color="#34d399" />
      </div>

      <GlossaryPanel module="running-estimate" />
    </div>
  );
}

function LinkColumn({ title, links, color }: { title: string; links: STLink[]; color: string }) {
  return (
    <div className="tactical-card p-3">
      <div className="text-xs font-bold tracking-widest mb-2" style={{ color }}>{title}</div>
      <div className="space-y-2">
        {links.map((l) => (
          <a key={l.name} href={l.url} target="_blank" rel="noopener noreferrer" className="block p-2 border border-[#1e3a5f] rounded bg-[#070d1a] hover:border-[#0891b2] transition-colors group">
            <div className="text-[11px] font-bold text-[#e2e8f0] group-hover:text-[#00d4ff]">{l.name} ↗</div>
            {l.date && (
              <div className="mt-1 inline-flex items-center gap-1 text-[9px] font-mono text-[#f59e0b] border border-[#f59e0b40] rounded px-1.5 py-0.5">
                🗓 {l.date}
              </div>
            )}
            <div className="text-[10px] text-[#94a3b8] mt-0.5">{l.note}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
