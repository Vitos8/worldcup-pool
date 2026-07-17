import { and, eq, isNotNull, sql } from "drizzle-orm"
import { db, user, prediction, match, championPick } from "@workspace/db"
import { POINTS_CHAMPION } from "@workspace/shared"
import { deriveTone } from "@workspace/ui/components/pool/data"
import type { Standing } from "@workspace/ui/components/pool/leaderboard-row"
import { ensureFreshMatches } from "./sync-matches"
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
  await ensureFreshMatches()
  await settleFinishedPredictions()

  // Everyone who signed up is in the pool — users without settled predictions
  // still appear, with 0 points.
  const [rows, finalMatch, picks] = await Promise.all([
    db
      .select({
        userId: user.id,
        name: user.name,
        username: user.username,
        displayUsername: user.displayUsername,
        image: user.image,
        played: sql<number>`count(${prediction.id})`.mapWith(Number),
        points: sql<number>`coalesce(sum(${prediction.points}), 0)`.mapWith(Number),
        // stored points carry the stage multiplier (×2 sf, ×2.5 final) —
        // divide it back out so PPG reflects base-matrix quality only;
        // mirrors stagePointsMultiplier() in @workspace/shared
        basePoints: sql<number>`coalesce(sum(${prediction.points} / case ${match.stage} when 'sf' then 2.0 when 'final' then 2.5 else 1.0 end), 0)`.mapWith(Number),
      })
      .from(user)
      .leftJoin(
        prediction,
        and(eq(prediction.userId, user.id), isNotNull(prediction.settledAt))
      )
      .leftJoin(match, eq(prediction.matchId, match.id))
      .groupBy(user.id),
    db.query.match.findFirst({ where: eq(match.stage, "final") }),
    db.select({ userId: championPick.userId, teamId: championPick.teamId }).from(championPick),
  ])

  // Champion call bonus: once the final is decided, everyone whose cup-winner
  // pick lifted the trophy gets a one-off +5.
  const cupWinnerTeamId = finalMatch?.status === "finished" ? finalMatch.winnerTeamId : null
  const pickByUserId = new Map(picks.map((p) => [p.userId, p.teamId]))

  return rows
    .map((row) => ({
      ...row,
      // per-match average — fairness metric for uneven "played" counts;
      // excludes the champion bonus (not a match) and stage multipliers
      avg: row.played > 0 ? Math.round((row.basePoints / row.played) * 10) / 10 : 0,
      points:
        row.points +
        (cupWinnerTeamId && pickByUserId.get(row.userId) === cupWinnerTeamId ? POINTS_CHAMPION : 0),
    }))
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
        avg: row.avg,
        isYou: row.userId === currentUserId,
        avatarUrl: row.image,
      }
    })
}
