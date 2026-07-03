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
  // Each serverless function instance gets its own pool sitting in front of
  // Supabase's pgbouncer transaction pooler — keep max low so many concurrent
  // instances don't collectively exhaust the pooler's connection budget, and
  // fail fast on exhaustion instead of hanging (pg's default is 0 = forever).
  max: 5,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
});

export const db = drizzle(pool, { schema });

