# Scope — real threat-entity tracking (review finding #2)

Status: **proposed, not built.** Findings #1, #3, #5 and #6 are done (`a3e29d2`).

## The problem

The module is called THREAT ENTITY TRACKING but nothing is tracked. Entity
identity is the array index of the model's output:

```ts
// store/ie-store.ts
id: `TE-${gcc}-${i + 1}`
```

Across two assessments the same actor can get a different ID, and two different
actors can hold the same ID. There is no identity resolution, no dedup, and no
link between one run and the next. Each run is an independent list.

So the questions the name implies cannot be answered:

- Is APT41 escalating, or has it been CRITICAL for three weeks?
- When did this actor first appear in the INDOPACOM picture?
- Which entities dropped out of the assessment, and when?
- Is the model's confidence in this actor stable or drifting?

## Why it is feasible now

Until recently every assessment was discarded. As of `793d5ea` / `d37a446`,
each generated product is archived immutably, one row per
`(gcc, product, day, slot)`, with the full assessment JSON in
`ie_snapshot.payload`. The substrate exists — **every threat entity the system
has ever reported is already stored**, just not linked across rows.

Nothing below requires re-running any assessment. It is all derivable from the
archive going forward, and the archive is accumulating at 24 rows/run.

## Proposed work

### 1. Stable identity

Derive a durable key per entity rather than using position in an array.

- **Primary:** a canonical ID parsed out of `sourceUrl` where the source is a
  registry — MITRE ATT&CK group IDs (`/groups/G0096/`), CISA advisory IDs
  (`aa24-038a`). These are stable, external, and unambiguous.
- **Fallback:** normalised `designation` — case-folded, punctuation stripped,
  and split on the `/` and parenthetical forms the model uses
  (`"APT41 / BARIUM (PRC MSS)"` → `apt41`, `barium`). Match on any alias
  overlapping a previously-seen alias set.
- **Never:** fuzzy string distance. A false merge silently fabricates a history
  for the wrong actor, which is worse than showing two separate entities.

Unresolved entities get a new identity and are shown as first-seen, not
force-merged.

**Risk:** the model's phrasing of a designation drifts between runs. Mitigation
is the alias-set union — once `apt41` and `barium` are linked, either matches.
This should be measured against the archive before being trusted, not assumed.

### 2. Entity table

A second table keyed on the derived identity, rebuilt from snapshots:

```sql
CREATE TABLE ie_entity (
  entity_key   TEXT PRIMARY KEY,   -- mitre:G0096 | cisa:aa24-038a | name:apt41
  gcc          TEXT NOT NULL,
  designation  TEXT NOT NULL,      -- most recent
  aliases      TEXT[] NOT NULL,
  first_seen   TIMESTAMPTZ NOT NULL,
  last_seen    TIMESTAMPTZ NOT NULL,  -- a real one: last snapshot containing it
  appearances  INTEGER NOT NULL,
  ...
);
```

Note `last_seen` here **is** meaningful, unlike the field removed in #3 — it is
"last assessment in which this entity appeared", which is a fact the system
actually knows.

### 3. Per-entity history

One row per (entity, snapshot) recording `threat`, `confidence`, `location`,
`activity`. This is what makes escalation visible:

- threat-level transitions with dates (`MEDIUM → HIGH on 2026-08-14`)
- confidence trend
- appearance/disappearance streaks

### 4. Backfill

A script that walks existing `ie_snapshot.payload` rows and populates both
tables, so the feature works on day one with whatever history exists rather
than starting empty.

### 5. UI

- **Overlay:** FIRST SEEN, APPEARANCES, and a threat-level sparkline per row.
- **Entity detail:** timeline of threat/confidence changes with the source link
  for each appearance.
- **New/departed:** what entered or left the picture since the last run — likely
  the single most useful output for a watch analyst.

## Deliberately out of scope

- **Correlating entities to live OSINT, AIS, or ADS-B.** This is where a threat
  entity table starts becoming a tracking system for real forces, and it is the
  boundary the military-library HANDOFF draws. Entity history over our own
  reported assessments is a record of what *this tool* claimed. Joining it to
  live position feeds is a different system with a different risk profile.
- **Cross-CCMD merging.** The same actor appears in several AORs; merging them
  into one global entity is a modelling question that should be decided
  separately.
- **Automated severity escalation or alerting.** Show the trend; let the analyst
  judge.

## Estimate

| Piece | Rough size |
|---|---|
| Identity derivation + tests against the archive | half a day |
| Schema + rollup writes | half a day |
| Backfill script | 2–3 hours |
| UI (overlay columns, detail, new/departed) | 1 day |

Roughly **2.5 days**, and the identity work should be validated against real
archived payloads before the rest is built on top of it — if identity resolution
is unreliable, everything downstream inherits the error.

## Prerequisite

Meaningful output needs history. At 3 runs/day the archive is usable for
appearance/disappearance within a week and for threat-level trends within two
to three. Building it earlier is fine; expect it to look empty at first, and
keep the honest empty state rather than padding it.
