import { isNotNull } from "drizzle-orm"
import { db, prediction } from "@workspace/db"
import { deriveTone } from "@workspace/ui/components/pool/data"
import type { PoolEvent } from "@workspace/ui/components/pool/events-panel"

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("")
}

/** Every settled prediction that nailed the exact regular-time score, newest match first. */
export async function getExactScoreEvents(): Promise<PoolEvent[]> {
  const rows = await db.query.prediction.findMany({
    where: isNotNull(prediction.settledAt),
    with: {
      user: true,
      match: { with: { homeTeam: true, awayTeam: true } },
    },
  })

  return rows
    .filter(
      (row) =>
        row.match.homeScoreRegular !== null &&
        row.match.awayScoreRegular !== null &&
        row.homeScore === row.match.homeScoreRegular &&
        row.awayScore === row.match.awayScoreRegular
    )
    .sort((a, b) => b.match.kickoff.getTime() - a.match.kickoff.getTime())
    .map((row) => {
      const playerName = row.user.displayUsername ?? row.user.username ?? row.user.name
      return {
        id: row.id,
        playerName,
        playerInitials: getInitials(playerName),
        playerTone: deriveTone(playerName),
        playerAvatarUrl: row.user.image,
        homeName: row.match.homeTeam?.shortName ?? row.match.homeTeam?.name ?? "TBD",
        homeCrestUrl: row.match.homeTeam?.crestUrl ?? null,
        awayName: row.match.awayTeam?.shortName ?? row.match.awayTeam?.name ?? "TBD",
        awayCrestUrl: row.match.awayTeam?.crestUrl ?? null,
        homeScore: row.homeScore,
        awayScore: row.awayScore,
        kickoff: row.match.kickoff.toISOString(),
        points: row.points ?? 0,
      }
    })
}
