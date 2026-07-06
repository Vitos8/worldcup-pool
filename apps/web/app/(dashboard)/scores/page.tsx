import { redirect } from "next/navigation"
import { LeaderboardPage } from "@workspace/ui/components/pool/leaderboard-page"
import { getLeaderboard } from "@/lib/get-leaderboard"
import { getSession } from "@/lib/session"

export default async function Page() {
  const session = await getSession()
  if (!session) redirect("/login")

  const standings = await getLeaderboard(session.user.id)
  return <LeaderboardPage standings={standings} />
}
