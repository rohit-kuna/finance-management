import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

if (!databaseUrl || typeof databaseUrl !== "string") {
  throw new Error(
    "Missing DATABASE_URL. Set DATABASE_URL in .env.local or your shell environment."
  );
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes("supabase.com") ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool, { schema });

