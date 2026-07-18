import type { RawMatch, RawScore, RawSquadMember, RawScorersResponse, RawTeam } from "./schema"

export type MatchStage = "group" | "r32" | "r16" | "qf" | "sf" | "third" | "final"
export type MatchStatus = "scheduled" | "live" | "finished"

export interface MappedTeam {
  externalId: string
  name: string
  shortName: string | null
  tla: string | null
  crestUrl: string | null
}

export interface MappedMatch {
  externalId: string
  stage: MatchStage
  groupName: string | null
  kickoff: Date
  status: MatchStatus
  homeScore: number | null
  awayScore: number | null
  homeScoreRegular: number | null
  awayScoreRegular: number | null
  wentToExtraTime: boolean
  homePens: number | null
  awayPens: number | null
  winnerSide: "home" | "away" | null
  homeTeam: MappedTeam | null
  awayTeam: MappedTeam | null
}

const STAGE_MAP: Record<RawMatch["stage"], MatchStage> = {
  GROUP_STAGE: "group",
  LAST_32: "r32",
  LAST_16: "r16",
  QUARTER_FINALS: "qf",
  SEMI_FINALS: "sf",
  THIRD_PLACE: "third",
  FINAL: "final",
}

const STATUS_MAP: Record<RawMatch["status"], MatchStatus> = {
  SCHEDULED: "scheduled",
  TIMED: "scheduled",
  POSTPONED: "scheduled",
  SUSPENDED: "scheduled",
  IN_PLAY: "live",
  PAUSED: "live",
  LIVE: "live",
  FINISHED: "finished",
  AWARDED: "finished",
  CANCELLED: "finished",
}

export function mapTeam(raw: RawTeam): MappedTeam | null {
  if (raw.id === null) return null // TBD knockout slot — no team known yet
  return {
    externalId: String(raw.id),
    name: raw.name ?? raw.shortName ?? raw.tla ?? "Unknown",
    shortName: raw.shortName,
    tla: raw.tla,
    crestUrl: raw.crest,
  }
}

/**
 * Predictions are scored against the final *played* score: after extra time
 * when there was one, but before penalties. football-data.org folds penalty
 * kicks into `fullTime` once a shootout happens (e.g. regularTime 1-1,
 * penalties 3-4 → fullTime 4-5), so for shootout matches the played score is
 * reconstructed from regularTime + extraTime instead of trusting `fullTime`.
 */
function mapScore(score: RawScore) {
  const played =
    score.duration === "PENALTY_SHOOTOUT"
      ? {
          home:
            score.regularTime?.home === null || score.regularTime?.home === undefined
              ? null
              : score.regularTime.home + (score.extraTime?.home ?? 0),
          away:
            score.regularTime?.away === null || score.regularTime?.away === undefined
              ? null
              : score.regularTime.away + (score.extraTime?.away ?? 0),
        }
      : score.fullTime

  const regular = score.duration === "REGULAR" ? score.fullTime : (score.regularTime ?? score.fullTime)

  return {
    homeScore: played.home,
    awayScore: played.away,
    homeScoreRegular: regular.home,
    awayScoreRegular: regular.away,
    wentToExtraTime: score.duration !== "REGULAR",
    homePens: score.duration === "PENALTY_SHOOTOUT" ? (score.penalties?.home ?? null) : null,
    awayPens: score.duration === "PENALTY_SHOOTOUT" ? (score.penalties?.away ?? null) : null,
    winnerSide:
      score.winner === "HOME_TEAM" ? ("home" as const) : score.winner === "AWAY_TEAM" ? ("away" as const) : null,
  }
}

export interface MappedPlayer {
  externalId: string
  name: string
  position: string | null
}

export function mapSquadMember(raw: RawSquadMember): MappedPlayer {
  return { externalId: String(raw.id), name: raw.name, position: raw.position }
}

/** Cumulative tournament goals keyed by player external id. Players absent from the scorers list have 0 goals. */
export function mapScorerTotals(raw: RawScorersResponse): Map<string, number> {
  return new Map(raw.scorers.map((s) => [String(s.player.id), s.goals]))
}

export function mapMatch(raw: RawMatch): MappedMatch {
  const status = STATUS_MAP[raw.status]
  const score = mapScore(raw.score)
  return {
    externalId: String(raw.id),
    stage: STAGE_MAP[raw.stage],
    groupName: raw.group?.replace("GROUP_", "") ?? null,
    kickoff: new Date(raw.utcDate),
    status,
    homeTeam: mapTeam(raw.homeTeam),
    awayTeam: mapTeam(raw.awayTeam),
    ...score,
    // The provider live-updates `winner` to whoever currently leads — a
    // winner only exists once the match is actually over.
    winnerSide: status === "finished" ? score.winnerSide : null,
  }
}
