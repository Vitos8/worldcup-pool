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
  externalId: string
  homeTeamId: string | null
  awayTeamId: string | null
  winnerTeamId: string | null
}

/**
 * Bracket position isn't chronological — the official chart interleaves
 * halves across matchdays (e.g. WC2026 QFs by kickoff were FRA/MAR, ESP/BEL,
 * NOR/ENG, ARG/SUI but the first two share a semi-final). Two facts pin the
 * layout down instead:
 *  1. football-data match ids follow FIFA's official match numbering, which
 *     IS the top-to-bottom chart order within a round.
 *  2. Once a match's teams are known, its feeders are identifiable — the
 *     previous-round matches those teams won.
 * So: order every round by external id, then walk top-down from the final
 * permuting each earlier round to sit under its parent (home-side feeder in
 * slot 2k, away-side in 2k+1). Matches whose parents are still TBD keep id
 * order and self-correct as teams resolve.
 */
function toBracketOrder<T extends OrderableMatch>(rows: T[]): T[] {
  const byStage = new Map<string, T[]>(STAGE_ORDER.map((stage) => [stage, []]))
  for (const row of rows) byStage.get(row.stage)?.push(row)

  const byExternalId = (a: T, b: T) => Number(a.externalId) - Number(b.externalId)
  const rounds = STAGE_ORDER.map((stage) => [...(byStage.get(stage) ?? [])].sort(byExternalId))

  for (let r = rounds.length - 1; r > 0; r--) {
    const parents = rounds[r]!
    const children = rounds[r - 1]!
    if (parents.length === 0 || children.length !== parents.length * 2) continue

    const slots: (T | null)[] = new Array(children.length).fill(null)
    const placed = new Set<T>()

    parents.forEach((parent, parentIndex) => {
      const sides = [parent.homeTeamId, parent.awayTeamId]
      sides.forEach((teamId, side) => {
        if (!teamId) return
        const feeder = children.find((c) => !placed.has(c) && c.winnerTeamId === teamId)
        if (feeder) {
          slots[parentIndex * 2 + side] = feeder
          placed.add(feeder)
        }
      })
    })

    const leftovers = children.filter((c) => !placed.has(c))
    for (let i = 0; i < slots.length; i++) {
      if (slots[i] === null) slots[i] = leftovers.shift() ?? null
    }
    rounds[r - 1] = slots.filter((m): m is T => m !== null)
  }

  return rounds.flat()
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
