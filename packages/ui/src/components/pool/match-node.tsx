import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"
import { TeamBadge } from "./team-badge"
import type { Match } from "./data"

function Row({ team, score, won }: { team: Match["home"]; score?: string; won?: boolean }) {
  return (
    <div className="flex h-[27px] items-center gap-2">
      <TeamBadge team={team} />
      <span className={cn("flex-1 text-sm", won ? "font-bold text-ink" : "font-medium text-faded")}>
        {team.name}
      </span>
      <span className={cn("font-display text-[15px] font-bold", won ? "text-ink" : "text-faded")}>
        {score}
      </span>
      {won && <span className="border-l-brand-green ml-0.5 border-y-[5px] border-l-[6px] border-y-transparent" />}
    </div>
  )
}

export function MatchNode({
  match,
  pickLabel = "Your pick",
  emptyPickLabel = "You didn't add a prediction here",
}: {
  match: Match
  pickLabel?: string
  emptyPickLabel?: string
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-hair bg-white px-[15px] py-[11px] shadow-sm">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-display text-xs font-bold tracking-[0.08em] text-faded uppercase">{match.date}</span>
        {match.status && (
          <Badge
            className={cn(
              "rounded-full border-0 px-[7px] py-0.5 font-display text-[10px] font-semibold tracking-[0.08em] uppercase",
              match.status === "Live"
                ? "bg-[#fdecec] text-[#d0342c] animate-pulse"
                : "bg-[#eef1ee] text-faded"
            )}
          >
            {match.status}
          </Badge>
        )}
      </div>
      <Row team={match.home} score={match.homeScore} won={match.winner === "home"} />
      <Row team={match.away} score={match.awayScore} won={match.winner === "away"} />
      {match.pick === undefined ? (
        <div className="mt-auto border-t border-[#eef1ee] pt-2">
          <span className="text-xs font-medium text-faded">{emptyPickLabel}</span>
        </div>
      ) : (
        <div className="mt-auto flex items-center justify-between border-t border-[#eef1ee] pt-2">
          <span className="text-xs font-semibold text-[#2a6fdb]">{pickLabel}: {match.pick}</span>
          {match.points !== undefined && (
            <Badge
              className={cn(
                "rounded-full border-0 px-[9px] py-0.5 font-display text-xs font-bold",
                match.points ? "bg-[#e3f2e8] text-brand-green" : "bg-[#eef1ee] text-faded"
              )}
            >
              +{match.points}
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
