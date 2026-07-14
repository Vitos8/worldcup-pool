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
import { cn } from "@workspace/ui/lib/utils"
import { TeamBadge } from "./team-badge"
import type { BracketFixture, Team } from "./data"

export interface Prediction {
  home: number
  away: number
  /** Required when home === away: who advances on penalties (+1 if correct). */
  penaltyWinnerTeamId?: string | null
}

export type SavePrediction = (matchId: string, prediction: Prediction) => Promise<{ error?: string }>

function Stepper({
  team,
  value,
  onChange,
}: {
  team: Team
  value: number
  onChange: (next: number) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <TeamBadge team={team} />
        <span className="text-[15px] font-semibold text-ink">{team.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="text-brand-green size-8 rounded-lg border-[#d9e2dc] hover:bg-[#f1f8f3]"
          onClick={() => onChange(Math.max(0, value - 1))}
          aria-label={`Decrease ${team.name} goals`}
        >
          −
        </Button>
        <span className="w-[26px] text-center font-display text-xl font-bold text-ink">{value}</span>
        <Button
          variant="outline"
          size="icon"
          className="text-brand-green size-8 rounded-lg border-[#d9e2dc] hover:bg-[#f1f8f3]"
          onClick={() => onChange(Math.min(20, value + 1))}
          aria-label={`Increase ${team.name} goals`}
        >
          +
        </Button>
      </div>
    </div>
  )
}

export function PredictDialog({
  fixture,
  dateLabel,
  timeLabel,
  onClose,
  onSave,
}: {
  fixture: BracketFixture & { home: Team; away: Team }
  dateLabel: string
  timeLabel: string
  onClose: () => void
  onSave: SavePrediction
}) {
  const [prediction, setPrediction] = useState<Prediction>(
    fixture.myPick ? { home: fixture.myPick.home, away: fixture.myPick.away } : { home: 0, away: 0 }
  )
  const [penaltyWinnerId, setPenaltyWinnerId] = useState<string | undefined>(
    fixture.myPick?.penaltyWinnerTeamId ?? undefined
  )
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isDraw = prediction.home === prediction.away
  const canPickPenaltyWinner = Boolean(fixture.home.id && fixture.away.id)

  async function handleSave() {
    setIsPending(true)
    setError(null)
    const result = await onSave(fixture.id, {
      ...prediction,
      penaltyWinnerTeamId: isDraw ? (penaltyWinnerId ?? null) : null,
    })
    if (result.error) {
      setError(result.error)
      setIsPending(false)
      return
    }
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-bold uppercase">
            Your prediction
          </DialogTitle>
          <DialogDescription>
            {dateLabel} · {timeLabel} — 90-minute score. You can change your pick until kickoff.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3.5">
          <Stepper
            team={fixture.home}
            value={prediction.home}
            onChange={(v) => setPrediction((p) => ({ ...p, home: v }))}
          />
          <Stepper
            team={fixture.away}
            value={prediction.away}
            onChange={(v) => setPrediction((p) => ({ ...p, away: v }))}
          />
        </div>
        {isDraw && canPickPenaltyWinner && (
          <div className="flex flex-col gap-2 rounded-xl bg-[#f1f8f3] p-3">
            <span className="text-sm font-semibold text-ink">
              A draw needs a call — who goes through on penalties?
            </span>
            <span className="text-xs text-faded">Correct call earns +1 bonus point.</span>
            <Select value={penaltyWinnerId} onValueChange={setPenaltyWinnerId}>
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="Pick the shootout winner" />
              </SelectTrigger>
              <SelectContent>
                {[fixture.home, fixture.away].map((team) => (
                  <SelectItem key={team.id} value={team.id!}>
                    <span className="flex items-center gap-2.5">
                      <TeamBadge team={team} />
                      <span className="font-semibold text-ink">{team.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          onClick={handleSave}
          disabled={isPending || (isDraw && canPickPenaltyWinner && !penaltyWinnerId)}
          className={cn("bg-brand-green hover:bg-brand-green/90 w-full text-[15px] font-semibold text-white")}
        >
          {isPending ? "Saving…" : "Save prediction"}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
