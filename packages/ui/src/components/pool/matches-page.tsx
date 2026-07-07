"use client"

import { useState } from "react"
import { PageTitle } from "./page-title"
import { Bracket, type BracketMatch, type BracketRound } from "./bracket"
import { MatchNode } from "./match-node"
import { TeamBadge } from "./team-badge"
import { PredictDialog, type SavePrediction } from "./predict-dialog"
import type { BracketFixture, BracketStage, Match, Team } from "./data"

const STAGE_ORDER: BracketStage[] = ["r16", "qf", "sf", "final"]
const STAGE_TITLES: Record<BracketStage, string> = {
  r16: "Round of 16",
  qf: "Quarter-finals",
  sf: "Semi-finals",
  final: "Final",
}

function formatKickoffDate(iso: string) {
  const date = new Date(iso)
  const weekday = date.toLocaleDateString("en-GB", { weekday: "short" })
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${weekday} ${day}.${month}`
}

function formatKickoffTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
}

function toDisplayMatch(fixture: BracketFixture): Match {
  const withPens = (score: number | null, pens: number | null) =>
    score === null ? undefined : pens !== null ? `${score} (${pens})` : String(score)

  return {
    id: fixture.id,
    date: formatKickoffDate(fixture.kickoff),
    status: fixture.status === "live" ? "Live" : fixture.homePens !== null ? "FT (pens)" : "Full time",
    home: fixture.home!,
    away: fixture.away!,
    homeScore: withPens(fixture.homeScore, fixture.homePens),
    awayScore: withPens(fixture.awayScore, fixture.awayPens),
    winner: fixture.winner ?? undefined,
    pick: fixture.myPick ? `${fixture.myPick.home}:${fixture.myPick.away}` : undefined,
    points: fixture.myPick?.points ?? undefined,
  }
}

function isPredictable(fixture: BracketFixture): fixture is BracketFixture & { home: Team; away: Team } {
  return fixture.status === "scheduled" && fixture.home !== null && fixture.away !== null
}

export function MatchesPage({
  fixtures,
  onSavePrediction,
  readOnly = false,
  playerName,
}: {
  fixtures: BracketFixture[]
  onSavePrediction?: SavePrediction
  readOnly?: boolean
  playerName?: string
}) {
  const [predictingId, setPredictingId] = useState<string | null>(null)

  const byId = new Map(fixtures.map((f) => [f.id, f]))
  const predicting = predictingId ? byId.get(predictingId) : undefined

  const rounds: BracketRound[] = STAGE_ORDER.map((stage) => ({
    title: STAGE_TITLES[stage],
    matches: fixtures.filter((f) => f.stage === stage).map((f) => ({ id: f.id })),
  }))

  const renderNode = (node: BracketMatch) => {
    const fixture = byId.get(node.id)
    if (!fixture) return null

    if (fixture.status !== "scheduled" && fixture.home && fixture.away) {
      return (
        <MatchNode
          match={toDisplayMatch(fixture)}
          pickLabel={readOnly ? (playerName ? `${playerName}'s pick` : "Their pick") : "Your pick"}
          emptyPickLabel={readOnly ? "No prediction for this match" : "You didn't add a prediction here"}
        />
      )
    }

    if (isPredictable(fixture) && readOnly) {
      return (
        <div className="flex h-full w-full flex-col justify-center gap-1.5 rounded-2xl border border-hair bg-white px-[15px]">
          <div className="flex items-center justify-between">
            <span className="font-display text-xs font-bold tracking-[0.08em] text-faded uppercase">
              {formatKickoffTime(fixture.kickoff)} · {formatKickoffDate(fixture.kickoff)}
            </span>
          </div>
          {[fixture.home, fixture.away].map((team) => (
            <div key={team.code} className="flex items-center gap-2">
              <TeamBadge team={team} />
              <span className="text-sm font-semibold text-ink">{team.name}</span>
            </div>
          ))}
          <div className="mt-0.5 border-t border-[#eef1ee] pt-1.5 text-xs font-medium text-faded">
            Pick hidden until kickoff
          </div>
        </div>
      )
    }

    if (isPredictable(fixture)) {
      return (
        <button
          type="button"
          onClick={() => setPredictingId(fixture.id)}
          className="flex h-full w-full flex-col justify-center gap-1.5 rounded-2xl border border-hair bg-white px-[15px] text-left transition-shadow hover:shadow-[0_8px_24px_-8px_rgba(11,122,65,0.35)]"
        >
          <div className="flex items-center justify-between">
            <span className="font-display text-xs font-bold tracking-[0.08em] text-faded uppercase">
              {formatKickoffTime(fixture.kickoff)} · {formatKickoffDate(fixture.kickoff)}
            </span>
          </div>
          {[fixture.home, fixture.away].map((team) => (
            <div key={team.code} className="flex items-center gap-2 mt-2">
              <TeamBadge team={team} />
              <span className="text-sm font-semibold text-ink">{team.name}</span>
            </div>
          ))}
          <div className="mt-2 border-t border-[#eef1ee] pt-2  text-xs font-semibold">
            {fixture.myPick ? (
              <span className="text-[#2a6fdb]">
                Your pick: {fixture.myPick.home}:{fixture.myPick.away} — tap to edit
              </span>
            ) : (
              <span className="text-brand-green">Tap to predict</span>
            )}
          </div>
        </button>
      )
    }

    return (
      <div className="flex h-full flex-col justify-center gap-2 rounded-2xl border border-dashed border-white/40 bg-white/[0.14] px-4">
        <div className="font-display text-xs font-bold tracking-[0.08em] text-white/60 uppercase">
          {formatKickoffDate(fixture.kickoff)}
        </div>
        <div className="text-sm font-semibold text-white/80">To be decided</div>
      </div>
    )
  }

  return (
    <section>
      <PageTitle hint={readOnly ? "Read-only — picks stay hidden until kickoff" : "Tap a fixture to predict the score"}>
        {readOnly ? `${playerName ?? "Player"}'s bracket` : "Knockout bracket"}
      </PageTitle>
      <div className="w-full overflow-x-auto">
        <div className="mx-auto w-fit">
          <Bracket rounds={rounds} renderNode={renderNode} />
        </div>
      </div>
      {!readOnly && onSavePrediction && predicting && isPredictable(predicting) && (
        <PredictDialog
          key={predicting.id}
          fixture={predicting}
          dateLabel={formatKickoffDate(predicting.kickoff)}
          timeLabel={formatKickoffTime(predicting.kickoff)}
          onClose={() => setPredictingId(null)}
          onSave={onSavePrediction}
        />
      )}
    </section>
  )
}
