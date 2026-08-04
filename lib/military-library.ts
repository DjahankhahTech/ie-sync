/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MILITARY LIBRARY — catalogued research corpus (military-library)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Reference layer over the offline UNCLASSIFIED/public-only research library
 * kept at /Volumes/X10/military-library. Regenerate the backing data with:
 *
 *   node scripts/sync-military-library.mjs
 *
 * What is and is not here:
 *   - IN:  provenance metadata for every catalogued document (title, author,
 *          date, component, licence, SHA-256, public URL where one exists).
 *   - OUT: the PDFs themselves (~727 MB on the drive) and the library's local
 *          RAG index (qwen3-embedding vectors needing a local Ollama). Neither
 *          is deployable, so this app cites the corpus rather than serving it.
 *
 * The library is a literature/doctrine research corpus. Presence of a document
 * here is not endorsement, validation, or evidence of operational
 * effectiveness — it is material for grounding and citation.
 */

import raw from "./military-library.generated.json";

// ── Model ────────────────────────────────────────────────────────────────────

/**
 * How reachable a catalogued document is from the deployed app:
 *   public      — held on the drive AND has a verifiable public URL. Linkable.
 *   local-only  — held on the drive, catalogued with a `local://` reference.
 *                 Citable by title/author/date, but there is no link to give.
 *   stub        — catalogued as wanted, acquisition failed. NOT held.
 */
export type LibraryAccess = "public" | "local-only" | "stub";

export interface LibrarySource {
  id: string;
  title: string;
  author: string;
  /** Publication date as catalogued — may be a year, or an ISO date. */
  date: string;
  component: ComponentId;
  access: LibraryAccess;
  /** Verifiable public URL, or null when the catalog holds no public URL. */
  url: string | null;
  license: string;
  sha256: string;
  bytes: number | null;
  format: "pdf" | "md";
  notes: string;
}

export interface LibraryComponent {
  id: ComponentId;
  /** Component primer from the library — scope of the research area. */
  primer: string;
  total: number;
  public: number;
  localOnly: number;
  stub: number;
}

export type ComponentId = string;

interface GeneratedCatalog {
  library: string;
  libraryRoot: string;
  catalogRows: number;
  counts: {
    sources: number;
    public: number;
    localOnly: number;
    stub: number;
    primers: number;
    components: number;
  };
  components: LibraryComponent[];
  sources: LibrarySource[];
}

const catalog = raw as unknown as GeneratedCatalog;

export const LIBRARY_SOURCES: LibrarySource[] = catalog.sources;
export const LIBRARY_COMPONENTS: LibraryComponent[] = catalog.components;
export const LIBRARY_COUNTS = catalog.counts;
export const LIBRARY_ROOT = catalog.libraryRoot;

// ── Component labels ─────────────────────────────────────────────────────────

/** Human-readable component names, per the library's own scope table. */
export const COMPONENT_LABELS: Record<string, string> = {
  "strategy-deterrence": "Strategy & Deterrence",
  "joint-multidomain-operations": "Joint / Multidomain Operations",
  "command-control-decision": "Command, Control & Decision",
  "intelligence-surveillance-reconnaissance": "Intelligence, Surveillance & Reconnaissance",
  "cyber-electromagnetic-spectrum": "Cyber & Electromagnetic Spectrum",
  "autonomy-ai-uncrewed-systems": "Autonomy, AI & Uncrewed Systems",
  "air-power-missile-defense": "Air Power & Missile Defense",
  "maritime-littoral-warfare": "Maritime & Littoral Warfare",
  "land-urban-operations": "Land & Urban Operations",
  "space-enabled-operations": "Space-Enabled Operations",
  "information-influence-resilience": "Information, Influence & Resilience",
  "law-civilian-protection": "Law & Civilian Protection",
  "lessons-modern-conflicts": "Lessons — Modern Conflicts",
  "doctrine-joint-logistics": "Joint Logistics Doctrine",
  "sealift-surface": "Sealift & Surface Movement",
  "airlift-air-mobility": "Airlift & Air Mobility",
  "prepositioning-stocks": "Prepositioning & Stocks",
  "fuel-bulk-petroleum": "Fuel & Bulk Petroleum",
  "munitions-distribution": "Munitions Distribution",
  "ports-terminals-seabasing": "Ports, Terminals & Seabasing",
  "inland-distribution": "Inland Distribution",
  "contested-a2ad-threats": "Contested / A2AD Threats",
  "cyber-logistics-resilience": "Cyber-Logistics Resilience",
  "industrial-base-surge": "Industrial Base & Surge",
};

export function componentLabel(id: string): string {
  return COMPONENT_LABELS[id] ?? id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Components that bear on Operations in the Information Environment. Used to
 * scope the doctrine block injected into AI planning prompts — the logistics
 * and platform components stay in the browsable library but are not worth the
 * prompt tokens on an OIE assessment.
 */
export const OIE_COMPONENTS: ComponentId[] = [
  "information-influence-resilience",
  "command-control-decision",
  "cyber-electromagnetic-spectrum",
  "intelligence-surveillance-reconnaissance",
  "strategy-deterrence",
  "joint-multidomain-operations",
  "lessons-modern-conflicts",
  "law-civilian-protection",
  "space-enabled-operations",
];

// ── Query ────────────────────────────────────────────────────────────────────

export interface LibraryQuery {
  /** Free-text match over title, author, component label, and notes. */
  q?: string;
  component?: ComponentId;
  access?: LibraryAccess;
  limit?: number;
}

/** Year from a catalogued date, or null when it isn't parseable. */
export function sourceYear(s: LibrarySource): number | null {
  const m = /(\d{4})/.exec(s.date);
  if (!m) return null;
  const y = Number(m[1]);
  return y >= 1900 && y <= 2100 ? y : null;
}

/** True only when the catalog marks the source public and holds an http(s) URL. */
export function isPublicLinkable(s: LibrarySource): boolean {
  return (
    s.access === "public" &&
    typeof s.url === "string" &&
    /^https?:\/\//i.test(s.url.trim())
  );
}

/** Public, linkable sources only — what the Doctrine UI may list. */
export function publicSources(query: Omit<LibraryQuery, "access"> = {}): LibrarySource[] {
  return searchLibrary({ ...query, access: "public" }).filter(isPublicLinkable);
}

export function searchLibrary(query: LibraryQuery = {}): LibrarySource[] {
  const { q, component, access, limit } = query;
  const terms = (q ?? "")
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

  let out = LIBRARY_SOURCES.filter((s) => {
    if (component && s.component !== component) return false;
    if (access && s.access !== access) return false;
    if (terms.length === 0) return true;
    const haystack = `${s.title} ${s.author} ${componentLabel(s.component)} ${s.notes} ${s.date}`.toLowerCase();
    return terms.every((t) => haystack.includes(t));
  });

  // Newest first, then title — a research bibliography reads by recency.
  out = out.sort((a, b) => (sourceYear(b) ?? 0) - (sourceYear(a) ?? 0) || a.title.localeCompare(b.title));
  return typeof limit === "number" ? out.slice(0, limit) : out;
}

// ── Doctrine block for AI grounding ──────────────────────────────────────────

/**
 * Compact, deterministic doctrine reference block for injection into AI system
 * prompts. Linkable sources carry their URL so the model can cite them
 * verbatim; local-only sources are offered as reference-by-citation with an
 * explicit "no public URL" marker so the model never invents one.
 *
 * Built once at module load and byte-stable across syncs, so the system prompts
 * that embed it stay prompt-cacheable.
 */
function buildDoctrineBlock(components: ComponentId[], perComponent: number): string {
  const sections: string[] = [];

  for (const component of components) {
    // UI and prompts only cite public http(s) links — never offline/stub entries.
    const own = LIBRARY_SOURCES.filter(
      (s) => s.component === component && isPublicLinkable(s)
    );
    if (own.length === 0) continue;

    const ranked = [...own].sort(
      (a, b) =>
        (sourceYear(b) ?? 0) - (sourceYear(a) ?? 0) || a.title.localeCompare(b.title)
    );

    const lines = ranked.slice(0, perComponent).map((s) => {
      const year = sourceYear(s) ?? s.date;
      return `- ${s.title} — ${s.author}, ${year} | ${s.url}`;
    });

    const omitted = ranked.length - lines.length;
    if (omitted > 0) lines.push(`- (+${omitted} further public sources in this component)`);

    sections.push(`${componentLabel(component)}:\n${lines.join("\n")}`);
  }

  return sections.join("\n\n");
}

const DOCTRINE_BLOCK = buildDoctrineBlock(OIE_COMPONENTS, 8);

const PUBLIC_LINKABLE_COUNT = LIBRARY_SOURCES.filter(isPublicLinkable).length;

/**
 * Doctrine-library section to append to an AI system prompt. Stable string —
 * safe to place ahead of a `cache_control` breakpoint.
 * Only public documents with verifiable http(s) URLs are listed.
 */
export const DOCTRINE_LIBRARY_PROMPT = `
REFERENCE LIBRARY — public research literature with verifiable URLs only (${PUBLIC_LINKABLE_COUNT} linkable documents). Use it to ground doctrinal framing and to cite real literature.

Rules for using this library:
- When an assessment rests on doctrine or published research, cite an entry from this list by its exact title, author, and the URL shown.
- Only use a URL that appears verbatim below. Do not invent links. Do not cite offline or non-public holdings.
- This library is public research literature, not intelligence. Presence here is not validation of operational effectiveness. It does not substitute for the supplied OSINT as the evidence base for current events.
- Do not cite an entry that is not listed below.

${DOCTRINE_BLOCK}
`.trim();
