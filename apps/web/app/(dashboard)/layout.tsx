import { redirect } from "next/navigation"
import { UsernameModal } from "@/components/username-modal"
import { PitchBackdrop } from "@workspace/ui/components/pool/pitch-backdrop"
import { DashboardChrome } from "./dashboard-chrome"
import { ChampionGate } from "./champion-gate"
import { getSession } from "@/lib/session"
import { getChampionContext, CHAMPION_DEADLINE_LABEL } from "@/lib/get-champion"

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("")
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  const displayName = session.user.displayUsername ?? session.user.username ?? session.user.name
  const champion = await getChampionContext(session.user.id)

  // Gate order: username first (new accounts), then the champion pick —
  // never both modals at once. The champion gate disappears once picked or
  // once the deadline has passed.
  const needsUsername = !session.user.username
  const needsChampion =
    !needsUsername && !champion.locked && !champion.myPickTeamId && champion.teams.length > 0

  return (
    <div className="relative flex h-svh flex-col overflow-hidden">
      <PitchBackdrop />
      <div className="relative flex h-full flex-col">
        <DashboardChrome
          user={{
            name: displayName,
            group: "",
            initials: getInitials(displayName),
            image: session.user.image,
          }}
        />
        <main className="flex-1 overflow-y-auto px-4 py-7 md:px-8">{children}</main>
      </div>
      {needsUsername && <UsernameModal />}
      {needsChampion && <ChampionGate teams={champion.teams} deadlineLabel={CHAMPION_DEADLINE_LABEL} />}
    </div>
  )
}
