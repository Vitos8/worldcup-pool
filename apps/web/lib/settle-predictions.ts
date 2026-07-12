import { and, eq, isNotNull } from "drizzle-orm"
import { db, match, prediction } from "@workspace/db"
import { scorePrediction, scorePenaltyBonus } from "@workspace/shared"

/**
 * Awards points for every prediction whose match has finished. Recomputes
 * settled predictions too and rewrites them when the result changed —
 * self-healing for provider corrections (wrong live feeds, extra-time
 * results arriving late, etc.). Idempotent and cheap at pool scale.
 */
export async function settleFinishedPredictions() {
  const rows = await db
    .select({
      predictionId: prediction.id,
      predictedHome: prediction.homeScore,
      predictedAway: prediction.awayScore,
      predictedPenaltyWinnerTeamId: prediction.penaltyWinnerTeamId,
      currentPoints: prediction.points,
      settledAt: prediction.settledAt,
      actualHome: match.homeScore,
      actualAway: match.awayScore,
      actualWinnerTeamId: match.winnerTeamId,
    })
    .from(prediction)
    .innerJoin(match, eq(prediction.matchId, match.id))
    .where(
      and(eq(match.status, "finished"), isNotNull(match.homeScore), isNotNull(match.awayScore))
    )

  const settledAt = new Date()
  for (const row of rows) {
    const actual = { home: row.actualHome!, away: row.actualAway! }
    const predicted = { home: row.predictedHome, away: row.predictedAway }
    const points =
      scorePrediction(actual, predicted) +
      scorePenaltyBonus({
        actual,
        predicted,
        actualAdvancingTeamId: row.actualWinnerTeamId,
        predictedAdvancingTeamId: row.predictedPenaltyWinnerTeamId,
      })

    if (row.currentPoints !== points || row.settledAt === null) {
      await db
        .update(prediction)
        .set({ points, settledAt: row.settledAt ?? settledAt })
        .where(eq(prediction.id, row.predictionId))
    }
  }
}
