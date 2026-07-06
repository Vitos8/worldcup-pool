import { z } from "zod"

// Only the fields we actually use are declared — Zod strips unknown keys by
// default, so the rest of football-data.org's payload (area, odds, referees...)
// is safely ignored rather than needing to be modeled.

export const rawTeamSchema = z.object({
  id: z.number().nullable(),
  name: z.string().nullable(),
  shortName: z.string().nullable(),
  tla: z.string().nullable(),
  crest: z.string().nullable(),
})

const scoreLine = z.object({
  home: z.number().nullable(),
  away: z.number().nullable(),
})

export const rawScoreSchema = z.object({
  winner: z.enum(["HOME_TEAM", "AWAY_TEAM", "DRAW"]).nullable(),
  duration: z.enum(["REGULAR", "EXTRA_TIME", "PENALTY_SHOOTOUT"]),
  fullTime: scoreLine,
  regularTime: scoreLine.optional(),
  penalties: scoreLine.optional(),
})

export const rawMatchStatusSchema = z.enum([
  "SCHEDULED",
  "TIMED",
  "IN_PLAY",
  "PAUSED",
  // Undocumented but observed in real payloads (WC 2026, Jul 2026) —
  // the API emits LIVE alongside IN_PLAY/PAUSED for in-progress matches.
  "LIVE",
  "FINISHED",
  "SUSPENDED",
  "POSTPONED",
  "CANCELLED",
  "AWARDED",
])

export const rawMatchSchema = z.object({
  id: z.number(),
  utcDate: z.string(),
  status: rawMatchStatusSchema,
  stage: z.enum([
    "GROUP_STAGE",
    "LAST_32",
    "LAST_16",
    "QUARTER_FINALS",
    "SEMI_FINALS",
    "THIRD_PLACE",
    "FINAL",
  ]),
  group: z.string().nullable(),
  homeTeam: rawTeamSchema,
  awayTeam: rawTeamSchema,
  score: rawScoreSchema,
})

export const rawMatchesResponseSchema = z.object({
  matches: z.array(rawMatchSchema),
})

export type RawTeam = z.infer<typeof rawTeamSchema>
export type RawScore = z.infer<typeof rawScoreSchema>
export type RawMatch = z.infer<typeof rawMatchSchema>
export type RawMatchesResponse = z.infer<typeof rawMatchesResponseSchema>
