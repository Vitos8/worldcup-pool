"use client"

import { useRouter } from "next/navigation"
import { MatchesPage } from "@workspace/ui/components/pool/matches-page"
import type { BracketFixture } from "@workspace/ui/components/pool/data"
import type { Prediction } from "@workspace/ui/components/pool/predict-dialog"
import { savePrediction } from "./actions"

export function MatchesClient({ fixtures }: { fixtures: BracketFixture[] }) {
  const router = useRouter()

  async function handleSave(matchId: string, prediction: Prediction) {
    const result = await savePrediction({ matchId, home: prediction.home, away: prediction.away })
    if (!result.error) router.refresh()
    return result
  }

  return <MatchesPage fixtures={fixtures} onSavePrediction={handleSave} />
}
