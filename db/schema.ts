import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
  uniqueIndex,
  primaryKey,
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

export type UserScope = "personal" | "shared";
export type BudgetScope = UserScope;
export type ExpenseType = "expense" | "income";
export type CategoryType = ExpenseType;
export type TransferStatus = "open" | "settled" | "closed";

// organizations declared first; createdBy refs users via lazy arrow fn
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  inviteCode: varchar("invite_code", { length: 64 }).notNull().unique(),
  createdBy: uuid("created_by").notNull().references((): AnyPgColumn => users.id),
  isPersonal: boolean("is_personal").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
},
(table) => ({
  personalCreatedByUnique: uniqueIndex("organizations_personal_created_by_unique")
    .on(table.createdBy)
    .where(sql`${table.isPersonal}`),
}));

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    clerkUserId: varchar("clerk_user_id", { length: 255 }).notNull().unique(),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    scope: varchar("scope", { length: 10 }).$type<UserScope>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clerkUserIdx: index("users_clerk_user_id_idx").on(table.clerkUserId),
    scopeCheck: check("users_scope_check", sql`${table.scope} IN ('personal', 'shared')`),
  })
);

export const organizationMembers = pgTable(
  "organization_members",
  {
    orgId: integer("org_id").notNull().references(() => organizations.id),
    userId: uuid("user_id").notNull().references(() => users.id),
    role: varchar("role", { length: 20 }).notNull().$type<AppRole>(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
    isActive: boolean("is_active").notNull().default(true),
    isDefault: boolean("is_default").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.orgId, table.userId] }),
    userIdx: index("organization_members_user_id_idx").on(table.userId),
    userDefaultUnique: uniqueIndex("organization_members_user_default_unique")
      .on(table.userId)
      .where(sql`${table.isDefault}`),
  })
);

// Space-level, admin-defined grouping. A SpaceCategory is just a label a
// member privately maps their own UserCategories into (see
// userCategorySpaceCategoryMappings) — it has no direct children.
export const spaceCategories = pgTable(
  "space_categories",
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
    uniqueNamePerOrg: unique("space_categories_name_org_unique").on(table.name, table.orgId),
    spaceCategoriesOrgIdx: index("space_categories_org_id_idx").on(table.orgId),
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

// User-level, personal grouping. A transaction's only category-shaped FK is
// to a UserCategory (see financeTransactions.userCategoryId); SpaceCategory
// is reached transitively — directly via spaceCategoryId in personal space,
// or via userCategorySpaceCategoryMappings in a shared space. A UserCategory
// with a null spaceCategoryId is "Unmapped".
export const userCategories = pgTable(
  "user_categories",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    orgId: integer("org_id").notNull().references(() => organizations.id),
    spaceCategoryId: integer("space_category_id").references(() => spaceCategories.id, { onDelete: "set null" }),
    createdBy: uuid("created_by").notNull().references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userCategoriesOrgNameUnique: unique("user_categories_org_name_unique").on(table.orgId, table.name),
    userCategoriesOrgIdx: index("user_categories_org_id_idx").on(table.orgId),
    userCategoriesSpaceCategoryIdx: index("user_categories_space_category_id_idx").on(table.spaceCategoryId),
  })
);

// Maps a user's personal UserCategory into a SpaceCategory "shell" in a
// shared space (the target org). Absence of a row means the UserCategory is
// Unmapped for that space — it's simply excluded from that space's views,
// there is no fallback category.
export const userCategorySpaceCategoryMappings = pgTable(
  "user_category_space_category_mappings",
  {
    id: serial("id").primaryKey(),
    userCategoryId: integer("user_category_id")
      .notNull()
      .references(() => userCategories.id, { onDelete: "cascade" }),
    targetOrgId: integer("target_org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    spaceCategoryId: integer("space_category_id")
      .notNull()
      .references(() => spaceCategories.id, { onDelete: "cascade" }),
    updatedBy: uuid("updated_by").notNull().references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueUserCategoryTargetOrg: uniqueIndex("user_category_space_category_mappings_user_category_target_org_unique").on(
      table.userCategoryId,
      table.targetOrgId
    ),
    targetOrgIdx: index("user_category_space_category_mappings_target_org_id_idx").on(table.targetOrgId),
    userCategoryIdx: index("user_category_space_category_mappings_user_category_id_idx").on(table.userCategoryId),
    spaceCategoryIdx: index("user_category_space_category_mappings_space_category_id_idx").on(table.spaceCategoryId),
  })
);

export const tags = pgTable(
  "tags",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    orgId: integer("org_id").notNull().references(() => organizations.id),
    createdBy: uuid("created_by").notNull().references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueNamePerOrg: unique("tags_name_org_unique").on(table.name, table.orgId),
    orgIdx: index("tags_org_id_idx").on(table.orgId),
  })
);

export const transactionModes = pgTable(
  "transaction_modes",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    userId: uuid("user_id").notNull().references(() => users.id),
    orgId: integer("org_id").notNull().references(() => organizations.id),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    transactionModeOrgUserNameUnique: unique("transaction_modes_org_user_name_unique").on(table.orgId, table.userId, table.name),
    transactionModeOrgUserDefaultUnique: uniqueIndex("transaction_modes_org_user_default_unique")
      .on(table.orgId, table.userId)
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
    counterPartyId: integer("counter_party_id").references(() => counterParty.id, {
      onDelete: "set null",
    }),
    transactionModeId: integer("transaction_mode_id").references(() => transactionModes.id, {
      onDelete: "set null",
    }),
    // Required — every transaction always carries a UserCategory (the
    // owner's personal category), mapped or not. SpaceCategory is reached
    // transitively via userCategories.spaceCategoryId /
    // userCategorySpaceCategoryMappings, never stored directly here.
    // Deleting an in-use UserCategory is blocked at the app layer
    // (getUserCategoryUsageCount), so this stays a plain FK rather than
    // onDelete: "set null".
    userCategoryId: integer("user_category_id").notNull().references(() => userCategories.id),
    transferStatus: varchar("transfer_status", { length: 10 }).$type<TransferStatus>(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    type: varchar("type", { length: 10 }).notNull().default("expense").$type<ExpenseType>(),
    necessityScore: smallint("necessity_score").notNull().default(0),
    note: text("note"),
    transactionTimestamp: timestamp("transaction_timestamp", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    necessityScoreCheck: check(
      "finance_transactions_necessity_score_check",
      sql`${table.necessityScore} IN (-1, 0, 1)`
    ),
    exactDuplicateIdx: uniqueIndex("finance_transactions_exact_duplicate_unique").on(
      table.amount,
      table.userId,
      table.userCategoryId,
      sql`coalesce(${table.note}, '')`,
      table.transactionTimestamp
    ),
    userCategoryIdx: index("finance_transactions_user_category_id_idx").on(table.userCategoryId),
    orgTimestampIdx: index("finance_transactions_org_id_transaction_timestamp_idx").on(
      table.orgId,
      table.transactionTimestamp.desc()
    ),
    orgUserIdx: index("finance_transactions_org_id_user_id_idx").on(table.orgId, table.userId),
  })
);

export const transactionTags = pgTable(
  "transaction_tags",
  {
    transactionId: integer("transaction_id")
      .notNull()
      .references(() => financeTransactions.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.transactionId, table.tagId] }),
    transactionIdx: index("transaction_tags_transaction_id_idx").on(table.transactionId),
    tagIdx: index("transaction_tags_tag_id_idx").on(table.tagId),
  })
);

export const budget = pgTable(
  "budget",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().references(() => organizations.id),
    userId: uuid("user_id").references(() => users.id),
    spaceCategoryId: integer("space_category_id").notNull().references(() => spaceCategories.id),
    scope: varchar("scope", { length: 10 }).notNull().$type<BudgetScope>(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    periodFrom: date("period_from").notNull(),
    periodTo: date("period_to").notNull(),
    createdBy: uuid("created_by").notNull().references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueOrgCategoryScopePeriod: unique("budget_org_space_category_scope_period_unique").on(
      table.orgId,
      table.spaceCategoryId,
      table.scope,
      table.periodFrom,
      table.periodTo
    ),
    uniqueUserCategoryPeriod: unique("budget_user_space_category_period_unique").on(
      table.userId,
      table.spaceCategoryId,
      table.periodFrom,
      table.periodTo
    ),
    budgetOrgIdx: index("budget_org_id_idx").on(table.orgId),
    budgetUserIdx: index("budget_user_id_idx").on(table.userId),
    budgetSpaceCategoryIdx: index("budget_space_category_id_idx").on(table.spaceCategoryId),
  })
);
