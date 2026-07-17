export interface ScorePair {
  home: number
  away: number
}

export const POINTS_EXACT = 5
export const POINTS_OUTCOME = 3
export const POINTS_PENALTY_BONUS = 1
/** Consolation for a win pick whose team only got through in ET / on pens. */
export const POINTS_ADVANCE_CALL = 1
/** Awarded once, after the final, when a user's champion pick wins the cup. */
export const POINTS_CHAMPION = 5

/**
 * Late-stage multipliers on the whole matrix result: semi-finals ×2
 * (exact = 10, win = 6, ...), the final ×2.5 (exact = 12.5, win = 7.5, ...).
 * Third place and earlier rounds pay ×1; the champion call is never
 * multiplied.
 */
export function stagePointsMultiplier(stage: string): number {
  if (stage === "final") return 2.5
  if (stage === "sf") return 2
  return 1
}

export interface KnockoutScoringInput {
  /** 90-minute score — the basis for all score comparisons. */
  regularTime: ScorePair
  predicted: ScorePair
  homeTeamId: string | null
  awayTeamId: string | null
  /** Who went through (match winner incl. ET/pens). */
  advancingTeamId: string | null
  /** The draw-prediction shootout call, when the user made one. */
  predictedAdvancingTeamId: string | null
}

/**
 * Knockout scoring matrix (decided 2026-07-12):
 *
 *   Match decided in 90 minutes:
 *     exact score → 5, correct winner → 3, anything else (incl. draw picks) → 0
 *
 *   90 minutes ended level (match went to ET and/or penalties):
 *     draw predicted → 5 if exact vs the 90' score, else 3;
 *                      +1 when the named advancer actually went through
 *     win predicted  → 1 if the backed team advanced (via ET or pens), else 0
 */
export function scoreKnockoutPrediction(input: KnockoutScoringInput): number {
  const { regularTime, predicted } = input
  const predictedDraw = predicted.home === predicted.away
  const levelAfter90 = regularTime.home === regularTime.away

  if (!levelAfter90) {
    if (predictedDraw) return 0
    if (regularTime.home === predicted.home && regularTime.away === predicted.away) {
      return POINTS_EXACT
    }
    const outcome = ({ home, away }: ScorePair) => Math.sign(home - away)
    return outcome(regularTime) === outcome(predicted) ? POINTS_OUTCOME : 0
  }

  if (predictedDraw) {
    const base =
      regularTime.home === predicted.home && regularTime.away === predicted.away
        ? POINTS_EXACT
        : POINTS_OUTCOME
    const calledAdvancerRight =
      input.predictedAdvancingTeamId !== null &&
      input.predictedAdvancingTeamId === input.advancingTeamId
    return base + (calledAdvancerRight ? POINTS_PENALTY_BONUS : 0)
  }

  const backedTeamId = predicted.home > predicted.away ? input.homeTeamId : input.awayTeamId
  const backedTeamAdvanced = backedTeamId !== null && backedTeamId === input.advancingTeamId
  return backedTeamAdvanced ? POINTS_ADVANCE_CALL : 0
}
