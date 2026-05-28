import "dotenv/config";
import type { Config } from "drizzle-kit";

export default {
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;

/*
https://orm.drizzle.team/docs/get-started/postgresql-new

# 1. Define schema
src/db/schema.ts

# 2. Generate migration
npx drizzle-kit generate --config drizzle.config.ts

# 3. Apply migration
npx drizzle-kit push --config drizzle.config.ts
*/
