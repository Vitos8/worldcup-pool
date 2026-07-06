import { cn } from "@workspace/ui/lib/utils"
import { TONE_CLASS, type Team } from "./data"

export function TeamBadge({ team, size = 22 }: { team: Team; size?: number }) {
  if (team.crestUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external SVG flags, next/image adds nothing here
      <img
        src={team.crestUrl}
        alt=""
        aria-hidden="true"
        className="shrink-0  object-cover ring-1 ring-black/10"
        style={{ width: 27, height: 19 }}
      />
    )
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-display font-bold",
        TONE_CLASS[team.tone]
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {team.code}
    </span>
  )
}
