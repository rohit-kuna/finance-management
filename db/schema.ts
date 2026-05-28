import {
  pgTable,
  serial,
  varchar,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import type { AppRole } from "@/app/lib/roles";

/**
 * Users table
 * - One row per Clerk user
 * - Authorization lives here
 */
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),

    // Clerk user ID (source of truth)
    clerkUserId: varchar("clerk_user_id", { length: 255 })
      .notNull()
      .unique(),

    email: varchar("email", { length: 255 }).notNull(),

    role: varchar("role", { length: 20 })
      .notNull()
      .$type<AppRole>(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    clerkUserIdx: index("users_clerk_user_id_idx").on(
      table.clerkUserId
    ),
  })
);
