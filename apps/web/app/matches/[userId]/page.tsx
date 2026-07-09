import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { db, user } from "@workspace/db"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { MatchesPage } from "@workspace/ui/components/pool/matches-page"
import { PitchBackdrop } from "@workspace/ui/components/pool/pitch-backdrop"
import { getBracketFixtures } from "@/lib/get-bracket"
import { getChampionPickForUser } from "@/lib/get-champion"
import { getSession } from "@/lib/session"
import { DashboardChrome } from "@/app/(dashboard)/dashboard-chrome"

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("")
}

export default async function Page({ params }: { params: Promise<{ userId: string }> }) {
  const session = await getSession()
  if (!session) redirect("/login")

  const { userId } = await params

  // Your own bracket lives at /matches, with editing.
  if (userId === session.user.id) redirect("/matches")

  const player = await db.query.user.findFirst({ where: eq(user.id, userId) })
  if (!player) notFound()

  const playerName = player.displayUsername ?? player.username ?? player.name
  const viewerName = session.user.displayUsername ?? session.user.username ?? session.user.name

  const [rawFixtures, championPick] = await Promise.all([
    getBracketFixtures(userId),
    getChampionPickForUser(userId),
  ])

  // Hide picks for unlocked matches server-side — merely hiding them in the
  // UI would still leak them through the serialized payload.
  const fixtures = rawFixtures.map((fixture) =>
    fixture.status === "scheduled" ? { ...fixture, myPick: null } : fixture
  )

  return (
    <div className="relative flex h-svh flex-col overflow-hidden">
      <PitchBackdrop />
      <div className="relative flex h-full flex-col">
        <DashboardChrome
          user={{
            name: viewerName,
            group: "",
            initials: getInitials(viewerName),
            image: session.user.image,
          }}
          showNav={false}
        />
        <main className="mx-auto w-full max-w-[1425px] flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <Link
            href="/scores"
            className="inline-flex items-center gap-1.5 rounded-full py-1 pr-3 pl-1.5 text-sm font-bold text-white/95 transition-colors hover:bg-white/10 hover:text-white"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-5" strokeWidth={2} />
            Back
          </Link>

          <div className="mt-4 mb-6 flex items-center gap-5 ">
            <Avatar className="size-20 bg-white ring-2 ring-white/60 md:size-24">
              {player.image && <AvatarImage src={player.image} alt={playerName} className="object-cover object-top" />}
              <AvatarFallback className="bg-white font-display text-2xl font-bold tracking-[0.06em] text-brand-green">
                {getInitials(playerName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2">
              <h1 className="font-display text-3xl leading-none font-bold tracking-tight text-white uppercase md:text-4xl">
                {playerName}
              </h1>
              <div className="flex items-center gap-2.5">
                <span className="font-display text-lg font-bold tracking-[0.14em] text-yellow-400 uppercase">
                  🏆 Champion  <span className="text-whit">pick</span>
                </span>
                {championPick ? (
                  <span className="flex items-center gap-2 rounded-full bg-white/15 py-1 pr-3 pl-2 ring-1 ring-white/25">
                    {championPick.crestUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={championPick.crestUrl}
                        alt=""
                        aria-hidden="true"
                        className="h-[13px] w-[19px] object-cover ring-1 ring-black/20"
                      />
                    )}
                    <span className="text-sm font-bold text-white">{championPick.name}</span>
                  </span>
                ) : (
                  <span className="text-sm font-semibold text-white/70">Not picked</span>
                )}
              </div>
            </div>
          </div>

          <MatchesPage fixtures={fixtures} readOnly playerName={playerName} showTitle={false} />
        </main>
      </div>
    </div>
  )
}
