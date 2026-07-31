#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// military-library → IE-SYNC catalog sync
// ─────────────────────────────────────────────────────────────────────────────
//
// Reads the offline research library at /Volumes/X10/military-library and emits
// a committed data file the deployed app can serve.
//
// Why only the catalog: the library's sources/ tree is ~727 MB of PDFs and its
// RAG index (index/embeddings.f32) is 1024-dim qwen3-embedding vectors that
// require a local Ollama at query time. Neither can run on Vercel. The catalog
// is 184 rows of provenance metadata — titles, authors, dates, components,
// licences, SHA-256 hashes, and public URLs where one exists — which is the
// part a hosted planning tool can actually cite.
//
//   node scripts/sync-military-library.mjs [--root <path>] [--check]
//
//   --check   verify the committed file is current without writing (CI use)
//
// Access classification, from the catalog row's own file path + url:
//   public      sources/*.pdf with an https URL  → linkable and citable
//   local-only  sources/*.pdf with a local:// URL → held on the drive only
//   stub        corpus/*.md placeholder          → catalogued, NOT acquired
// Component primers (corpus/<component>/_primer.md) become component
// descriptions rather than sources.

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");
const OUT_FILE = join(REPO_ROOT, "lib", "military-library.generated.json");

const DEFAULT_ROOT = process.env.MILITARY_LIBRARY_ROOT ?? "/Volumes/X10/military-library";

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const rootIdx = args.indexOf("--root");
const LIBRARY_ROOT = rootIdx >= 0 ? args[rootIdx + 1] : DEFAULT_ROOT;

const REQUIRED_FIELDS = ["id", "title", "author", "date", "url", "license", "component", "sha256", "file"];

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

if (!existsSync(LIBRARY_ROOT)) {
  fail(
    `library not found at ${LIBRARY_ROOT}\n` +
      `  Mount the X10 drive, or pass --root <path> / set MILITARY_LIBRARY_ROOT.\n` +
      `  The committed catalog at lib/military-library.generated.json is unchanged.`
  );
}

const catalogPath = join(LIBRARY_ROOT, "catalog.jsonl");
if (!existsSync(catalogPath)) fail(`no catalog.jsonl under ${LIBRARY_ROOT}`);

// ── Parse catalog.jsonl ──────────────────────────────────────────────────────

const rows = [];
const skipped = [];
readFileSync(catalogPath, "utf8")
  .split("\n")
  .forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let row;
    try {
      row = JSON.parse(trimmed);
    } catch {
      skipped.push(`line ${i + 1}: unparseable JSON`);
      return;
    }
    const missing = REQUIRED_FIELDS.filter((f) => row[f] === undefined || row[f] === null || row[f] === "");
    if (missing.length) {
      skipped.push(`line ${i + 1} (${row.id ?? "no id"}): missing ${missing.join(", ")}`);
      return;
    }
    rows.push(row);
  });

if (rows.length === 0) fail("catalog.jsonl produced zero valid rows");

// ── Component primers ────────────────────────────────────────────────────────

// The primer's trailing disclaimer paragraph is library-internal RAG scaffolding;
// keep only the substantive body.
function primerBody(md) {
  const paras = md
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((p) => !p.startsWith("#"))
    .filter((p) => !/^This primer is UNCLASSIFIED instructional text/i.test(p));
  return paras.join(" ");
}

const primers = new Map();
const corpusDir = join(LIBRARY_ROOT, "corpus");
if (existsSync(corpusDir)) {
  for (const component of readdirSync(corpusDir)) {
    const p = join(corpusDir, component, "_primer.md");
    if (existsSync(p)) primers.set(component, primerBody(readFileSync(p, "utf8")));
  }
}

// ── Classify + normalise ─────────────────────────────────────────────────────

function classify(row) {
  const file = String(row.file);
  const url = String(row.url);
  const isPublicUrl = /^https?:\/\//i.test(url);

  if (file.startsWith("corpus/")) {
    // Primers are component descriptions, not sources.
    if (file.endsWith("_primer.md")) return { kind: "primer" };
    // A corpus stub means the fetch failed — the document is NOT held locally.
    return { kind: "source", access: "stub" };
  }
  return { kind: "source", access: isPublicUrl ? "public" : "local-only" };
}

const sources = [];
const componentIds = new Set();
let primerRows = 0;

for (const row of rows) {
  componentIds.add(row.component);
  const c = classify(row);
  if (c.kind === "primer") {
    primerRows++;
    // Prefer the on-disk primer text; fall back to nothing (label supplies context).
    if (!primers.has(row.component)) primers.set(row.component, "");
    continue;
  }
  const isPublicUrl = /^https?:\/\//i.test(String(row.url));
  sources.push({
    id: String(row.id),
    title: String(row.title),
    author: String(row.author),
    date: String(row.date),
    component: String(row.component),
    access: c.access,
    // Never emit a local:// pseudo-URL as if it were a citable link.
    url: isPublicUrl ? String(row.url) : null,
    license: String(row.license),
    sha256: String(row.sha256),
    bytes: Number.isFinite(row.bytes) ? Number(row.bytes) : null,
    format: String(row.file).endsWith(".pdf") ? "pdf" : "md",
    notes: row.notes ? String(row.notes) : "",
  });
}

// Deterministic order — the generated file feeds a cached AI system prompt, so
// byte stability across syncs matters for prompt-cache hits.
sources.sort((a, b) => a.component.localeCompare(b.component) || a.id.localeCompare(b.id));

const duplicates = sources.map((s) => s.id).filter((id, i, arr) => arr.indexOf(id) !== i);
if (duplicates.length) fail(`duplicate catalog ids: ${[...new Set(duplicates)].join(", ")}`);

const components = [...componentIds].sort().map((id) => {
  const own = sources.filter((s) => s.component === id);
  return {
    id,
    primer: primers.get(id) ?? "",
    total: own.length,
    public: own.filter((s) => s.access === "public").length,
    localOnly: own.filter((s) => s.access === "local-only").length,
    stub: own.filter((s) => s.access === "stub").length,
  };
});

const payload = {
  library: "military-library",
  libraryRoot: LIBRARY_ROOT,
  catalogRows: rows.length,
  counts: {
    sources: sources.length,
    public: sources.filter((s) => s.access === "public").length,
    localOnly: sources.filter((s) => s.access === "local-only").length,
    stub: sources.filter((s) => s.access === "stub").length,
    primers: primerRows,
    components: components.length,
  },
  components,
  sources,
};

// ── Write / check ────────────────────────────────────────────────────────────

// syncedAt is deliberately excluded from the payload: a changing timestamp would
// make --check always fail and would churn the committed file on every run.
const serialized = JSON.stringify(payload, null, 2) + "\n";

if (checkOnly) {
  const current = existsSync(OUT_FILE) ? readFileSync(OUT_FILE, "utf8") : "";
  if (current !== serialized) {
    fail("lib/military-library.generated.json is out of date — run: node scripts/sync-military-library.mjs");
  }
  console.log(`✓ catalog up to date (${payload.counts.sources} sources, ${payload.counts.components} components)`);
  process.exit(0);
}

writeFileSync(OUT_FILE, serialized);

console.log(`✓ synced ${LIBRARY_ROOT} → lib/military-library.generated.json`);
console.log(
  `  ${payload.counts.sources} sources across ${payload.counts.components} components: ` +
    `${payload.counts.public} public/linkable, ${payload.counts.localOnly} local-only, ${payload.counts.stub} stub`
);
console.log(`  ${payload.counts.primers} component primers`);
if (skipped.length) {
  console.warn(`  ⚠ ${skipped.length} catalog row(s) skipped:`);
  for (const s of skipped.slice(0, 10)) console.warn(`     - ${s}`);
}
if (payload.counts.localOnly > 0) {
  console.log(
    `  note: ${payload.counts.localOnly} catalogued documents have no public URL (local:// in the catalog).\n` +
      `        They are listed as reference-only in the app — the PDFs stay on the drive.`
  );
}
