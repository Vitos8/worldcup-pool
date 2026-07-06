import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Neon's pooled connection runs through PgBouncer (transaction mode), which
// doesn't support prepared statements.
const client = postgres(process.env.DATABASE_URL!, { prepare: false });
export const db = drizzle(client, { schema });
export * from "./schema";