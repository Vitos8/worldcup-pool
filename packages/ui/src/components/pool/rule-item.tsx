import { Card } from "@workspace/ui/components/card"
import { cn } from "@workspace/ui/lib/utils"

export interface Rule {
  title: string
  description: string
  points: number
}

export function RuleItem({ rule }: { rule: Rule }) {
  const scored = rule.points > 0
  return (
    <Card className="flex-row items-center justify-between rounded-2xl border-hair px-[22px] py-[18px] shadow-none">
      <div>
        <div className="text-[17px] font-semibold text-ink">{rule.title}</div>
        <div className="text-sm text-faded">{rule.description}</div>
      </div>
      <div
        className={cn(
          "font-display text-[26px] font-bold",
          scored ? "text-brand-green" : "text-[#c4ccc6]"
        )}
      >
        {scored ? `+${rule.points}` : rule.points}
      </div>
    </Card>
  )
}
