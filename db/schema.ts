import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
  serial,
  integer,
  smallint,
  numeric,
  text,
  date,
  unique,
  check,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { AppRole } from "@/app/lib/roles";

export type BudgetScope = "personal" | "family";
export type ExpenseType = "expense" | "income";
export type CategoryType = ExpenseType;
export type ExpenseMode = "online" | "cash";
export type ExpenseScope = "personal" | "family";

// organizations declared first; createdBy refs users via lazy arrow fn
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  inviteCode: varchar("invite_code", { length: 64 }).notNull().unique(),
  createdBy: uuid("created_by").notNull().references((): AnyPgColumn => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    clerkUserId: varchar("clerk_user_id", { length: 255 }).notNull().unique(),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    role: varchar("role", { length: 20 }).notNull().$type<AppRole>(),
    orgId: integer("org_id").references(() => organizations.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clerkUserIdx: index("users_clerk_user_id_idx").on(table.clerkUserId),
  })
);

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    orgId: integer("org_id").notNull().references(() => organizations.id),
    type: varchar("type", { length: 10 }).notNull().default("expense").$type<CategoryType>(),
    createdBy: uuid("created_by").notNull().references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueNamePerOrg: unique("categories_name_org_unique").on(table.name, table.orgId),
  })
);

export const expenses = pgTable(
  "expenses",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().references(() => organizations.id),
    userId: uuid("user_id").notNull().references(() => users.id),
    categoryId: integer("category_id").notNull().references(() => categories.id),
    amount: numeric("amt", { precision: 12, scale: 2 }).notNull(),
    type: varchar("type", { length: 10 }).notNull().default("expense").$type<ExpenseType>(),
    transactionMode: varchar("transaction_mode", { length: 10 }).notNull().default("online").$type<ExpenseMode>(),
    scope: varchar("scope", { length: 10 }).notNull().default("personal").$type<ExpenseScope>(),
    necessityScore: smallint("necessity_score").notNull().default(1),
    note: text("note"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    necessityScoreCheck: check(
      "expenses_necessity_score_check",
      sql`${table.necessityScore} >= 1 AND ${table.necessityScore} <= 5`
    ),
    orgIdx: index("expenses_org_id_idx").on(table.orgId),
    userIdx: index("expenses_user_id_idx").on(table.userId),
    categoryIdx: index("expenses_category_id_idx").on(table.categoryId),
    occurredAtIdx: index("expenses_occurred_at_idx").on(table.occurredAt),
  })
);

export const budget = pgTable(
  "budget",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().references(() => organizations.id),
    userId: uuid("user_id").references(() => users.id),
    categoryId: integer("category_id").notNull().references(() => categories.id),
    scope: varchar("scope", { length: 10 }).notNull().$type<BudgetScope>(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    periodFrom: date("period_from").notNull(),
    periodTo: date("period_to").notNull(),
    createdBy: uuid("created_by").notNull().references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueOrgCategoryScopePeriod: unique("budget_org_category_scope_period_unique").on(
      table.orgId,
      table.categoryId,
      table.scope,
      table.periodFrom,
      table.periodTo
    ),
    uniqueUserCategoryPeriod: unique("budget_user_category_period_unique").on(
      table.userId,
      table.categoryId,
      table.periodFrom,
      table.periodTo
    ),
  })
);
