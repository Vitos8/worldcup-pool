import { asc, eq, and, inArray } from "drizzle-orm"
import { db, competition, match, player, prediction } from "@workspace/db"
import {
  deriveTone,
  type BracketFixture,
  type PlayerOption,
  type Team as UiTeam,
} from "@workspace/ui/components/pool/data"
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

// Matches with a "who scores" pick: the final and the third-place match.
const SCORER_STAGES = new Set(["final", "third"])

// Striker-to-keeper order for the scorer picker — likely scorers on top.
const POSITION_ORDER = ["Offence", "Midfield", "Defence", "Goalkeeper"]

/** Squad options for the scorer pickers, keyed by team id. */
async function getSquadsByTeam(teamIds: string[]): Promise<Map<string, PlayerOption[]>> {
  if (teamIds.length === 0) return new Map()

  const players = await db
    .select({ id: player.id, teamId: player.teamId, name: player.name, position: player.position })
    .from(player)
    .where(inArray(player.teamId, teamIds))

  // Unknown positions sort last, not first (indexOf would put -1 on top).
  const positionRank = (position: string | null) => {
    const index = POSITION_ORDER.indexOf(position ?? "")
    return index === -1 ? POSITION_ORDER.length : index
  }

  const byTeam = new Map<string, PlayerOption[]>()
  for (const { id, teamId, name, position } of players) {
    if (!byTeam.has(teamId)) byTeam.set(teamId, [])
    byTeam.get(teamId)!.push({ id, name, position })
  }
  for (const options of byTeam.values()) {
    options.sort(
      (a, b) => positionRank(a.position) - positionRank(b.position) || a.name.localeCompare(b.name)
    )
  }
  return byTeam
}

// "third" sits last on purpose: it shares feeders with the final (the SF
// losers), so it must never participate in the parent→child permutation walk
// — the length mismatch (1 parent vs 1 "child") makes the walk skip it.
const STAGE_ORDER = ["r16", "qf", "sf", "final", "third"] as const

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

  const scorerTeamIds = rows
    .filter((row) => SCORER_STAGES.has(row.stage))
    .flatMap((row) => [row.homeTeamId, row.awayTeamId])
    .filter((id): id is string => id !== null)
  const squadsByTeam = await getSquadsByTeam(scorerTeamIds)

  return toBracketOrder(rows).map((row) => ({
    id: row.id,
    stage: row.stage as BracketFixture["stage"],
    kickoff: row.kickoff.toISOString(),
    status: row.status,
    home: toUiTeam(row.homeTeam),
    away: toUiTeam(row.awayTeam),
    homeScore: row.homeScore,
    awayScore: row.awayScore,
    wentToExtraTime: row.wentToExtraTime,
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
            homeScorerPlayerId: pick.homeScorerPlayerId,
            awayScorerPlayerId: pick.awayScorerPlayerId,
            points: pick.points,
          }
        : null
    })(),
    squads: (() => {
      if (!SCORER_STAGES.has(row.stage) || !row.homeTeamId || !row.awayTeamId) return undefined
      const home = squadsByTeam.get(row.homeTeamId) ?? []
      const away = squadsByTeam.get(row.awayTeamId) ?? []
      return home.length > 0 && away.length > 0 ? { home, away } : null
    })(),
  }))
}
