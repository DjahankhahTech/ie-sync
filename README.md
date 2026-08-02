This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## AI engine — model and reasoning effort

Every Claude call routes its model and reasoning `effort` through `lib/ai-config.ts`.
`effort` is the main lever on how long an assessment takes, so it is tunable per
environment with no code change:

| Env var | Effect |
|---|---|
| `AI_EFFORT` | Override effort for every product |
| `AI_EFFORT_ANALYZE` / `_PLAN` / `_SIGMAN` / `_INFSUM` / `_WORKSHEET` | Override one product |
| `AI_MODEL` | Override the model (default `claude-opus-4-8`) |

Valid effort values: `low` `medium` `high` `xhigh` `max`.

Defaults: **medium** for the assessment products (Running Estimate, IO plan,
SIGMAN) and **low** for the short structured drafts (daily INFSUM, planning
worksheet). Measured on a 4-item INDOPACOM OSINT set, one full Running Estimate
end to end:

| Effort | Wall clock | Output tokens |
|---|---|---|
| `high` (previous default) | 73–79 s | 5.5–5.9 k |
| `medium` (current) | 67–72 s | 5.0–5.4 k |
| `low` | 61 s | 4.7 k |

Effort trims roughly 10–15%; the remaining time is dominated by the ~5 k tokens of
structured JSON each product emits. The products are also pre-warmed 3× daily by
`/api/infsum-cron` and server-cached, so the slow path is only a forced
regeneration (`?force=1`) or a POST from the client.

System prompts are sent as cacheable blocks, so repeat runs read the ~7 k-token
prompt prefix (doctrine library included) from cache instead of re-billing it —
`/api/analyze` reports `cache_read_input_tokens` in its `usage` for checking this.

## Assessment history (persistence)

IE-SYNC used to generate a Running Estimate three times a day per CCMD and throw
every one away — `unstable_cache` expires in six hours and is wiped on each
deploy. Nothing could be trended and no claim the tool made could be scored
against what actually happened.

`lib/history-store.ts` keeps one immutable row per `(gcc, product, day, slot)` in
Neon Postgres. **The first write for a slot wins**: a forced regeneration
(`?force=1`) does not overwrite the snapshot already on record, so the archive
reflects what the tool claimed at the time rather than a later, better-informed
rewrite. That property is what makes it usable as a track record.

```bash
vercel integration add neon      # provisions DATABASE_URL into the project
vercel env pull .env.local --yes # then pull it locally
```

The schema is created on first write (`CREATE TABLE IF NOT EXISTS`) — there is no
migration step. Without `DATABASE_URL` the whole module is a no-op: the app builds
and runs normally, `/api/history` reports `enabled: false`, and the trend chart
renders an explicit empty state. Writes are best-effort and never fail the
assessment the analyst asked for.

```bash
GET /api/history?gcc=INDOPACOM&days=30&product=analyze
```

Charted series are derived from each stored assessment, not measured:

| Series | Derivation |
|---|---|
| Adversarial reach share % | adversarial thread reach ÷ total thread reach |
| Mean narrative sentiment | mean of thread sentiment, model's −1..1 scaled to −100..100 |
| Adversarial threads | count of threads flagged adversarial |

Reach *share* is used rather than raw reach because the model emits reach as a
best-estimate order of magnitude; the ratio is far more stable across runs than
either absolute figure.

> The previous 30-day MOE chart was fabricated — `getHistoricalMoeData()` built it
> from `Math.random()` around hardcoded per-GCC baselines and re-rolled it on every
> render. It has been removed, along with a second unused `historicalMoeData`
> generator in `lib/mock-data.ts`. Nothing synthetic is substituted when the
> archive is empty.

## Doctrine library (military-library)

The **DOCTRINE LIBRARY** module and the doctrinal citations in the AI products are
backed by the offline research corpus at `/Volumes/X10/military-library`.

Only the catalog is deployed. The corpus's ~727 MB of PDFs and its local vector
index (qwen3-embedding vectors that need a local Ollama at query time) cannot run
on Vercel, so the app cites the corpus rather than serving it.

```bash
npm run sync-library          # drive → lib/military-library.generated.json
npm run sync-library:check    # verify the committed catalog is current (CI)
MILITARY_LIBRARY_ROOT=/path npm run sync-library   # non-default drive location
```

Each catalogued document is classified by how reachable it is:

- `public` — held in the library with a verifiable public URL; linkable and citable with the link.
- `local-only` — held on the drive, catalogued with a `local://` reference; cited by title and author, never with an invented URL.
- `stub` — catalogued as wanted, automated acquisition failed; the document is **not** in the corpus.

Current split: 160 sources over 24 components — 73 public, 73 local-only, 14 stub.

Note that the `information-influence-resilience` component (JP 3-13, JP 3-04,
MCWP 8-10, the DoD OIE strategy) is entirely `local-only`/`stub`, so core IO
doctrine is cited by title without a link until public URLs are backfilled into
the library catalog.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
