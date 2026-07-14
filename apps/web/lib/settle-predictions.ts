import { and, eq, isNotNull } from "drizzle-orm"
import { db, match, prediction } from "@workspace/db"
import { scoreKnockoutPrediction, stagePointsMultiplier } from "@workspace/shared"

/**
 * Awards points for every prediction whose match has finished. Recomputes
 * settled predictions too and rewrites them when the result (or the scoring
 * rules) changed — self-healing for provider corrections and rule updates.
 * Idempotent and cheap at pool scale.
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
      stage: match.stage,
      regularHome: match.homeScoreRegular,
      regularAway: match.awayScoreRegular,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      winnerTeamId: match.winnerTeamId,
    })
    .from(prediction)
    .innerJoin(match, eq(prediction.matchId, match.id))
    .where(
      and(
        eq(match.status, "finished"),
        isNotNull(match.homeScoreRegular),
        isNotNull(match.awayScoreRegular)
      )
    )

  const settledAt = new Date()
  for (const row of rows) {
    const points =
      scoreKnockoutPrediction({
        regularTime: { home: row.regularHome!, away: row.regularAway! },
        predicted: { home: row.predictedHome, away: row.predictedAway },
        homeTeamId: row.homeTeamId,
        awayTeamId: row.awayTeamId,
        advancingTeamId: row.winnerTeamId,
        predictedAdvancingTeamId: row.predictedPenaltyWinnerTeamId,
      }) * stagePointsMultiplier(row.stage)

    if (row.currentPoints !== points || row.settledAt === null) {
      await db
        .update(prediction)
        .set({ points, settledAt: row.settledAt ?? settledAt })
        .where(eq(prediction.id, row.predictionId))
    }
  }
}
