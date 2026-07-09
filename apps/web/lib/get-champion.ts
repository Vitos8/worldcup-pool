import { and, asc, eq } from "drizzle-orm"
import { db, competition, team, match, championPick } from "@workspace/db"
import { isChampionPickLocked } from "@workspace/shared"
import type { ChampionTeam } from "@workspace/ui/components/pool/champion-pick-dialog"

const COMPETITION_CODE = "WC"
const SEASON = "2026"

export const CHAMPION_DEADLINE_LABEL = "Fri 10.07, 22:00 (Kyiv)"

export interface ChampionContext {
  teams: ChampionTeam[]
  myPickTeamId: string | null
  locked: boolean
}

type MatchRow = { status: string; winnerTeamId: string | null; homeTeamId: string | null; awayTeamId: string | null }

/**
 * Only teams still alive in the tournament are valid champions: anyone who
 * lost a finished knockout match is out. Self-maintaining as rounds finish.
 */
export function eliminatedTeamIds(matches: MatchRow[]): Set<string> {
  const eliminated = new Set<string>()
  for (const m of matches) {
    if (m.status !== "finished" || !m.winnerTeamId) continue
    const loser = m.winnerTeamId === m.homeTeamId ? m.awayTeamId : m.homeTeamId
    if (loser) eliminated.add(loser)
  }
  return eliminated
}

export async function getChampionContext(userId: string): Promise<ChampionContext> {
  const competitionRow = await db.query.competition.findFirst({
    where: and(eq(competition.code, COMPETITION_CODE), eq(competition.season, SEASON)),
  })
  if (!competitionRow) return { teams: [], myPickTeamId: null, locked: isChampionPickLocked() }

  const [teams, pick, matches] = await Promise.all([
    db
      .select({ id: team.id, name: team.name, shortName: team.shortName, crestUrl: team.crestUrl })
      .from(team)
      .where(eq(team.competitionId, competitionRow.id))
      .orderBy(asc(team.name)),
    db.query.championPick.findFirst({
      where: and(eq(championPick.userId, userId), eq(championPick.competitionId, competitionRow.id)),
    }),
    db.select().from(match).where(eq(match.competitionId, competitionRow.id)),
  ])

  const eliminated = eliminatedTeamIds(matches)

  return {
    teams: teams
      .filter((t) => !eliminated.has(t.id))
      .map((t) => ({ id: t.id, name: t.shortName ?? t.name, crestUrl: t.crestUrl })),
    myPickTeamId: pick?.teamId ?? null,
    locked: isChampionPickLocked(),
  }
}

/** The target user's champion pick with team info — public to all pool members. */
export async function getChampionPickForUser(userId: string) {
  const pick = await db.query.championPick.findFirst({
    where: eq(championPick.userId, userId),
    with: { team: true },
  })
  if (!pick) return null
  return {
    name: pick.team.shortName ?? pick.team.name,
    crestUrl: pick.team.crestUrl,
  }
}
