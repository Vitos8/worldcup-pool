export type TeamTone = "gold" | "red" | "blue" | "gray"

export interface Team {
  id?: string // DB team id — present on server-fetched fixtures
  code: string // "CAN"
  name: string // "Canada"
  tone: TeamTone
  crestUrl?: string | null // national-team flag from football-data.org
}

export interface Match {
  id: string
  date?: string // "Sun 28.06"
  status?: string // "Full time"
  home: Team
  away: Team
  homeScore?: string // "1 (3)" | "0"
  awayScore?: string
  winner?: "home" | "away"
  pick?: string // "0:1"
  points?: number // 5
}

export const TONE_CLASS: Record<TeamTone, string> = {
  gold: "bg-[#f6e9cf] text-[#9a7a2e]",
  red: "bg-[#f3dede] text-[#a23b3b]",
  blue: "bg-[#dbe6f5] text-[#2a5aa0]",
  gray: "bg-[#e2e2e2] text-[#4a4a4a]",
}

const TONES: TeamTone[] = ["gold", "red", "blue", "gray"]

/** Stable badge tone for a team without storing a color anywhere. */
export function deriveTone(code: string): TeamTone {
  let hash = 0
  for (const char of code) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return TONES[Math.abs(hash) % TONES.length]!
}

export type BracketStage = "r16" | "qf" | "sf" | "third" | "final"

/** The signed-in user's prediction for a fixture. */
export interface MyPick {
  home: number
  away: number
  penaltyWinnerTeamId: string | null // set when the pick is a draw
  points: number | null // null until the match is settled
}

/** Server-fetched fixture, ready for the bracket UI. */
export interface BracketFixture {
  id: string
  stage: BracketStage
  kickoff: string // ISO — formatted client-side in the viewer's timezone
  status: "scheduled" | "live" | "finished"
  home: Team | null // null while the slot is still TBD
  away: Team | null
  homeScore: number | null
  awayScore: number | null
  wentToExtraTime: boolean
  homePens: number | null
  awayPens: number | null
  winner: "home" | "away" | null
  myPick: MyPick | null
}
