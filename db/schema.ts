import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
  uniqueIndex,
  serial,
  integer,
  smallint,
  numeric,
  text,
  date,
  unique,
  check,
  boolean,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { AppRole } from "@/app/lib/roles";

export type BudgetScope = "personal" | "family";
export type ExpenseType = "expense" | "income";
export type CategoryType = ExpenseType;
export type TransferStatus = "open" | "settled" | "closed";

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

export const counterParty = pgTable(
  "counter_party",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    orgId: integer("org_id").notNull().references(() => organizations.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    counterPartyOrgNameUnique: unique("counter_party_org_name_unique").on(table.orgId, table.name),
    counterPartyOrgIdx: index("counter_party_org_id_idx").on(table.orgId),
  })
);

export const transactionModes = pgTable(
  "transaction_modes",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    userId: uuid("user_id").notNull().references(() => users.id),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    transactionModeUserNameUnique: unique("transaction_modes_user_name_unique").on(table.userId, table.name),
    transactionModeUserDefaultUnique: uniqueIndex("transaction_modes_user_default_unique")
      .on(table.userId)
      .where(sql`${table.isDefault}`),
    transactionModeUserIdx: index("transaction_modes_user_id_idx").on(table.userId),
  })
);

export const financeTransactions = pgTable(
  "finance_transactions",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().references(() => organizations.id),
    userId: uuid("user_id").notNull().references(() => users.id),
    categoryId: integer("category_id").notNull().references(() => categories.id),
    counterPartyId: integer("counter_party_id").references(() => counterParty.id, {
      onDelete: "set null",
    }),
    transactionModeId: integer("transaction_mode_id").references(() => transactionModes.id, {
      onDelete: "set null",
    }),
    transferStatus: varchar("transfer_status", { length: 10 }).$type<TransferStatus>(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    type: varchar("type", { length: 10 }).notNull().default("expense").$type<ExpenseType>(),
    necessityScore: smallint("necessity_score").notNull().default(1),
    note: text("note"),
    transactionTimestamp: timestamp("transaction_timestamp", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    necessityScoreCheck: check(
      "finance_transactions_necessity_score_check",
      sql`${table.necessityScore} >= 1 AND ${table.necessityScore} <= 5`
    ),
    exactDuplicateIdx: uniqueIndex("finance_transactions_exact_duplicate_unique").on(
      table.amount,
      table.userId,
      table.categoryId,
      sql`coalesce(${table.note}, '')`,
      table.transactionTimestamp
    ),
    orgIdx: index("finance_transactions_org_id_idx").on(table.orgId),
    userIdx: index("finance_transactions_user_id_idx").on(table.userId),
    categoryIdx: index("finance_transactions_category_id_idx").on(table.categoryId),
    counterPartyIdx: index("finance_transactions_counter_party_id_idx").on(table.counterPartyId),
    transactionModeIdx: index("finance_transactions_transaction_mode_id_idx").on(table.transactionModeId),
    transferStatusIdx: index("finance_transactions_transfer_status_idx").on(table.transferStatus),
    occurredAtIdx: index("finance_transactions_occurred_at_idx").on(table.transactionTimestamp),
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
