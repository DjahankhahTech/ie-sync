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
