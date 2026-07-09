"use server"

import { z } from "zod"
import { eq } from "drizzle-orm"
import { db, competition, team, match, championPick } from "@workspace/db"
import { isChampionPickLocked } from "@workspace/shared"
import { getSession } from "@/lib/session"
import { eliminatedTeamIds } from "@/lib/get-champion"

const inputSchema = z.string().min(1)

export async function saveChampionPick(teamIdInput: unknown): Promise<{ error?: string }> {
  const session = await getSession()
  if (!session) return { error: "You need to be signed in." }

  const parsed = inputSchema.safeParse(teamIdInput)
  if (!parsed.success) return { error: "Invalid team." }
  const teamId = parsed.data

  // The deadline is enforced here, not in the UI.
  if (isChampionPickLocked()) {
    return { error: "Champion picks are locked." }
  }

  const teamRow = await db.query.team.findFirst({ where: eq(team.id, teamId) })
  if (!teamRow) return { error: "Team not found." }

  const competitionRow = await db.query.competition.findFirst({
    where: eq(competition.id, teamRow.competitionId),
  })
  if (!competitionRow) return { error: "Competition not found." }

  const matches = await db.select().from(match).where(eq(match.competitionId, competitionRow.id))
  if (eliminatedTeamIds(matches).has(teamId)) {
    return { error: "That team is already out of the tournament." }
  }

  await db
    .insert(championPick)
    .values({ userId: session.user.id, competitionId: competitionRow.id, teamId })
    .onConflictDoUpdate({
      target: [championPick.userId, championPick.competitionId],
      set: { teamId },
    })

  return {}
}
