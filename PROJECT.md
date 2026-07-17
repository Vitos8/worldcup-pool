# World Cup Prediction Pool

A football prediction pool for friends. Users predict match scores; points
are awarded after each match. World Cup first, extensible to Champions League.

## Stack
- TypeScript everywhere
- Next.js 16 (App Router) monolith — route handlers + server actions are the backend
- Tailwind v4 + shadcn/ui
- TanStack Query for client mutations; Server Components for reads
- Better Auth (Google provider + username plugin)
- Drizzle ORM + PostgreSQL on Neon
- pnpm workspaces + Turborepo

## Monorepo layout
- apps/web        — Next.js app (FE + BE)
- packages/ui     — shared components incl. KnockoutBracket (shadcn lives here)
- packages/db     — Drizzle schema + client
- packages/shared — Zod schemas, domain types, scoring logic

## MVP spec
- Auth gate on entry: single "Login with Google" button on `/login` covers
  both sign-up and sign-in — Better Auth creates the user on first login
  transparently, no separate create-account flow needed
- First-time users (no `username` set yet) get a non-dismissable modal on
  landing, prompting them to pick a username before using the app
- Unauthenticated visitors are redirected to `/login` (middleware)
- Two-tab dashboard: /matches (bracket + predictions), /scores (leaderboard)
- Routes: / (rules + scoring), /matches, /scores, /matches/:userId (read-only)
- Predictions lock server-side at kickoff; LIVE badge shown, no edits after
- Champion pick: every user must pick the cup winner (forced modal on entry,
  after the username step); editable via the banner on /matches until
  Fri 10.07.2026 22:00 Kyiv (19:00 UTC), then locked server-side. Champion
  picks are always public — shown on /matches/:userId next to the avatar.
- /matches/:userId is a standalone page (no dashboard tabs): back arrow,
  big avatar, "[name]'s bracket", champion pick chip, read-only bracket

## Scoring (matrix decided 2026-07-12, scored against the 90-minute result)
- Match decided in 90 minutes:
  - exact score = 5, correct winner = 3, everything else (incl. draw picks) = 0
- 90 minutes ended level (match went to ET and/or penalties):
  - draw predicted: exact vs the 90' score = 5, otherwise 3;
    +1 shootout-call bonus when the named advancer went through
  - win predicted: 1 point if the backed team advanced (via ET or pens), else 0
- Stage multipliers on the whole matrix result: semi-finals ×2 (exact = 10,
  win = 6, ...), the final ×2.5 (exact = 12.5, win = 7.5, ...) — hence
  fractional points (prediction.points is a real column). Third place and
  earlier rounds pay ×1.
- Third-place match is tracked and predictable like any fixture; it renders
  as its own section under the bracket (it shares feeders with the final,
  so it's not part of the tree).
- Leaderboard shows an Avg column (match points / played, champion bonus
  excluded) as a fairness signal for uneven played counts.
- Champion call = +5: awarded once, after the final, to everyone whose
  champion pick won the cup (not multiplied).

Display shows the final played score (after ET, before pens) with an
"FT (aet)" / "FT (pens)" badge; scoring always compares against the
90-minute score stored separately (`homeScoreRegular`/`awayScoreRegular`).

## Match results & bracket advancement
- `match.homeScore` / `match.awayScore` hold the final played score (incl.
  extra time, excl. penalty kicks); that's what predictions are scored
  against. `wentToExtraTime` drives the "FT (aet)" badge.
- For knockout matches that end level after extra time, `winnerTeamId` is
  resolved from the penalty shootout (`homePens` / `awayPens`). The penalty
  winner advances in the bracket but the shootout does not affect the base
  prediction points — a drawn score scores the draw tiers plus the +1
  shootout-call bonus when the named team advances.
- Settlement is self-healing: points are recomputed for finished matches on
  every settle pass, so provider corrections rewrite stale points.

## Live scores
- No websockets / real-time push for MVP.
- When a user opens /matches, the app calls football-data.org's GET endpoint
  and updates score/status if needed (pull-on-view, not push).
- A LIVE badge is shown while `match.status = "live"`.

## Rules / conventions
- Enforce the kickoff lock on the server, not just in the UI
- Anti-corruption mapper between football-data.org and our domain model
- Data source: football-data.org, free tier (covers World Cup + Champions League)
