import { redirect } from "next/navigation"
import { getBracketFixtures } from "@/lib/get-bracket"
import { getChampionContext, CHAMPION_DEADLINE_LABEL } from "@/lib/get-champion"
import { getSession } from "@/lib/session"
import { MatchesClient } from "./matches-client"
import { MatchesHeader } from "./matches-header"

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("")
}

export default async function Page() {
  const session = await getSession()
  if (!session) redirect("/login")

  const [fixtures, champion] = await Promise.all([
    getBracketFixtures(session.user.id),
    getChampionContext(session.user.id),
  ])

  const displayName = session.user.displayUsername ?? session.user.username ?? session.user.name

  return (
    <>
      <MatchesHeader
        user={{
          name: displayName,
          image: session.user.image ?? null,
          initials: getInitials(displayName),
        }}
        teams={champion.teams}
        myPickTeamId={champion.myPickTeamId}
        locked={champion.locked}
        deadlineLabel={CHAMPION_DEADLINE_LABEL}
      />
      <div className="max-w-[1226px] mx-auto">
      <MatchesClient fixtures={fixtures} showTitle={false} />
      </div>
    </>
  )
}
