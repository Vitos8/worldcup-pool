import { PageTitle } from "./page-title"
import { RuleItem, type Rule } from "./rule-item"

const RULES: Rule[] = [
  {
    title: "Champion call",
    description: "Your cup-winner pick lifts the trophy — awarded after the final",
    points: 5,
  },
  {
    title: "Exact scoreline",
    description: "You nailed the precise 90-minute result, e.g. 2–1",
    points: 5,
    doubledPoints: 10,
    finalPoints: 12.5,
  },
  {
    title: "Correct result",
    description: "Right winner in 90 minutes, or called the draw",
    points: 3,
    doubledPoints: 6,
    finalPoints: 7.5,
  },
  {
    title: "Shootout call bonus",
    description: "Predicted a draw and named who goes through — stacks on top",
    points: 1,
    doubledPoints: 2,
    finalPoints: 2.5,
  },
  {
    title: "Advance call",
    description: "Backed a winner who only got through in extra time or on penalties",
    points: 1,
    doubledPoints: 2,
    finalPoints: 2.5,
  },
  { title: "Missed prediction", description: "No pick submitted before kickoff", points: 0 },
]

export function RulesPage() {
  return (
    <section>
      <PageTitle>How scoring works</PageTitle>
      <p className="-mt-2 mb-6 text-[15px] text-white/85">
        Points are awarded per match once the final whistle blows.
      </p>
      <div className="flex max-w-[720px] flex-col gap-3">
        {RULES.map((r) => (
          <RuleItem key={r.title} rule={r} />
        ))}
      </div>
    </section>
  )
}
