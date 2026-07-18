# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A World Cup prediction pool for friends: users predict knockout-match scores, points are settled after each match. **[PROJECT.md](PROJECT.md) is the authoritative spec** — read it for the MVP feature list, the scoring matrix (with stage multipliers and the shootout bonus), and the match-result/bracket-advancement rules before touching prediction, scoring, or settlement code.

## Commands

pnpm workspaces + Turborepo. Run from the repo root:

- `pnpm dev` — dev server (Next.js, apps/web on :3000)
- `pnpm build` / `pnpm lint` / `pnpm typecheck` / `pnpm format`
- Scope to one package: `pnpm --filter web typecheck`

Database (run in `packages/db`, needs `DATABASE_URL` in the environment — copy it from `apps/web/.env.local`):

- `pnpm db:push` — push schema straight to the DB (the workflow actually used here)
- `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:studio`

There are no tests in this repo.

Do not run typecheck/lint/dev-server verification after every change — the user prefers to ask for it explicitly.

Env setup: copy `apps/web/.env.example` to `apps/web/.env.local` (Neon `DATABASE_URL`, Better Auth secret, Google OAuth creds, football-data.org API key).

## Next.js 16 warning

This app uses Next.js 16, which has breaking changes vs. training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code. One visible example: the middleware file is `apps/web/proxy.ts` (exporting `proxy`), not `middleware.ts`.

## Architecture

Next.js monolith (App Router) — server components for reads, server actions for mutations; no separate API server.

- `apps/web` — the app (frontend + backend)
  - `app/(dashboard)/` — auth-gated two-tab dashboard: `/` (rules), `/matches` (bracket + predictions), `/scores` (leaderboard). Server actions live next to their routes (`matches/actions.ts`, `champion-actions.ts`).
  - `app/matches/[userId]` — standalone read-only view of another user's bracket (outside the dashboard chrome on purpose).
  - `lib/` — all server-side logic: `get-*` read helpers, `sync-matches.ts`, `settle-predictions.ts`, `auth.ts` (Better Auth config), `football-data-client.ts`.
- `packages/db` (`@workspace/db`) — Drizzle schema + client. Postgres on Neon via a pooled (PgBouncer) connection, so the client sets `prepare: false`. Core tables: `match`, `prediction`, `championPick`, plus Better Auth tables (`user`, `session`, `account`, `verification`).
- `packages/shared` (`@workspace/shared`) — pure domain logic, no DB/React: `scoring.ts` (the whole points matrix), `champion.ts` (pick deadline), and `football-data/` — the anti-corruption layer (Zod `schema.ts` + `mapper.ts`) between football-data.org and our domain model. External API shapes must not leak past this mapper.
- `packages/ui` (`@workspace/ui`) — shared React components. Generic shadcn primitives in `src/components/`, app-specific ones in `src/components/pool/` (bracket, predict dialog, leaderboard…). Import as `@workspace/ui/components/<name>`; add shadcn components with `pnpm dlx shadcn@latest add <name> -c apps/web` (they land in this package).

### Data-flow invariants

- **Live scores are pull-on-view, not push**: opening `/matches` triggers `sync-matches.ts`, which fetches the whole competition from football-data.org and upserts only tracked knockout stages, guarded by per-status staleness windows (live 60s, TBD-slot 15min, upcoming 6h) to respect the free-tier rate limit.
- **Settlement is self-healing**: `settle-predictions.ts` recomputes points for *all* finished matches on every pass (idempotent), so provider corrections or scoring-rule changes rewrite stale points automatically.
- **Scoring uses the 90-minute score** (`homeScoreRegular`/`awayScoreRegular`), while `homeScore`/`awayScore` hold the displayed final score (incl. extra time, excl. pens). Penalty shootouts decide `winnerTeamId`/advancement and the +1 shootout-call bonus, never the base score tiers. `prediction.points` is fractional (real column) because of stage multipliers.
- **Locks are enforced server-side**, not just in the UI: predictions lock at kickoff, champion picks at the fixed deadline in `packages/shared/src/champion.ts`.
- Auth: Better Auth with Google + username plugin. `proxy.ts` redirects unauthenticated visitors to `/login`; first-time users are forced through username → champion-pick modals by the dashboard layout.
