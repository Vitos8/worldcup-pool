import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { db, user } from "@workspace/db"
import { MatchesPage } from "@workspace/ui/components/pool/matches-page"
import { auth } from "@/lib/auth"
import { getBracketFixtures } from "@/lib/get-bracket"

export default async function Page({ params }: { params: Promise<{ userId: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const { userId } = await params

  // Your own bracket lives at /matches, with editing.
  if (userId === session.user.id) redirect("/matches")

  const player = await db.query.user.findFirst({ where: eq(user.id, userId) })
  if (!player) notFound()

  const playerName = player.displayUsername ?? player.username ?? player.name

  // Hide picks for unlocked matches server-side — merely hiding them in the
  // UI would still leak them through the serialized payload.
  const fixtures = (await getBracketFixtures(userId)).map((fixture) =>
    fixture.status === "scheduled" ? { ...fixture, myPick: null } : fixture
  )

  return <MatchesPage fixtures={fixtures} readOnly playerName={playerName} />
}
