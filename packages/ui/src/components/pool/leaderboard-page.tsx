import { PageTitle } from "./page-title"
import { LeaderboardRow, type Standing } from "./leaderboard-row"

export function LeaderboardPage({ standings }: { standings: Standing[] }) {

  return (
    <section>
      <PageTitle>Leaderboard</PageTitle>
      <div className="max-w-[760px] overflow-hidden rounded-2xl border border-hair bg-white">
        <div className="flex items-center border-b border-hair bg-[#fbfcfb] px-3 py-3.5 font-display text-[13px] font-semibold tracking-[0.12em] text-faded uppercase md:px-6">
          <div className="w-8 shrink-0 md:w-14">#</div>
          <div className="min-w-0 flex-1">Player</div>
          <div className="w-12 shrink-0 text-center md:w-[70px]">Played</div>
          <div className="w-12 shrink-0 text-center md:w-[70px]">PPG</div>
          <div className="w-14 shrink-0 text-center md:w-[80px]">Points</div>
        </div>
        {standings.length === 0 ? (
          <div className="px-6 py-8 text-sm text-faded">No players yet — invite your friends.</div>
        ) : (
          standings.map((s, i) => (
            <LeaderboardRow key={s.rank} row={s} last={i === standings.length - 1} />
          ))
        )}
      </div>
    </section>
  )
}
