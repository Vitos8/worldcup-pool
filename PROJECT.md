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
- Auth gate on entry: Google sign-in + custom username (create-account card
  with "I already have an account" link)
- Two-tab dashboard: /matches (bracket + predictions), /scores (leaderboard)
- Routes: / (rules + scoring), /matches, /scores, /matches/:userId (read-only)
- Predictions lock server-side at kickoff; LIVE badge shown, no edits after

## Scoring
- Exact score = 5
- Correct outcome (win or draw) = 3
- Wrong outcome = 0

Scoring is based on the regular-time score only. Penalty shootouts never
change prediction points — see below.

## Match results & bracket advancement
- `match.homeScore` / `match.awayScore` hold the regular-time result; that's
  what predictions are scored against.
- For knockout matches, if regular time ends level, `winnerTeamId` is
  resolved from the penalty shootout (`homePens` / `awayPens`). The penalty
  winner advances in the bracket (`nextMatchId` / `nextSlot`) but does not
  affect prediction points — a drawn regular-time score still only scores
  the "correct outcome, draw" tier (1pt) regardless of who wins on pens.

## Live scores
- No websockets / real-time push for MVP.
- When a user opens /matches, the app calls football-data.org's GET endpoint
  and updates score/status if needed (pull-on-view, not push).
- A LIVE badge is shown while `match.status = "live"`.

## Rules / conventions
- Enforce the kickoff lock on the server, not just in the UI
- Anti-corruption mapper between football-data.org and our domain model
- Data source: football-data.org, free tier (covers World Cup + Champions League)
