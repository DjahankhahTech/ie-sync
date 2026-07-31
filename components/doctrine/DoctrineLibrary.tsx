"use client";

import { useMemo, useState } from "react";
import {
  LIBRARY_COMPONENTS,
  LIBRARY_COUNTS,
  OIE_COMPONENTS,
  componentLabel,
  searchLibrary,
  sourceYear,
  type LibraryAccess,
  type LibrarySource,
} from "@/lib/military-library";
import { GlossaryPanel } from "@/components/ui/GlossaryPanel";
import { cn } from "@/lib/utils";

// Doctrine & research library — browsable view of the catalogued
// military-library corpus that grounds the AI planning products.
//
// The catalog is a committed build artifact, so filtering is entirely
// client-side (no fetch, no loading state). The corresponding PDFs stay on the
// offline library drive: entries with a public URL link out, and entries
// catalogued without one are marked reference-only rather than given a
// fabricated link.

const ACCESS_META: Record<LibraryAccess, { label: string; color: string; hint: string }> = {
  public: {
    label: "PUBLIC",
    color: "#34d399",
    hint: "Held in the library with a verifiable public URL — opens the original document.",
  },
  "local-only": {
    label: "OFFLINE",
    color: "#f59e0b",
    hint: "Held on the library drive, catalogued without a public URL — cite by title and author.",
  },
  stub: {
    label: "NOT HELD",
    color: "#64748b",
    hint: "Catalogued as wanted; automated acquisition failed. The document is not in the corpus.",
  },
};

export function DoctrineLibrary() {
  const [q, setQ] = useState("");
  const [component, setComponent] = useState<string | null>(null);
  const [access, setAccess] = useState<LibraryAccess | null>(null);

  // OIE-relevant components first — they are what the planning products cite.
  const orderedComponents = useMemo(() => {
    const rank = (id: string) => {
      const i = OIE_COMPONENTS.indexOf(id);
      return i === -1 ? OIE_COMPONENTS.length : i;
    };
    return [...LIBRARY_COMPONENTS].sort(
      (a, b) => rank(a.id) - rank(b.id) || componentLabel(a.id).localeCompare(componentLabel(b.id))
    );
  }, []);

  const results = useMemo(
    () => searchLibrary({ q, component: component ?? undefined, access: access ?? undefined, limit: 400 }),
    [q, component, access]
  );

  const activePrimer = component ? LIBRARY_COMPONENTS.find((c) => c.id === component)?.primer : null;

  return (
    <div className="p-4 overflow-y-auto h-full space-y-4">
      <div>
        <div className="text-[#00d4ff] text-sm font-black tracking-widest">
          DOCTRINE &amp; RESEARCH LIBRARY — military-library
        </div>
        <div className="text-[#475569] text-xs font-mono">
          {LIBRARY_COUNTS.sources} catalogued documents across {LIBRARY_COUNTS.components} research components.
          This corpus grounds the doctrinal citations in the Running Estimate, IO Planner, and SIGMAN products.
        </div>
      </div>

      {/* Provenance / boundary notice — the library is research literature, not intelligence. */}
      <div className="tactical-card px-4 py-2.5 border-l-2 border-l-[#f59e0b]">
        <div className="text-[#f59e0b] text-[10px] font-bold tracking-widest">
          UNCLASSIFIED // PUBLIC RESEARCH LITERATURE
        </div>
        <div className="text-[#94a3b8] text-[11px] mt-1 leading-relaxed">
          Presence in this library is not endorsement, validation, or evidence of operational effectiveness. Treat
          published lessons as hypotheses to test, and preserve each document&apos;s date and theatre when reasoning from
          it. {LIBRARY_COUNTS.localOnly + LIBRARY_COUNTS.stub} entries have no public URL and are listed for citation
          by reference only — the source files remain on the offline library drive.
        </div>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="CATALOGUED" value={LIBRARY_COUNTS.sources} color="#00d4ff" />
        <Stat label="PUBLIC / LINKABLE" value={LIBRARY_COUNTS.public} color="#34d399" />
        <Stat label="OFFLINE ONLY" value={LIBRARY_COUNTS.localOnly} color="#f59e0b" />
        <Stat label="NOT HELD" value={LIBRARY_COUNTS.stub} color="#64748b" />
      </div>

      {/* Filters */}
      <div className="tactical-card p-3 space-y-3">
        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, author, component…"
            className="flex-1 bg-[#0b1322] border border-[#1e3a5f] rounded px-3 py-1.5 text-[12px] text-[#e2e8f0] placeholder:text-[#475569] focus:outline-none focus:border-[#0891b2]"
          />
          <div className="flex items-center gap-1.5">
            {(Object.keys(ACCESS_META) as LibraryAccess[]).map((a) => (
              <button
                key={a}
                onClick={() => setAccess(access === a ? null : a)}
                title={ACCESS_META[a].hint}
                className={cn(
                  "px-2 py-1 rounded border text-[10px] font-bold tracking-wider transition-colors",
                  access === a
                    ? "border-[#0891b2] bg-[#162035] text-[#00d4ff]"
                    : "border-[#1e3a5f] text-[#64748b] hover:text-[#94a3b8]"
                )}
              >
                {ACCESS_META[a].label}
              </button>
            ))}
            {(q || component || access) && (
              <button
                onClick={() => {
                  setQ("");
                  setComponent(null);
                  setAccess(null);
                }}
                className="px-2 py-1 rounded border border-[#1e3a5f] text-[10px] font-bold tracking-wider text-[#64748b] hover:text-[#ef4444]"
              >
                CLEAR
              </button>
            )}
          </div>
        </div>

        {/* Component chips */}
        <div className="flex flex-wrap gap-1.5">
          {orderedComponents.map((c) => {
            const isOIE = OIE_COMPONENTS.includes(c.id);
            const isActive = component === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setComponent(isActive ? null : c.id)}
                title={c.primer || undefined}
                className={cn(
                  "px-2 py-0.5 rounded border text-[10px] font-mono transition-colors",
                  isActive
                    ? "border-[#0891b2] bg-[#162035] text-[#00d4ff]"
                    : isOIE
                      ? "border-[#1e3a5f] text-[#94a3b8] hover:border-[#0891b2]"
                      : "border-[#16273d] text-[#64748b] hover:border-[#1e3a5f]"
                )}
              >
                {componentLabel(c.id)}
                <span className="text-[#475569]"> {c.total}</span>
              </button>
            );
          })}
        </div>

        {activePrimer && (
          <div className="text-[#94a3b8] text-[11px] leading-relaxed border-t border-[#1e3a5f] pt-2">
            <span className="text-[#0891b2] font-bold tracking-wider text-[10px]">COMPONENT SCOPE — </span>
            {activePrimer}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="tactical-card">
        <div className="px-4 py-3 border-b border-[#1e3a5f] flex items-center justify-between">
          <div className="text-[#00d4ff] text-xs font-bold tracking-widest">CATALOGUED SOURCES</div>
          <span className="text-[#475569] text-[10px] font-mono">
            {results.length} {results.length === 1 ? "entry" : "entries"}
          </span>
        </div>
        <div className="divide-y divide-[#1e3a5f]">
          {results.map((s) => (
            <SourceRow key={s.id} source={s} />
          ))}
          {results.length === 0 && (
            <div className="px-4 py-6 text-center text-[#475569] text-xs">
              No catalogued sources match these filters.
            </div>
          )}
        </div>
      </div>

      <div className="text-[#475569] text-[10px] font-mono">
        Catalog synced from the offline library via{" "}
        <span className="text-[#0891b2]">node scripts/sync-military-library.mjs</span>. The full PDF corpus and the
        library&apos;s local vector index are not deployed — this view is provenance metadata.
      </div>

      <GlossaryPanel module="running-estimate" />
    </div>
  );
}

function SourceRow({ source }: { source: LibrarySource }) {
  const meta = ACCESS_META[source.access];
  const year = sourceYear(source) ?? source.date;

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "text-[12px] transition-colors",
            source.url ? "text-[#e2e8f0] group-hover:text-[#00d4ff]" : "text-[#cbd5e1]"
          )}
        >
          {source.title}
        </div>
        <span
          className="px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider flex-shrink-0"
          style={{ color: meta.color, border: `1px solid ${meta.color}44` }}
          title={meta.hint}
        >
          {meta.label}
        </span>
      </div>
      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
        <span className="text-[#0891b2] text-[10px] font-mono">{source.author}</span>
        <span className="text-[#334155]">·</span>
        <span className="text-[#475569] text-[10px] font-mono">{year}</span>
        <span className="text-[#334155]">·</span>
        <span className="text-[#475569] text-[10px] font-mono">{componentLabel(source.component)}</span>
        <span className="text-[#334155]">·</span>
        <span className="text-[#475569] text-[10px] font-mono uppercase">{source.license}</span>
        {!source.url && (
          <>
            <span className="text-[#334155]">·</span>
            <span className="text-[#f59e0b] text-[10px] font-mono">no public URL — cite by reference</span>
          </>
        )}
      </div>
    </>
  );

  if (source.url) {
    return (
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block px-4 py-2.5 hover:bg-[#162035] transition-colors group"
      >
        {body}
      </a>
    );
  }
  return <div className="px-4 py-2.5">{body}</div>;
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="tactical-card px-3 py-2">
      <div className="text-[9px] font-bold tracking-widest text-[#475569]">{label}</div>
      <div className="text-xl font-black font-mono" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
