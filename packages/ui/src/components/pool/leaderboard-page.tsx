"use client"

import { useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@workspace/ui/lib/utils"
import { PageTitle } from "./page-title"
import { LeaderboardRow, type Standing } from "./leaderboard-row"

type SortKey = "points" | "avg"

export function LeaderboardPage({ standings }: { standings: Standing[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "desc" | "asc" }>({
    key: "points",
    dir: "desc",
  })

  const sorted = useMemo(
    () =>
      [...standings].sort((a, b) =>
        sort.dir === "desc" ? b[sort.key] - a[sort.key] : a[sort.key] - b[sort.key]
      ),
    [standings, sort]
  )

  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "desc" ? "asc" : "desc" }
        : { key, dir: "desc" }
    )

  const SortHeader = ({ label, sortKey, className }: { label: string; sortKey: SortKey; className: string }) => (
    <button
      type="button"
      onClick={() => toggleSort(sortKey)}
      className={cn(
        "flex shrink-0 items-center justify-center gap-0.5 font-display font-semibold tracking-[0.12em] uppercase transition-colors",
        sort.key === sortKey ? "text-ink" : "text-faded hover:text-ink",
        className
      )}
    >
      {label}
      <HugeiconsIcon
        icon={sort.key === sortKey && sort.dir === "asc" ? ArrowUp01Icon : ArrowDown01Icon}
        className={cn("size-3.5", sort.key !== sortKey && "opacity-40")}
        strokeWidth={2.5}
      />
    </button>
  )

  return (
    <section>
      <PageTitle>Leaderboard</PageTitle>
      <div className="max-w-[760px] overflow-hidden rounded-2xl border border-hair bg-white">
        <div className="flex items-center border-b border-hair bg-[#fbfcfb] px-3 py-3.5 font-display text-[13px] font-semibold tracking-[0.12em] text-faded uppercase md:px-6">
          <div className="w-8 shrink-0 md:w-14">#</div>
          <div className="min-w-0 flex-1">Player</div>
          <div className="w-12 shrink-0 text-center md:w-[70px]">Played</div>
          <SortHeader label="PPG" sortKey="avg" className="w-12 md:w-[70px]" />
          <SortHeader label="Points" sortKey="points" className="w-14 md:w-[80px]" />
        </div>
        {sorted.length === 0 ? (
          <div className="px-6 py-8 text-sm text-faded">No players yet — invite your friends.</div>
        ) : (
          sorted.map((s, i) => (
            <LeaderboardRow key={s.userId} row={s} last={i === sorted.length - 1} />
          ))
        )}
      </div>
    </section>
  )
}
