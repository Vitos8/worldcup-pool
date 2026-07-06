"use server"

import { z } from "zod"
import { eq } from "drizzle-orm"
import { db, match, prediction } from "@workspace/db"
import { getSession } from "@/lib/session"

const savePredictionInput = z.object({
  matchId: z.string().min(1),
  home: z.number().int().min(0).max(20),
  away: z.number().int().min(0).max(20),
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

  const matchRow = await db.query.match.findFirst({ where: eq(match.id, matchId) })
  if (!matchRow) return { error: "Match not found." }

  // The lock lives here, not in the UI: no edits at or after kickoff,
  // regardless of what the client claims.
  // TEMP_ALLOW_LIVE_EDITS: lock relaxed to finished-only for testing during a
  // live match — revert to the strict check below and remove the UI half in
  // packages/ui/src/components/pool/matches-page.tsx (same flag name).
  const TEMP_ALLOW_LIVE_EDITS = true
  const locked = TEMP_ALLOW_LIVE_EDITS
    ? matchRow.status === "finished"
    : matchRow.status !== "scheduled" || matchRow.kickoff.getTime() <= Date.now()
  if (locked) {
    return { error: "Predictions are locked for this match." }
  }
  if (!matchRow.homeTeamId || !matchRow.awayTeamId) {
    return { error: "Teams for this match aren't decided yet." }
  }

  await db
    .insert(prediction)
    .values({ userId: session.user.id, matchId, homeScore: home, awayScore: away })
    .onConflictDoUpdate({
      target: [prediction.userId, prediction.matchId],
      set: { homeScore: home, awayScore: away },
    })

  return {}
}
