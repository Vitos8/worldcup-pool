import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { LeaderboardPage } from "@workspace/ui/components/pool/leaderboard-page"
import { auth } from "@/lib/auth"
import { getLeaderboard } from "@/lib/get-leaderboard"

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const standings = await getLeaderboard(session.user.id)
  return <LeaderboardPage standings={standings} />
}
