import { cn } from "@workspace/ui/lib/utils"

export function PoolLogo({
  className,
  tone = "light",
}: {
  className?: string
  tone?: "light" | "dark"
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "font-display text-2xl font-bold tracking-[0.13em] uppercase",
          tone === "light" ? "text-white" : "text-ink"
        )}
      >
        Worldcup
      </span>
      <span className="rounded-md bg-brand-mint px-2 py-0.5 font-display text-[17px] font-bold tracking-[0.12em] text-pitch-deep uppercase">
        Pool
      </span>
    </span>
  )
}
