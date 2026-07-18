import { and, eq, isNotNull } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { db, match, prediction, player } from "@workspace/db"
import {
  scoreKnockoutPrediction,
  stagePointsMultiplier,
  scorerPickHit,
  POINTS_SCORER_CALL,
} from "@workspace/shared"

const homeScorer = alias(player, "home_scorer")
const awayScorer = alias(player, "away_scorer")

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
      homeScorerPre: homeScorer.preMatchGoals,
      homeScorerPost: homeScorer.postMatchGoals,
      awayScorerPre: awayScorer.preMatchGoals,
      awayScorerPost: awayScorer.postMatchGoals,
    })
    .from(prediction)
    .innerJoin(match, eq(prediction.matchId, match.id))
    .leftJoin(homeScorer, eq(prediction.homeScorerPlayerId, homeScorer.id))
    .leftJoin(awayScorer, eq(prediction.awayScorerPlayerId, awayScorer.id))
    .where(
      and(
        eq(match.status, "finished"),
        isNotNull(match.homeScoreRegular),
        isNotNull(match.awayScoreRegular)
      )
    )

  const settledAt = new Date()
  for (const row of rows) {
    // +3 per correct scorer call (final & third place) — flat, on top of the
    // multiplied matrix.
    const scorerBonus =
      (scorerPickHit(row.homeScorerPre, row.homeScorerPost) ? POINTS_SCORER_CALL : 0) +
      (scorerPickHit(row.awayScorerPre, row.awayScorerPost) ? POINTS_SCORER_CALL : 0)

    const points =
      scoreKnockoutPrediction({
        regularTime: { home: row.regularHome!, away: row.regularAway! },
        predicted: { home: row.predictedHome, away: row.predictedAway },
        homeTeamId: row.homeTeamId,
        awayTeamId: row.awayTeamId,
        advancingTeamId: row.winnerTeamId,
        predictedAdvancingTeamId: row.predictedPenaltyWinnerTeamId,
      }) *
        stagePointsMultiplier(row.stage) +
      scorerBonus

    if (row.currentPoints !== points || row.settledAt === null) {
      await db
        .update(prediction)
        .set({ points, settledAt: row.settledAt ?? settledAt })
        .where(eq(prediction.id, row.predictionId))
    }
  }
}
