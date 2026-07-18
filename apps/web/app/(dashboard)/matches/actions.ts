"use server"

import { after } from "next/server"
import { z } from "zod"
import { eq, inArray } from "drizzle-orm"
import { db, match, player, prediction } from "@workspace/db"
import { getSession } from "@/lib/session"
import { syncScorerData } from "@/lib/sync-scorers"

const savePredictionInput = z.object({
  matchId: z.string().min(1),
  home: z.number().int().min(0).max(20),
  away: z.number().int().min(0).max(20),
  penaltyWinnerTeamId: z.string().min(1).nullable().optional(),
  homeScorerPlayerId: z.string().min(1).nullable().optional(),
  awayScorerPlayerId: z.string().min(1).nullable().optional(),
})

export interface SavePredictionResult {
  error?: string
}

export async function savePrediction(input: unknown): Promise<SavePredictionResult> {
  const session = await getSession()
  if (!session) return { error: "You need to be signed in." }

  const parsed = savePredictionInput.safeParse(input)
  if (!parsed.success) return { error: "Invalid prediction." }
  const { matchId, home, away } = parsed.data
  const penaltyWinnerTeamId = parsed.data.penaltyWinnerTeamId ?? null

  const matchRow = await db.query.match.findFirst({ where: eq(match.id, matchId) })
  if (!matchRow) return { error: "Match not found." }

  // The lock lives here, not in the UI: no edits at or after kickoff,
  // regardless of what the client claims.
  if (matchRow.status !== "scheduled" || matchRow.kickoff.getTime() <= Date.now()) {
    return { error: "Predictions are locked for this match." }
  }
  if (!matchRow.homeTeamId || !matchRow.awayTeamId) {
    return { error: "Teams for this match aren't decided yet." }
  }

  // A draw prediction must also call who advances on penalties (+1 if right).
  const isDraw = home === away
  if (isDraw && !penaltyWinnerTeamId) {
    return { error: "A draw needs a call: pick who goes through on penalties." }
  }
  if (isDraw && penaltyWinnerTeamId !== matchRow.homeTeamId && penaltyWinnerTeamId !== matchRow.awayTeamId) {
    return { error: "The penalty winner must be one of the two teams." }
  }

  // The final and the third-place match also demand a scorer call for each
  // team (+3 per correct one).
  const needsScorers = matchRow.stage === "final" || matchRow.stage === "third"
  const homeScorerPlayerId = needsScorers ? (parsed.data.homeScorerPlayerId ?? null) : null
  const awayScorerPlayerId = needsScorers ? (parsed.data.awayScorerPlayerId ?? null) : null
  if (needsScorers) {
    if (!homeScorerPlayerId || !awayScorerPlayerId) {
      return { error: "This match needs a scorer pick for each team." }
    }
    const scorers = await db
      .select({ id: player.id, teamId: player.teamId })
      .from(player)
      .where(inArray(player.id, [homeScorerPlayerId, awayScorerPlayerId]))
    const teamOf = new Map(scorers.map((p) => [p.id, p.teamId]))
    if (
      teamOf.get(homeScorerPlayerId) !== matchRow.homeTeamId ||
      teamOf.get(awayScorerPlayerId) !== matchRow.awayTeamId
    ) {
      return { error: "Each scorer pick must be a player of that team." }
    }
  }

  const values = {
    homeScore: home,
    awayScore: away,
    penaltyWinnerTeamId: isDraw ? penaltyWinnerTeamId : null,
    homeScorerPlayerId,
    awayScorerPlayerId,
  }
  await db
    .insert(prediction)
    .values({ userId: session.user.id, matchId, ...values })
    .onConflictDoUpdate({
      target: [prediction.userId, prediction.matchId],
      set: values,
    })

  // A saved scorer prediction guarantees a pre-kickoff goal snapshot exists
  // even if nobody views /matches again before the match — the +3 diff needs
  // it. Deferred so the user never waits on football-data.org.
  if (needsScorers) {
    after(async () => {
      await syncScorerData()
    })
  }

  return {}
}
