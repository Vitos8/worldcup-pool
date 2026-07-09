"use client"

import { useState } from "react"
import { cn } from "@workspace/ui/lib/utils"
import { LeaderboardPage } from "./leaderboard-page"
import { EventsPanel, type PoolEvent } from "./events-panel"
import type { Standing } from "./leaderboard-row"

const TABS = [
  { value: "leaderboard", label: "Leaderboard" },
  { value: "events", label: "Events" },
] as const

type Tab = (typeof TABS)[number]["value"]

/**
 * Desktop: leaderboard and events side by side.
 * Mobile: a small pill switcher toggles between the two.
 */
export function ScoresView({ standings, events }: { standings: Standing[]; events: PoolEvent[] }) {
  const [tab, setTab] = useState<Tab>("leaderboard")

  return (
    <div>
      <div className="mb-5 flex w-fit gap-0 rounded-[13px] bg-white/15 p-1 xl:hidden">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={cn(
              "rounded-[10px] px-5 py-2 font-display text-[13px] font-bold tracking-[0.09em] text-white/85 uppercase transition-colors",
              tab === t.value && "text-brand-green bg-white"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-20 xl:flex-row xl:items-start">
        <div className={cn("min-w-0 w-full max-w-[760px]", tab !== "leaderboard" && "hidden xl:block")}>
          <LeaderboardPage standings={standings} />
        </div>
        <div
          className={cn(
            "w-full shrink-0 xl:sticky xl:top-0 xl:w-[400px]",
            tab !== "events" && "hidden xl:block"
          )}
        >
          <EventsPanel events={events} />
        </div>
      </div>
    </div>
  )
}
