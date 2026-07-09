import { redirect } from "next/navigation"
import { ScoresView } from "@workspace/ui/components/pool/scores-view"
import { getLeaderboard } from "@/lib/get-leaderboard"
import { getExactScoreEvents } from "@/lib/get-events"
import { getSession } from "@/lib/session"

export default async function Page() {
  const session = await getSession()
  if (!session) redirect("/login")

  const [standings, events] = await Promise.all([
    getLeaderboard(session.user.id),
    getExactScoreEvents(),
  ])

  return <ScoresView standings={standings} events={events} />
}
