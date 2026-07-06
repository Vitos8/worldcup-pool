import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins/username";
import { db } from "@workspace/db";
import { pickUnassignedAvatar } from "./player-avatars";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg" }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  session: {
    // Short-lived signed cookie copy of the session — skips the DB lookup on
    // most requests instead of hitting Neon for every getSession call.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  databaseHooks: {
    user: {
      create: {
        // Every new member gets a football-legend avatar instead of their
        // Google profile photo — assigned once, kept forever.
        before: async (user) => ({
          data: { ...user, image: await pickUnassignedAvatar() },
        }),
      },
    },
  },
  plugins: [username(), nextCookies()],
});
