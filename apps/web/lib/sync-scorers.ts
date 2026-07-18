import { inArray, eq, and } from "drizzle-orm"
import { sql } from "drizzle-orm"
import { db, competition, match, team, player } from "@workspace/db"
import {
  rawTeamDetailSchema,
  rawScorersResponseSchema,
  mapSquadMember,
  mapScorerTotals,
} from "@workspace/shared"
import { footballDataFetch } from "./football-data-client"

const COMPETITION_CODE = "WC"
const SEASON = "2026"

// Matches with a "who scores" pick: the final and the third-place match.
// Each of their four teams plays exactly one match after the semis, which is
// what makes the goals-diff settlement unambiguous per team.
const SCORER_STAGES = ["third", "final"] as const

// The free tier has no per-match goalscorers, so the scorer bonus is settled
// by diffing cumulative tournament totals around each team's last match. The
// pre-match numbers are stable from the semi-final whistle until kickoff
// (these teams don't play in between), so the snapshot only re-runs to pick
// up provider corrections.
const PRE_SNAPSHOT_STALE_MS = 6 * 60 * 60_000
// After a match, keep refreshing totals at a live-ish cadence for a bounded
// window (scorer data can land minutes after full time, and corrections
// happen), then stop hitting the API forever.
const POST_STALE_MS = 15 * 60_000
const POST_WINDOW_MS = 36 * 60 * 60_000

/**
 * Squads + goal snapshots for the final and third-place teams. Safe on every
 * page view: cheap DB checks gate the (rate-limited) API calls, and a
 * failure never takes the page down.
 */
export async function syncScorerData() {
  try {
    await syncScorerDataUnsafe()
  } catch (error) {
    console.error("scorer sync failed — serving existing data", error)
  }
}

async function syncScorerDataUnsafe() {
  const competitionRow = await db.query.competition.findFirst({
    where: and(eq(competition.code, COMPETITION_CODE), eq(competition.season, SEASON)),
  })
  if (!competitionRow) return

  const deciders = (
    await db
      .select()
      .from(match)
      .where(and(eq(match.competitionId, competitionRow.id), inArray(match.stage, [...SCORER_STAGES])))
  ).filter((m) => m.homeTeamId !== null && m.awayTeamId !== null)
  if (deciders.length === 0) return
  const scorerTeamIds = deciders.flatMap((m) => [m.homeTeamId!, m.awayTeamId!])

  // 1. Squads — one-time fetch per team (26 players each, fixed rosters).
  const teams = await db.select().from(team).where(inArray(team.id, scorerTeamIds))
  for (const teamRow of teams) {
    const [existing] = await db
      .select({ id: player.id })
      .from(player)
      .where(eq(player.teamId, teamRow.id))
      .limit(1)
    if (existing) continue

    const detail = rawTeamDetailSchema.parse(await footballDataFetch(`/teams/${teamRow.externalId}`))
    const rows = detail.squad.map(mapSquadMember).map((p) => ({ teamId: teamRow.id, ...p }))
    if (rows.length > 0) await db.insert(player).values(rows).onConflictDoNothing()
  }

  // 2. Goal snapshots, gated per match — the third-place match and the final
  // kick off (and finish) at different times.
  const players = await db.select().from(player).where(inArray(player.teamId, scorerTeamIds))
  if (players.length === 0) return

  const now = Date.now()
  const needPreTeamIds = new Set<string>()
  const needPostTeamIds = new Set<string>()
  for (const decider of deciders) {
    const matchTeamIds = [decider.homeTeamId!, decider.awayTeamId!]
    const matchPlayers = players.filter((p) => matchTeamIds.includes(p.teamId))
    if (matchPlayers.length === 0) continue

    const kickoff = decider.kickoff.getTime()
    const oldestSyncedAt = Math.min(...matchPlayers.map((p) => p.goalsSyncedAt?.getTime() ?? 0))

    const needPre =
      now < kickoff &&
      (matchPlayers.some((p) => p.preMatchGoals === null) ||
        now - oldestSyncedAt > PRE_SNAPSHOT_STALE_MS)
    const needPost =
      decider.status === "finished" &&
      (matchPlayers.some((p) => p.postMatchGoals === null) ||
        (now - oldestSyncedAt > POST_STALE_MS && now < kickoff + POST_WINDOW_MS))

    for (const teamId of matchTeamIds) {
      if (needPre) needPreTeamIds.add(teamId)
      if (needPost) needPostTeamIds.add(teamId)
    }
  }
  if (needPreTeamIds.size === 0 && needPostTeamIds.size === 0) return

  const totals = mapScorerTotals(
    rawScorersResponseSchema.parse(
      await footballDataFetch(`/competitions/${COMPETITION_CODE}/scorers?season=${SEASON}&limit=500`)
    )
  )

  // Single bulk upsert (same trick as the match sync) — per-row updates would
  // be one round trip to Neon each. Only touched teams are written, so the
  // other match's staleness clock isn't reset.
  const goalsSyncedAt = new Date()
  const rows = players
    .filter((p) => needPreTeamIds.has(p.teamId) || needPostTeamIds.has(p.teamId))
    .map((p) => {
      const goals = totals.get(p.externalId) ?? 0
      return {
        teamId: p.teamId,
        externalId: p.externalId,
        name: p.name,
        position: p.position,
        preMatchGoals: needPreTeamIds.has(p.teamId) ? goals : p.preMatchGoals,
        postMatchGoals: needPostTeamIds.has(p.teamId) ? goals : p.postMatchGoals,
        goalsSyncedAt,
      }
    })
  await db
    .insert(player)
    .values(rows)
    .onConflictDoUpdate({
      target: [player.teamId, player.externalId],
      set: {
        preMatchGoals: sql`excluded.pre_match_goals`,
        postMatchGoals: sql`excluded.post_match_goals`,
        goalsSyncedAt: sql`excluded.goals_synced_at`,
      },
    })
}
