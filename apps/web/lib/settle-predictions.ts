import { and, eq, isNull, isNotNull } from "drizzle-orm"
import { db, match, prediction } from "@workspace/db"
import { scorePrediction, scorePenaltyBonus } from "@workspace/shared"

/**
 * Awards points for every unsettled prediction whose match has finished.
 * Idempotent (settledAt guards re-processing), cheap when there's nothing
 * to do — safe to call on page loads after a sync.
 */
export async function settleFinishedPredictions() {
  const unsettled = await db
    .select({
      predictionId: prediction.id,
      predictedHome: prediction.homeScore,
      predictedAway: prediction.awayScore,
      predictedPenaltyWinnerTeamId: prediction.penaltyWinnerTeamId,
      actualHome: match.homeScore,
      actualAway: match.awayScore,
      actualWinnerTeamId: match.winnerTeamId,
    })
    .from(prediction)
    .innerJoin(match, eq(prediction.matchId, match.id))
    .where(
      and(
        isNull(prediction.settledAt),
        eq(match.status, "finished"),
        isNotNull(match.homeScore),
        isNotNull(match.awayScore)
      )
    )

  const settledAt = new Date()
  for (const row of unsettled) {
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
    await db.update(prediction).set({ points, settledAt }).where(eq(prediction.id, row.predictionId))
  }
}
