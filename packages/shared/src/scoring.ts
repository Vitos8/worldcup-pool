export interface ScorePair {
  home: number
  away: number
}

export const POINTS_EXACT = 5
export const POINTS_OUTCOME = 3
export const POINTS_WRONG = 0
export const POINTS_PENALTY_BONUS = 1
/** Awarded once, after the final, when a user's champion pick wins the cup. */
export const POINTS_CHAMPION = 5

/**
 * Scores a prediction against the final played score — after extra time when
 * there was one, before penalties. Shootout kicks never affect this base
 * score; a match that ends level after 120 minutes scores as a draw no
 * matter who advances (see PROJECT.md).
 */
export function scorePrediction(actual: ScorePair, predicted: ScorePair): number {
  if (actual.home === predicted.home && actual.away === predicted.away) return POINTS_EXACT

  const outcome = ({ home, away }: ScorePair) => Math.sign(home - away)
  return outcome(actual) === outcome(predicted) ? POINTS_OUTCOME : POINTS_WRONG
}

/**
 * Draw predictions carry a second call: who advances on penalties. Correct
 * call on a match that actually ended level after extra time (i.e. went to
 * a shootout) earns +1 on top of the base score (6 total for an exact draw,
 * 4 for right-draw-wrong-numbers).
 */
export function scorePenaltyBonus(args: {
  actual: ScorePair
  predicted: ScorePair
  actualAdvancingTeamId: string | null
  predictedAdvancingTeamId: string | null
}): number {
  const isDraw = ({ home, away }: ScorePair) => home === away
  if (!isDraw(args.actual) || !isDraw(args.predicted)) return 0
  if (!args.actualAdvancingTeamId || !args.predictedAdvancingTeamId) return 0
  return args.actualAdvancingTeamId === args.predictedAdvancingTeamId ? POINTS_PENALTY_BONUS : 0
}
