import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"
import { TONE_CLASS, type TeamTone } from "./data"

export interface Standing {
  userId: string
  rank: number
  name: string
  initials: string
  tone: TeamTone
  played: number
  points: number
  isYou?: boolean
  avatarUrl?: string | null
}

export function LeaderboardRow({ row, last }: { row: Standing; last?: boolean }) {
  return (
    <a
      href={`/matches/${row.userId}`}
      className={cn(
        "flex items-center px-3 md:px-6 py-[15px] transition-colors",
        !last && "border-b border-[#f0f2f0]",
        row.isYou ? "bg-[#d7ecdd]" : "hover:bg-[#fafbfa]"
      )}
      aria-label={row.isYou ? "Open your bracket" : `See ${row.name}'s predictions`}
    >
      <div
        className={cn(
          "w-8 shrink-0 font-display text-xl font-bold md:w-14",
          row.rank <= 2 ? "text-brand-green" : "text-faded"
        )}
      >
        {row.rank}
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar className="size-[40px] shrink-0 md:size-[60px]">
          {row.avatarUrl && <AvatarImage src={row.avatarUrl} alt="" className="object-top" />}
          <AvatarFallback className={cn("font-display text-[13px] font-bold", TONE_CLASS[row.tone])}>
            {row.initials}
          </AvatarFallback>
        </Avatar>
        <span className="min-w-0 text-base font-semibold break-words [overflow-wrap:anywhere] text-ink">
          {row.name}
        </span>
      </div>
      <div className="w-12 shrink-0 text-center text-[15px] text-[#63706a] md:w-[90px]">{row.played}</div>
      <div className="w-14 shrink-0 text-right font-display text-xl font-bold text-ink md:w-[90px]">{row.points}</div>
    </a>
  )
}
