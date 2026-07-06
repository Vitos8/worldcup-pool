import { asc, eq, and } from "drizzle-orm"
import { db, competition, match, prediction } from "@workspace/db"
import { deriveTone, type BracketFixture, type Team as UiTeam } from "@workspace/ui/components/pool/data"
import { syncIfStale } from "./sync-matches"
import { settleFinishedPredictions } from "./settle-predictions"

const COMPETITION_CODE = "WC"
const SEASON = "2026"

type TeamRow = { name: string; shortName: string | null; tla: string | null; crestUrl: string | null } | null

function toUiTeam(row: TeamRow): UiTeam | null {
  if (!row) return null
  const code = row.tla ?? row.name.slice(0, 3).toUpperCase()
  return { code, name: row.shortName ?? row.name, tone: deriveTone(code), crestUrl: row.crestUrl }
}

export async function getBracketFixtures(userId: string): Promise<BracketFixture[]> {
  await syncIfStale()
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

  return rows.map((row) => ({
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
      return pick ? { home: pick.homeScore, away: pick.awayScore, points: pick.points } : null
    })(),
  }))
}
