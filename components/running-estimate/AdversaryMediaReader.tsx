"use client";

import { useEffect, useState } from "react";
import { useIEStore } from "@/store/ie-store";
import { SPONSOR_META, type SponsorId } from "@/lib/adversary-media-config";
import type { AdversaryMediaItem } from "@/app/api/adversary-media/route";

interface FeedPayload {
  provenance: string;
  fetchedAt: string;
  outlets: Array<{ id: string; name: string; sponsor: SponsorId; sponsorLabel: string; count: number }>;
  items: AdversaryMediaItem[];
  error?: string;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "undated";
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

/**
 * What anti-US audiences in this theater are reading — a live, labeled feed of
 * the adversary state-controlled outlets monitored for the selected AOR.
 */
export function AdversaryMediaReader() {
  const { activeGCC } = useIEStore();
  const [data, setData] = useState<FeedPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sponsorFilter, setSponsorFilter] = useState<SponsorId | "ALL">("ALL");
  const [shown, setShown] = useState(25);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    setLoading(true);
    setSponsorFilter("ALL");
    setShown(25);
    fetch(`/api/adversary-media?gcc=${activeGCC}`)
      .then((r) => r.json())
      .then((d: FeedPayload) => {
        if (cancelled) return;
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch((e) => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeGCC]);

  const sponsors = Array.from(new Set((data?.outlets ?? []).map((o) => o.sponsor))) as SponsorId[];
  const items = (data?.items ?? []).filter((i) => sponsorFilter === "ALL" || i.sponsor === sponsorFilter);

  return (
    <div className="panel border-[var(--danger)]/40">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="panel-title">What anti-US audiences are reading — live</h2>
          <p className="text-[14px] text-muted m-0 mt-1 max-w-3xl">
            The state-controlled and state-aligned outlets monitored for this theater, newest
            first. This is the narrative space an anti-American reader actually sees — surfaced
            for awareness, <strong className="text-[var(--warning)]">not factual reporting and not endorsement</strong>.
            Links open the outlet itself; follow your unit&apos;s browsing policy.
          </p>
        </div>
        {data && (
          <span className="text-[12px] text-muted whitespace-nowrap">
            refreshed {timeAgo(data.fetchedAt)} · updates ~15 min
          </span>
        )}
      </div>

      {/* Sponsor filter + outlet roster */}
      {data && (
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <button type="button" className={`chip ${sponsorFilter === "ALL" ? "chip-active" : ""}`} onClick={() => setSponsorFilter("ALL")}>
            All <span className="chip-count">{data.items.length}</span>
          </button>
          {sponsors.map((s) => (
            <button key={s} type="button" className={`chip ${sponsorFilter === s ? "chip-active" : ""}`} onClick={() => setSponsorFilter(s)}>
              <span style={{ color: SPONSOR_META[s].color }}>●</span> {SPONSOR_META[s].label}
              <span className="chip-count">{data.items.filter((i) => i.sponsor === s).length}</span>
            </button>
          ))}
          <span className="text-[12px] text-muted ml-auto">
            {data.outlets.map((o) => `${o.name} ${o.count}`).join(" · ")}
          </span>
        </div>
      )}

      {loading && <div className="notice notice-info mt-3">Loading the theater&apos;s adversary media feed…</div>}
      {error && <div className="notice notice-danger mt-3">✗ Could not load adversary media: {error}</div>}
      {data && items.length === 0 && !loading && (
        <div className="notice notice-warn mt-3">
          No items ingested right now — outlets may be blocking or quiet. IE-SYNC never fabricates
          content; retry later or switch theaters.
        </div>
      )}

      {/* Article list */}
      <div className="mt-3 space-y-2">
        {items.slice(0, shown).map((it) => (
          <a
            key={it.id}
            href={it.link}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="block rounded border border-[var(--border)] bg-[#0b1322] px-3 py-2.5 hover:border-[var(--accent-dim)] transition-colors"
          >
            <div className="flex items-center gap-2 flex-wrap text-[12px]">
              <span
                className="font-bold px-1.5 py-0.5 rounded border"
                style={{ color: SPONSOR_META[it.sponsor].color, borderColor: `${SPONSOR_META[it.sponsor].color}60` }}
              >
                {it.outlet}
              </span>
              <span className="text-muted">{it.sponsorLabel}</span>
              <span className="text-muted ml-auto">{timeAgo(it.published)}</span>
            </div>
            <div className="text-[15px] font-semibold mt-1 leading-snug">{it.title}</div>
            {it.summary && <div className="text-[13px] text-muted mt-0.5 leading-relaxed">{it.summary}</div>}
          </a>
        ))}
      </div>

      {items.length > shown && (
        <button type="button" className="btn mt-3" onClick={() => setShown((n) => n + 25)}>
          Show more ({items.length - shown} remaining)
        </button>
      )}
    </div>
  );
}
