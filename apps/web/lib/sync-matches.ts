import { after } from "next/server"
import { and, eq, sql } from "drizzle-orm"
import { db, competition, team, match } from "@workspace/db"
import { parseMatchesResponse, mapMatch, type MappedTeam, type MatchStage } from "@workspace/shared"
import { footballDataFetch } from "./football-data-client"

const COMPETITION_CODE = "WC"
const SEASON = "2026"

// football-data.org returns the whole competition (group stage included) in
// one call regardless of filters — fetching per-stage would cost more API
// calls, not fewer. So fetch everything, but only persist the stages our
// bracket actually displays; Round of 16 already carries its real teams
// directly from the API, so group stage / Round of 32 data serves no purpose
// here and would just be 88 unused rows.
const TRACKED_STAGES: MatchStage[] = ["r16", "qf", "sf", "final"]

// Don't hit football-data.org's rate-limited API on every page view — only
// refetch when local data could plausibly be out of date. Live matches need
// fresh data quickly; matches that haven't kicked off yet barely change.
const LIVE_STALE_MS = 60_000
const UPCOMING_STALE_MS = 6 * 60 * 60_000
// Matches with TBD slots are waiting on the previous round's results — the
// API fills their teams within minutes of a feeder match finishing, so the
// lazy 6h window would leave the bracket showing "To be decided" for hours.
const TBD_STALE_MS = 15 * 60_000

export async function syncWorldCupMatches() {
  const raw = await footballDataFetch(`/competitions/${COMPETITION_CODE}/matches`)
  const { matches, skipped } = parseMatchesResponse(raw)
  if (skipped.length > 0) {
    console.warn(`football-data.org: skipped ${skipped.length} malformed match(es)`, skipped)
  }
  const mapped = matches.map(mapMatch).filter((m) => TRACKED_STAGES.includes(m.stage))

  const [competitionRow] = await db
    .insert(competition)
    .values({ code: COMPETITION_CODE, name: "FIFA World Cup", season: SEASON, type: "cup" })
    .onConflictDoUpdate({
      target: [competition.code, competition.season],
      set: { name: "FIFA World Cup" },
    })
    .returning()
  const competitionId = competitionRow!.id

  const teamsByExternalId = new Map<string, MappedTeam>()
  for (const m of mapped) {
    if (m.homeTeam) teamsByExternalId.set(m.homeTeam.externalId, m.homeTeam)
    if (m.awayTeam) teamsByExternalId.set(m.awayTeam.externalId, m.awayTeam)
  }

  // Single bulk upsert per table — one-row-at-a-time round trips to Neon were
  // the main cost of a sync (~45 sequential queries before).
  const teamRows = [...teamsByExternalId.values()].map((t) => ({
    competitionId,
    externalId: t.externalId,
    name: t.name,
    shortName: t.shortName,
    tla: t.tla,
    crestUrl: t.crestUrl,
  }))
  const insertedTeams = await db
    .insert(team)
    .values(teamRows)
    .onConflictDoUpdate({
      target: [team.competitionId, team.externalId],
      set: {
        name: sql`excluded.name`,
        shortName: sql`excluded.short_name`,
        tla: sql`excluded.tla`,
        crestUrl: sql`excluded.crest_url`,
      },
    })
    .returning({ id: team.id, externalId: team.externalId })
  const teamIdByExternalId = new Map(insertedTeams.map((t) => [t.externalId, t.id]))

  const lastPolledAt = new Date()
  const matchRows = mapped.map((m) => {
    const homeTeamId = m.homeTeam ? (teamIdByExternalId.get(m.homeTeam.externalId) ?? null) : null
    const awayTeamId = m.awayTeam ? (teamIdByExternalId.get(m.awayTeam.externalId) ?? null) : null
    return {
      competitionId,
      externalId: m.externalId,
      stage: m.stage,
      groupName: m.groupName,
      homeTeamId,
      awayTeamId,
      kickoff: m.kickoff,
      status: m.status,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      wentToExtraTime: m.wentToExtraTime,
      homePens: m.homePens,
      awayPens: m.awayPens,
      winnerTeamId: m.winnerSide === "home" ? homeTeamId : m.winnerSide === "away" ? awayTeamId : null,
      lastPolledAt,
    }
  })
  await db
    .insert(match)
    .values(matchRows)
    .onConflictDoUpdate({
      target: [match.competitionId, match.externalId],
      set: {
        stage: sql`excluded.stage`,
        groupName: sql`excluded.group_name`,
        homeTeamId: sql`excluded.home_team_id`,
        awayTeamId: sql`excluded.away_team_id`,
        kickoff: sql`excluded.kickoff`,
        status: sql`excluded.status`,
        homeScore: sql`excluded.home_score`,
        awayScore: sql`excluded.away_score`,
        wentToExtraTime: sql`excluded.went_to_extra_time`,
        homePens: sql`excluded.home_pens`,
        awayPens: sql`excluded.away_pens`,
        winnerTeamId: sql`excluded.winner_team_id`,
        lastPolledAt: sql`excluded.last_polled_at`,
      },
    })

  return { competitionId, matchCount: mapped.length }
}

/**
 * Fast path for page loads: always render straight from our own database and
 * refresh from football-data.org *after* the response has been sent
 * (Next's `after()`), so users never wait on the external API. Only a
 * completely empty database blocks, since there'd be nothing to render.
 */
export async function ensureFreshMatches() {
  const [anyMatch] = await db.select({ id: match.id }).from(match).limit(1)

  if (!anyMatch) {
    await syncIfStale()
    return
  }

  try {
    after(async () => {
      await syncIfStale()
    })
  } catch {
    // Outside a request scope (scripts, tests) there's no response to defer
    // behind — fresh-enough data is already guaranteed above.
  }
}

/**
 * Sync only if local data is missing or plausibly stale — safe to call on
 * every page load. A failing football-data.org call must never take the page
 * down: we log and serve whatever is already in our own database.
 */
export async function syncIfStale() {
  try {
    await syncIfStaleUnsafe()
  } catch (error) {
    console.error("football-data.org sync failed — serving existing data", error)
  }
}

async function syncIfStaleUnsafe() {
  const [competitionRow] = await db
    .select()
    .from(competition)
    .where(and(eq(competition.code, COMPETITION_CODE), eq(competition.season, SEASON)))
    .limit(1)

  if (!competitionRow) {
    await syncWorldCupMatches()
    return
  }

  const matches = await db.select().from(match).where(eq(match.competitionId, competitionRow.id))

  const now = Date.now()
  const stale =
    matches.length === 0 ||
    matches.some((m) => {
      if (m.status === "finished") return false
      // A "scheduled" match whose kickoff has passed is live in reality —
      // poll at the live cadence so the status flips promptly.
      const kickedOff = m.status === "live" || m.kickoff.getTime() <= now
      const missingTeams = !m.homeTeamId || !m.awayTeamId
      const staleAfter = kickedOff ? LIVE_STALE_MS : missingTeams ? TBD_STALE_MS : UPCOMING_STALE_MS
      return !m.lastPolledAt || now - m.lastPolledAt.getTime() > staleAfter
    })

  if (stale) {
    await syncWorldCupMatches()
  }
}
