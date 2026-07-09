"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import { ChampionPickDialog, type ChampionTeam } from "@workspace/ui/components/pool/champion-pick-dialog"
import { saveChampionPick } from "../champion-actions"

export function MatchesHeader({
  user,
  teams,
  myPickTeamId,
  locked,
  deadlineLabel,
}: {
  user: { name: string; image: string | null; initials: string }
  teams: ChampionTeam[]
  myPickTeamId: string | null
  locked: boolean
  deadlineLabel: string
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const pick = teams.find((t) => t.id === myPickTeamId)

  async function handleSave(teamId: string) {
    const result = await saveChampionPick(teamId)
    if (!result.error) router.refresh()
    return result
  }

  return (
    <div className="mx-auto mt-2 mb-10 flex w-full max-w-[1226px] items-center gap-5">
      <Avatar className="size-20 bg-white ring-2 ring-white/60 md:size-24">
        {user.image && <AvatarImage src={user.image} alt={user.name} className="object-cover object-top" />}
        <AvatarFallback className="bg-white font-display text-2xl font-bold tracking-[0.06em] text-brand-green">
          {user.initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl leading-none font-bold tracking-tight text-white uppercase md:text-4xl">
          {user.name}
        </h1>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <span className="font-display text-lg font-bold tracking-[0.14em] text-yellow-400 uppercase">
            🏆 Champion <span className="text-white">pick</span>
          </span>
          {pick ? (
            <span className="flex items-center gap-2 rounded-full bg-white/15 py-1 pr-3 pl-2 ring-1 ring-white/25">
              {pick.crestUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pick.crestUrl}
                  alt=""
                  aria-hidden="true"
                  className="h-[13px] w-[19px] object-cover ring-1 ring-black/20"
                />
              )}
              <span className="text-sm font-bold text-white">{pick.name}</span>
            </span>
          ) : (
            <span className="text-sm font-semibold text-white/70">
              {locked ? "No pick — deadline passed" : "Not picked yet"}
            </span>
          )}
          {!locked && (
            <>
              <Button
                variant="outline"
                size="xs"
                onClick={() => setEditing(true)}
                className="border-white/40 bg-transparent text-white hover:bg-white/15 hover:text-white"
              >
                {pick ? "Edit champion pick" : "Pick your champion"}
              </Button>
              <span className="text-xs text-white/60">Locks {deadlineLabel}</span>
            </>
          )}
        </div>
      </div>
      {editing && (
        <ChampionPickDialog
          teams={teams}
          initialTeamId={myPickTeamId}
          deadlineLabel={deadlineLabel}
          onSave={handleSave}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  )
}
