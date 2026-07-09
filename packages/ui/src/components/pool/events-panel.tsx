"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"
import { PageTitle } from "./page-title"
import { TONE_CLASS, type TeamTone } from "./data"

export interface PoolEvent {
  id: string
  playerName: string
  playerInitials: string
  playerTone: TeamTone
  playerAvatarUrl: string | null
  homeName: string
  homeCrestUrl: string | null
  awayName: string
  awayCrestUrl: string | null
  homeScore: number
  awayScore: number
  kickoff: string // ISO — formatted in the viewer's timezone
  points: number
}

function formatDate(iso: string) {
  const date = new Date(iso)
  const weekday = date.toLocaleDateString("en-GB", { weekday: "short" })
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${weekday} ${day}.${month}`
}

function Flag({ url }: { url: string | null }) {
  if (!url) return null
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" aria-hidden="true" className="h-[12px] w-[17px] shrink-0 object-cover ring-1 ring-black/10" />
}

export function EventsPanel({ events }: { events: PoolEvent[] }) {
  return (
    <section>
      <PageTitle hint="Exact scores called in advance">Events</PageTitle>
      <div className="overflow-hidden rounded-2xl border border-hair bg-white">
        {events.length === 0 ? (
          <div className="px-6 py-8 text-sm text-faded">
            No exact scores yet — be the first to call one.
          </div>
        ) : (
          events.map((event, index) => (
            <div
              key={event.id}
              className={cn(
                "flex items-center gap-3 px-5 py-[14px]",
                index < events.length - 1 && "border-b border-[#f0f2f0]"
              )}
            >
              <Avatar className="size-[34px] shrink-0">
                {event.playerAvatarUrl && (
                  <AvatarImage src={event.playerAvatarUrl} alt="" className="object-cover object-top" />
                )}
                <AvatarFallback className={cn("font-display text-[13px] font-bold", TONE_CLASS[event.playerTone])}>
                  {event.playerInitials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-ink">
                  <span className="font-bold">{event.playerName}</span>{" "}
                  <span className="text-[#63706a]">called the exact score</span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] font-semibold text-ink">
                  <Flag url={event.homeCrestUrl} />
                  <span>{event.homeName}</span>
                  <span className="font-display font-bold">
                    {event.homeScore}:{event.awayScore}
                  </span>
                  <span>{event.awayName}</span>
                  <Flag url={event.awayCrestUrl} />
                  <span className="font-normal text-faded">· {formatDate(event.kickoff)}</span>
                </div>
              </div>
              <Badge className="shrink-0 rounded-full border-0 bg-[#e3f2e8] px-[9px] py-0.5 font-display text-xs font-bold text-brand-green">
                +{event.points}
              </Badge>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
