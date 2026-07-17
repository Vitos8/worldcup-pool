import { Card } from "@workspace/ui/components/card"
import { cn } from "@workspace/ui/lib/utils"

export interface Rule {
  title: string
  description: string
  points: number
  /** Semi-final (×2) value, when the stage multiplier applies. */
  doubledPoints?: number
  /** Final (×2.5) value, when the stage multiplier applies. */
  finalPoints?: number
}

export function RuleItem({ rule }: { rule: Rule }) {
  const scored = rule.points > 0
  return (
    <Card className="flex-row items-center justify-between gap-4 rounded-2xl border-hair px-[22px] py-[18px] shadow-none">
      <div>
        <div className="text-[17px] font-semibold text-ink">{rule.title}</div>
        <div className="text-sm text-faded">{rule.description}</div>
      </div>
      <div className="flex shrink-0 flex-col items-end leading-tight">
        <div
          className={cn(
            "font-display text-[26px] font-bold",
            scored ? "text-brand-green" : "text-[#c4ccc6]"
          )}
        >
          {scored ? `+${rule.points}` : rule.points}
        </div>
        {rule.doubledPoints !== undefined && (
          <div className="font-display text-[13px] font-bold whitespace-nowrap text-[#b7791f]">
            +{rule.doubledPoints} semis{rule.finalPoints !== undefined && ` · +${rule.finalPoints} final`}
          </div>
        )}
      </div>
    </Card>
  )
}
