export interface ScorePair {
  home: number
  away: number
}

export const POINTS_EXACT = 5
export const POINTS_OUTCOME = 3
export const POINTS_WRONG = 0

/**
 * Scores a prediction against the regular-time result.
 * Penalty shootouts never affect points — a draw after 90 minutes scores as
 * a draw no matter who advances (see PROJECT.md).
 */
export function scorePrediction(actual: ScorePair, predicted: ScorePair): number {
  if (actual.home === predicted.home && actual.away === predicted.away) return POINTS_EXACT

  const outcome = ({ home, away }: ScorePair) => Math.sign(home - away)
  return outcome(actual) === outcome(predicted) ? POINTS_OUTCOME : POINTS_WRONG
}
