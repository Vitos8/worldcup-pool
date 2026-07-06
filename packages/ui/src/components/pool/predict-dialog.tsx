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
import { cn } from "@workspace/ui/lib/utils"
import { TeamBadge } from "./team-badge"
import type { BracketFixture, Team } from "./data"

export interface Prediction {
  home: number
  away: number
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
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setIsPending(true)
    setError(null)
    const result = await onSave(fixture.id, prediction)
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
            {dateLabel} · {timeLabel} — regular time score. You can change your pick until kickoff.
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
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          onClick={handleSave}
          disabled={isPending}
          className={cn("bg-brand-green hover:bg-brand-green/90 w-full text-[15px] font-semibold text-white")}
        >
          {isPending ? "Saving…" : "Save prediction"}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
