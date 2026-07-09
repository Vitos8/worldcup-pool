import { asc, eq, and } from "drizzle-orm"
import { db, competition, match, prediction } from "@workspace/db"
import { deriveTone, type BracketFixture, type Team as UiTeam } from "@workspace/ui/components/pool/data"
import { ensureFreshMatches } from "./sync-matches"
import { settleFinishedPredictions } from "./settle-predictions"

const COMPETITION_CODE = "WC"
const SEASON = "2026"

type TeamRow = { id: string; name: string; shortName: string | null; tla: string | null; crestUrl: string | null } | null

function toUiTeam(row: TeamRow): UiTeam | null {
  if (!row) return null
  const code = row.tla ?? row.name.slice(0, 3).toUpperCase()
  return { id: row.id, code, name: row.shortName ?? row.name, tone: deriveTone(code), crestUrl: row.crestUrl }
}

const STAGE_ORDER = ["r16", "qf", "sf", "final"] as const

interface OrderableMatch {
  stage: string
  kickoff: Date
  homeTeamId: string | null
  awayTeamId: string | null
  winnerTeamId: string | null
}

/**
 * Bracket position isn't chronological: a quarter-final can kick off before
 * another whose feeders finished earlier. The bracket UI pairs round r's
 * slot k with slots 2k/2k+1 of round r-1, so each round is ordered by where
 * its teams actually came from: a match whose team won feeder match i belongs
 * in slot floor(i / 2). Matches still TBD fall back to kickoff order and
 * self-correct once their teams resolve.
 */
function toBracketOrder<T extends OrderableMatch>(rows: T[]): T[] {
  const byStage = new Map<string, T[]>(STAGE_ORDER.map((stage) => [stage, []]))
  for (const row of rows) byStage.get(row.stage)?.push(row)

  const byKickoff = (a: T, b: T) => a.kickoff.getTime() - b.kickoff.getTime()
  const ordered: T[] = []
  let previousRound: T[] = []

  for (const stage of STAGE_ORDER) {
    const roundMatches = [...(byStage.get(stage) ?? [])].sort(byKickoff)
    const slots: (T | null)[] = new Array(roundMatches.length).fill(null)
    const unplaced: T[] = []

    for (const m of roundMatches) {
      const feederIndex = previousRound.findIndex(
        (p) =>
          p.winnerTeamId !== null &&
          (p.winnerTeamId === m.homeTeamId || p.winnerTeamId === m.awayTeamId)
      )
      const slot = feederIndex >= 0 ? Math.floor(feederIndex / 2) : -1
      if (slot >= 0 && slot < slots.length && slots[slot] === null) {
        slots[slot] = m
      } else {
        unplaced.push(m)
      }
    }
    for (let i = 0; i < slots.length; i++) {
      if (slots[i] === null) slots[i] = unplaced.shift() ?? null
    }

    const round = slots.filter((m): m is T => m !== null)
    ordered.push(...round)
    previousRound = round
  }

  return ordered
}

export async function getBracketFixtures(userId: string): Promise<BracketFixture[]> {
  await ensureFreshMatches()
  await settleFinishedPredictions()

  const competitionRow = await db.query.competition.findFirst({
    where: and(eq(competition.code, COMPETITION_CODE), eq(competition.season, SEASON)),
  })
  if (!competitionRow) return []

  const [rows, myPredictions] = await Promise.all([
    db.query.match.findMany({
      where: eq(match.competitionId, competitionRow.id),
      with: { homeTeam: true, awayTeam: true },
      orderBy: [asc(match.kickoff)],
    }),
    db.query.prediction.findMany({ where: eq(prediction.userId, userId) }),
  ])
  const pickByMatchId = new Map(myPredictions.map((p) => [p.matchId, p]))

  return toBracketOrder(rows).map((row) => ({
    id: row.id,
    stage: row.stage as BracketFixture["stage"],
    kickoff: row.kickoff.toISOString(),
    status: row.status,
    home: toUiTeam(row.homeTeam),
    away: toUiTeam(row.awayTeam),
    homeScore: row.homeScore,
    awayScore: row.awayScore,
    homePens: row.homePens,
    awayPens: row.awayPens,
    winner:
      row.winnerTeamId === null
        ? null
        : row.winnerTeamId === row.homeTeamId
          ? "home"
          : row.winnerTeamId === row.awayTeamId
            ? "away"
            : null,
    myPick: (() => {
      const pick = pickByMatchId.get(row.id)
      return pick
        ? {
            home: pick.homeScore,
            away: pick.awayScore,
            penaltyWinnerTeamId: pick.penaltyWinnerTeamId,
            points: pick.points,
          }
        : null
    })(),
  }))
}
