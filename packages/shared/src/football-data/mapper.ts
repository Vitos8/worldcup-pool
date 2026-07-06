import type { RawMatch, RawScore, RawTeam } from "./schema"

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
 * football-data.org folds penalties into `fullTime` once a shootout happens
 * (e.g. regularTime 1-1, penalties 3-4 → fullTime 4-5). Our schema stores the
 * regular-time score and the penalty score as separate columns, so they need
 * to be pulled apart here rather than trusting `fullTime` directly.
 */
function mapScore(score: RawScore) {
  const regular = score.duration === "REGULAR" ? score.fullTime : (score.regularTime ?? score.fullTime)

  return {
    homeScore: regular.home,
    awayScore: regular.away,
    homePens: score.duration === "PENALTY_SHOOTOUT" ? (score.penalties?.home ?? null) : null,
    awayPens: score.duration === "PENALTY_SHOOTOUT" ? (score.penalties?.away ?? null) : null,
    winnerSide:
      score.winner === "HOME_TEAM" ? ("home" as const) : score.winner === "AWAY_TEAM" ? ("away" as const) : null,
  }
}

export function mapMatch(raw: RawMatch): MappedMatch {
  return {
    externalId: String(raw.id),
    stage: STAGE_MAP[raw.stage],
    groupName: raw.group?.replace("GROUP_", "") ?? null,
    kickoff: new Date(raw.utcDate),
    status: STATUS_MAP[raw.status],
    homeTeam: mapTeam(raw.homeTeam),
    awayTeam: mapTeam(raw.awayTeam),
    ...mapScore(raw.score),
  }
}
