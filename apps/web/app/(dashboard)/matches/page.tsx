import { redirect } from "next/navigation"
import { getBracketFixtures } from "@/lib/get-bracket"
import { MatchesClient } from "./matches-client"
import { getSession } from "@/lib/session"

export default async function Page() {
  const session = await getSession()
  if (!session) redirect("/login")

  const fixtures = await getBracketFixtures(session.user.id)
  return <MatchesClient fixtures={fixtures} />
}
