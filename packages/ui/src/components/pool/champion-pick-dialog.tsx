"use client"

import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

export interface ChampionTeam {
  id: string
  name: string
  crestUrl: string | null
}

export type SaveChampionPick = (teamId: string) => Promise<{ error?: string }>

function TeamOption({ team }: { team: ChampionTeam }) {
  return (
    <span className="flex items-center gap-2.5">
      {team.crestUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.crestUrl} alt="" aria-hidden="true" className="h-[15px] w-[21px] shrink-0 object-cover ring-1 ring-black/10" />
      )}
      <span className="font-semibold text-ink">{team.name}</span>
    </span>
  )
}

export function ChampionPickDialog({
  teams,
  initialTeamId,
  deadlineLabel,
  forced = false,
  onSave,
  onClose,
}: {
  teams: ChampionTeam[]
  initialTeamId?: string | null
  deadlineLabel: string
  /** Entry gate mode: can't be dismissed without saving a pick. */
  forced?: boolean
  onSave: SaveChampionPick
  onClose?: () => void
}) {
  const [teamId, setTeamId] = useState<string | undefined>(initialTeamId ?? undefined)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!teamId) return
    setIsPending(true)
    setError(null)
    const result = await onSave(teamId)
    if (result.error) {
      setError(result.error)
      setIsPending(false)
      return
    }
    onClose?.()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !forced && onClose?.()}>
      <DialogContent
        showCloseButton={!forced}
        onEscapeKeyDown={(event) => forced && event.preventDefault()}
        onInteractOutside={(event) => forced && event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-bold uppercase">
            Who takes the cup?
          </DialogTitle>
          <DialogDescription>
            Pick your world champion — it&apos;s worth the bragging rights alone. You can change
            your mind until {deadlineLabel}, then it locks for good.
          </DialogDescription>
        </DialogHeader>
        <Select value={teamId} onValueChange={setTeamId}>
          <SelectTrigger className="h-11 w-full">
            <SelectValue placeholder="Choose a team" />
          </SelectTrigger>
          <SelectContent>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                <TeamOption team={team} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          onClick={handleSave}
          disabled={isPending || !teamId}
          className="bg-brand-green hover:bg-brand-green/90 w-full text-[15px] font-semibold text-white"
        >
          {isPending ? "Saving…" : "Continue"}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
