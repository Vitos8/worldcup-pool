import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getBracketFixtures } from "@/lib/get-bracket"
import { MatchesClient } from "./matches-client"

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const fixtures = await getBracketFixtures(session.user.id)
  return <MatchesClient fixtures={fixtures} />
}
