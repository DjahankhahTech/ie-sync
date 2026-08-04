"use client";

import { useMemo, useState } from "react";
import {
  LIBRARY_COMPONENTS,
  OIE_COMPONENTS,
  componentLabel,
  isPublicLinkable,
  publicSources,
  sourceYear,
  type LibrarySource,
} from "@/lib/military-library";
import { cn } from "@/lib/utils";

/**
 * Doctrine library — PUBLIC LINKS ONLY.
 * Offline, local-only, and stub catalog entries are never shown.
 */

export function DoctrineLibrary() {
  const [q, setQ] = useState("");
  const [component, setComponent] = useState<string | null>(null);

  const allPublic = useMemo(() => publicSources({ limit: 500 }), []);

  const orderedComponents = useMemo(() => {
    const withPublic = LIBRARY_COMPONENTS
      .map((c) => ({
        ...c,
        publicCount: allPublic.filter((s) => s.component === c.id).length,
      }))
      .filter((c) => c.publicCount > 0);

    const rank = (id: string) => {
      const i = OIE_COMPONENTS.indexOf(id);
      return i === -1 ? OIE_COMPONENTS.length : i;
    };
    return withPublic.sort(
      (a, b) => rank(a.id) - rank(b.id) || componentLabel(a.id).localeCompare(componentLabel(b.id))
    );
  }, [allPublic]);

  const results = useMemo(
    () =>
      publicSources({
        q,
        component: component ?? undefined,
        limit: 400,
      }),
    [q, component]
  );

  const activePrimer = component
    ? LIBRARY_COMPONENTS.find((c) => c.id === component)?.primer
    : null;

  return (
    <div className="page-scroll">
      <header className="page-header">
        <div>
          <h1 className="page-title">Public doctrine & research</h1>
          <p className="page-subtitle">
            Only documents with a verified public web link. Offline catalog holdings
            are hidden — nothing is listed without a URL you can open.
          </p>
        </div>
        <div className="stat-pill">
          <span className="stat-pill-value">{allPublic.length}</span>
          <span className="stat-pill-label">public links</span>
        </div>
      </header>

      <div className="notice notice-info">
        <strong>Public sources only.</strong> This list is open research literature,
        not classified doctrine and not intelligence. Links open the original
        publisher page. Use them to ground assessments — not as proof of operational
        fact.
      </div>

      <div className="panel space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, author, topic…"
            className="field flex-1"
            aria-label="Search public doctrine"
          />
          {(q || component) && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setComponent(null);
              }}
              className="btn btn-ghost"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {orderedComponents.map((c) => {
            const isActive = component === c.id;
            const isOIE = OIE_COMPONENTS.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setComponent(isActive ? null : c.id)}
                title={c.primer || undefined}
                className={cn("chip", isActive && "chip-active", !isActive && isOIE && "chip-emphasis")}
              >
                {componentLabel(c.id)}
                <span className="chip-count">{c.publicCount}</span>
              </button>
            );
          })}
        </div>

        {activePrimer && (
          <p className="text-body text-muted border-t border-[var(--border)] pt-3">
            <span className="label">Topic scope · </span>
            {activePrimer}
          </p>
        )}
      </div>

      <div className="panel p-0 overflow-hidden">
        <div className="panel-head">
          <h2 className="panel-title">
            {results.length} public {results.length === 1 ? "document" : "documents"}
          </h2>
        </div>
        <ul className="divide-y divide-[var(--border)]">
          {results.map((s) => (
            <SourceRow key={s.id} source={s} />
          ))}
          {results.length === 0 && (
            <li className="px-5 py-10 text-center text-muted">
              No public documents match these filters.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

function SourceRow({ source }: { source: LibrarySource }) {
  if (!isPublicLinkable(source) || !source.url) return null;
  const year = sourceYear(source) ?? source.date;

  return (
    <li>
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block px-5 py-4 hover:bg-[var(--card-hover)] transition-colors group"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)] leading-snug">
              {source.title}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-muted">
              <span className="text-[var(--accent-dim)]">{source.author}</span>
              <span aria-hidden>·</span>
              <span>{year}</span>
              <span aria-hidden>·</span>
              <span>{componentLabel(source.component)}</span>
              {source.license && (
                <>
                  <span aria-hidden>·</span>
                  <span className="uppercase tracking-wide text-[12px]">{source.license}</span>
                </>
              )}
            </div>
          </div>
          <span className="flex-shrink-0 text-[12px] font-semibold text-[var(--success)] border border-[var(--success)]/30 rounded px-2 py-0.5">
            Open ↗
          </span>
        </div>
      </a>
    </li>
  );
}
