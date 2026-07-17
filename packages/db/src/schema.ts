import { relations } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  text,
  integer,
  real,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/**
 * World Cup prediction pool — Drizzle schema (PostgreSQL).
 *
 * Two groups:
 *  1. Auth tables (user/session/account/verification) — owned by Better Auth.
 *     Generate/refresh them with `npx @better-auth/cli generate`. They're
 *     included here so the whole model lives in one place and FKs line up.
 *     The `username` + `displayUsername` columns come from the username plugin.
 *  2. Domain tables (competition/team/match/prediction) — yours.
 *
 * IDs are text (UUID) everywhere so auth and domain FKs share one type.
 */

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date());

/* ----------------------------- enums ----------------------------- */
export const competitionType = pgEnum("competition_type", ["cup", "league"]);
export const matchStage = pgEnum("match_stage", [
  "group", "r32", "r16", "qf", "sf", "third", "final",
]);
export const matchStatus = pgEnum("match_status", ["scheduled", "live", "finished"]);
export const matchSlot = pgEnum("match_slot", ["home", "away"]);

/* --------------------------- auth (Better Auth) --------------------------- */
export const user = pgTable("user", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  // username plugin
  username: text("username").unique(),
  displayUsername: text("display_username"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = pgTable("session", {
  id: id(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index("session_user_idx").on(t.userId)]);

export const account = pgTable("account", {
  id: id(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index("account_user_idx").on(t.userId)]);

export const verification = pgTable("verification", {
  id: id(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/* ------------------------------ domain ------------------------------ */
export const competition = pgTable("competition", {
  id: id(),
  code: text("code").notNull(),            // "WC", "CL" (from football-data.org)
  name: text("name").notNull(),
  season: text("season").notNull(),        // "2026"
  type: competitionType("type").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("competition_code_season_idx").on(t.code, t.season)]);

export const team = pgTable("team", {
  id: id(),
  competitionId: text("competition_id").notNull().references(() => competition.id, { onDelete: "cascade" }),
  externalId: text("external_id").notNull(),   // provider id, for the mapper
  name: text("name").notNull(),
  shortName: text("short_name"),
  tla: text("tla"),                            // "NED", "ARG" — 3-letter code shown in the UI
  countryCode: text("country_code"),           // "CA", "MA" — drives the flag
  crestUrl: text("crest_url"),
}, (t) => [
  index("team_competition_idx").on(t.competitionId),
  uniqueIndex("team_competition_external_idx").on(t.competitionId, t.externalId),
]);

export const match = pgTable("match", {
  id: id(),
  competitionId: text("competition_id").notNull().references(() => competition.id, { onDelete: "cascade" }),
  externalId: text("external_id").notNull(),
  stage: matchStage("stage").notNull(),
  groupName: text("group_name"),               // "A".."L", null for knockout
  // nullable so knockout slots can exist before teams are known (TBD)
  homeTeamId: text("home_team_id").references(() => team.id),
  awayTeamId: text("away_team_id").references(() => team.id),
  kickoff: timestamp("kickoff", { withTimezone: true }).notNull(), // the lock boundary
  status: matchStatus("status").default("scheduled").notNull(),
  // final played score: after extra time when there was one, before penalties
  // — this is what the UI displays
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  // 90-minute score — what predictions are scored against
  homeScoreRegular: integer("home_score_regular"),
  awayScoreRegular: integer("away_score_regular"),
  wentToExtraTime: boolean("went_to_extra_time").default(false).notNull(),
  homePens: integer("home_pens"),
  awayPens: integer("away_pens"),
  winnerTeamId: text("winner_team_id").references(() => team.id),
  // bracket wiring: where the winner advances, and into which slot
  nextMatchId: text("next_match_id"),          // self-FK added via relation below
  nextSlot: matchSlot("next_slot"),
  lastPolledAt: timestamp("last_polled_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index("match_competition_idx").on(t.competitionId),
  index("match_kickoff_idx").on(t.kickoff),
  index("match_status_idx").on(t.status),
  uniqueIndex("match_competition_external_idx").on(t.competitionId, t.externalId),
]);

export const prediction = pgTable("prediction", {
  id: id(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  matchId: text("match_id").notNull().references(() => match.id, { onDelete: "cascade" }),
  homeScore: integer("home_score").notNull(),
  awayScore: integer("away_score").notNull(),
  // required (by the app layer) when the predicted score is a draw:
  // who advances on penalties — worth a +1 bonus when correct
  penaltyWinnerTeamId: text("penalty_winner_team_id").references(() => team.id),
  // null until the match is settled; real because the final pays ×2.5
  points: real("points"),
  settledAt: timestamp("settled_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  // one prediction per user per match
  uniqueIndex("prediction_user_match_idx").on(t.userId, t.matchId),
  index("prediction_match_idx").on(t.matchId),
  index("prediction_user_idx").on(t.userId),
]);

// One "who wins the whole cup" pick per user per competition. The entry
// deadline is enforced in the app layer, not here.
export const championPick = pgTable("champion_pick", {
  id: id(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  competitionId: text("competition_id").notNull().references(() => competition.id, { onDelete: "cascade" }),
  teamId: text("team_id").notNull().references(() => team.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  uniqueIndex("champion_pick_user_competition_idx").on(t.userId, t.competitionId),
]);

/* ----------------------------- relations ----------------------------- */
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  predictions: many(prediction),
}));

export const competitionRelations = relations(competition, ({ many }) => ({
  teams: many(team),
  matches: many(match),
}));

export const matchRelations = relations(match, ({ one, many }) => ({
  competition: one(competition, { fields: [match.competitionId], references: [competition.id] }),
  homeTeam: one(team, { fields: [match.homeTeamId], references: [team.id], relationName: "homeTeam" }),
  awayTeam: one(team, { fields: [match.awayTeamId], references: [team.id], relationName: "awayTeam" }),
  nextMatch: one(match, { fields: [match.nextMatchId], references: [match.id], relationName: "advances" }),
  predictions: many(prediction),
}));

export const predictionRelations = relations(prediction, ({ one }) => ({
  user: one(user, { fields: [prediction.userId], references: [user.id] }),
  match: one(match, { fields: [prediction.matchId], references: [match.id] }),
}));

export const championPickRelations = relations(championPick, ({ one }) => ({
  user: one(user, { fields: [championPick.userId], references: [user.id] }),
  competition: one(competition, { fields: [championPick.competitionId], references: [competition.id] }),
  team: one(team, { fields: [championPick.teamId], references: [team.id] }),
}));