"use client"

import { useRouter } from "next/navigation"
import { ChampionPickDialog, type ChampionTeam } from "@workspace/ui/components/pool/champion-pick-dialog"
import { saveChampionPick } from "./champion-actions"

export function ChampionGate({
  teams,
  deadlineLabel,
}: {
  teams: ChampionTeam[]
  deadlineLabel: string
}) {
  const router = useRouter()

  async function handleSave(teamId: string) {
    const result = await saveChampionPick(teamId)
    if (!result.error) router.refresh()
    return result
  }

  return <ChampionPickDialog teams={teams} deadlineLabel={deadlineLabel} forced onSave={handleSave} />
}
