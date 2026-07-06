import { and, eq, isNotNull, sql } from "drizzle-orm"
import { db, user, prediction } from "@workspace/db"
import { deriveTone } from "@workspace/ui/components/pool/data"
import type { Standing } from "@workspace/ui/components/pool/leaderboard-row"
import { syncIfStale } from "./sync-matches"
import { settleFinishedPredictions } from "./settle-predictions"

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("")
}

export async function getLeaderboard(currentUserId: string): Promise<Standing[]> {
  await syncIfStale()
  await settleFinishedPredictions()

  // Everyone who signed up is in the pool — users without settled predictions
  // still appear, with 0 points.
  const rows = await db
    .select({
      userId: user.id,
      name: user.name,
      username: user.username,
      displayUsername: user.displayUsername,
      image: user.image,
      played: sql<number>`count(${prediction.id})`.mapWith(Number),
      points: sql<number>`coalesce(sum(${prediction.points}), 0)`.mapWith(Number),
    })
    .from(user)
    .leftJoin(
      prediction,
      and(eq(prediction.userId, user.id), isNotNull(prediction.settledAt))
    )
    .groupBy(user.id)

  return rows
    .sort((a, b) => b.points - a.points || b.played - a.played || a.name.localeCompare(b.name))
    .map((row, index) => {
      const displayName = row.displayUsername ?? row.username ?? row.name
      return {
        userId: row.userId,
        rank: index + 1,
        name: displayName,
        initials: getInitials(displayName),
        tone: deriveTone(displayName),
        played: row.played,
        points: row.points,
        isYou: row.userId === currentUserId,
        avatarUrl: row.image,
      }
    })
}
