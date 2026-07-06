import { cn } from "@workspace/ui/lib/utils"

export interface BracketMatch {
  id: string
  height?: number // override node height (featured node)
}
export interface BracketRound {
  title: string
  matches: BracketMatch[]
}

const NODE_W = 272
const NODE_H = 150
const COL_GAP = 46 // gutter between columns (for connectors)
const ROW_GAP = 22 // gap between round-0 siblings
const STEP = NODE_H + ROW_GAP

const colX = (r: number) => r * (NODE_W + COL_GAP)

/** vertical centre of match `i` in round `r` */
function centreY(r: number, i: number): number {
  if (r === 0) return i * STEP + NODE_H / 2
  return (centreY(r - 1, 2 * i) + centreY(r - 1, 2 * i + 1)) / 2
}

export function Bracket({
  rounds,
  renderNode,
}: {
  rounds: BracketRound[]
  renderNode: (match: BracketMatch, round: number, index: number) => React.ReactNode
}) {
  const roundOne = rounds[0]?.matches.length ?? 0
  const width = colX(rounds.length - 1) + NODE_W
  const height = roundOne * STEP - ROW_GAP

  return (
    <div className="relative" style={{ width, height: height + 34 }}>
      {/* round labels */}
      {rounds.map((round, r) => (
        <div
          key={round.title}
          className="absolute top-0 text-center font-display text-sm font-bold tracking-[0.14em] text-white uppercase"
          style={{ left: colX(r), width: NODE_W }}
        >
          {round.title}
        </div>
      ))}

      {/* connectors */}
      <svg
        className="pointer-events-none absolute inset-0"
        style={{ top: 34 }}
        width={width}
        height={height}
        fill="none"
        stroke="rgba(255,255,255,0.34)"
        strokeWidth={2}
      >
        {rounds.slice(1).map((round, ri) =>
          round.matches.map((_, i) => {
            const r = ri + 1
            const midX = colX(r) - COL_GAP / 2
            const py = centreY(r, i)
            return [2 * i, 2 * i + 1].map((childIdx) => {
              const cy = centreY(r - 1, childIdx)
              const cx = colX(r - 1) + NODE_W
              return (
                <polyline
                  key={`${r}-${i}-${childIdx}`}
                  points={`${cx},${cy} ${midX},${cy} ${midX},${py} ${colX(r)},${py}`}
                />
              )
            })
          })
        )}
      </svg>

      {/* nodes */}
      {rounds.map((round, r) =>
        round.matches.map((match, i) => {
          const h = match.height ?? NODE_H
          return (
            <div
              key={match.id}
              className={cn("absolute")}
              style={{ left: colX(r), top: 34 + centreY(r, i) - h / 2, width: NODE_W, height: h }}
            >
              {renderNode(match, r, i)}
            </div>
          )
        })
      )}
    </div>
  )
}
