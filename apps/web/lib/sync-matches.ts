import { and, eq } from "drizzle-orm"
import { db, competition, team, match } from "@workspace/db"
import { rawMatchesResponseSchema, mapMatch, type MappedTeam, type MatchStage } from "@workspace/shared"
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

export async function syncWorldCupMatches() {
  const raw = await footballDataFetch(`/competitions/${COMPETITION_CODE}/matches`)
  const { matches } = rawMatchesResponseSchema.parse(raw)
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

  const teamIdByExternalId = new Map<string, string>()
  for (const t of teamsByExternalId.values()) {
    const [row] = await db
      .insert(team)
      .values({
        competitionId,
        externalId: t.externalId,
        name: t.name,
        shortName: t.shortName,
        tla: t.tla,
        crestUrl: t.crestUrl,
      })
      .onConflictDoUpdate({
        target: [team.competitionId, team.externalId],
        set: { name: t.name, shortName: t.shortName, tla: t.tla, crestUrl: t.crestUrl },
      })
      .returning()
    teamIdByExternalId.set(t.externalId, row!.id)
  }

  for (const m of mapped) {
    const homeTeamId = m.homeTeam ? teamIdByExternalId.get(m.homeTeam.externalId) : null
    const awayTeamId = m.awayTeam ? teamIdByExternalId.get(m.awayTeam.externalId) : null
    const winnerTeamId = m.winnerSide === "home" ? homeTeamId : m.winnerSide === "away" ? awayTeamId : null

    const values = {
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
      homePens: m.homePens,
      awayPens: m.awayPens,
      winnerTeamId,
      lastPolledAt: new Date(),
    }

    await db
      .insert(match)
      .values(values)
      .onConflictDoUpdate({
        target: [match.competitionId, match.externalId],
        set: values,
      })
  }

  return { competitionId, matchCount: mapped.length }
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
      const staleAfter = kickedOff ? LIVE_STALE_MS : UPCOMING_STALE_MS
      return !m.lastPolledAt || now - m.lastPolledAt.getTime() > staleAfter
    })

  if (stale) {
    await syncWorldCupMatches()
  }
}
