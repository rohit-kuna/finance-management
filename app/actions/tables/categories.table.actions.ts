"use server";

import { and, count, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { budget, categories, financeTransactions, subcategorySpaceMappings, type CategoryType } from "@/db/schema";
import type { CategoryRecordDto } from "@/app/lib/finance.types";

function toCategoryDto(record: typeof categories.$inferSelect): CategoryRecordDto {
  return {
    id: record.id,
    orgId: record.orgId,
    name: record.name,
    type: record.type,
    createdBy: record.createdBy,
    isSystemDefault: record.isSystemDefault,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function getCategoriesByOrg(orgId: number): Promise<CategoryRecordDto[]> {
  const records = await db
    .select()
    .from(categories)
    .where(eq(categories.orgId, orgId))
    .orderBy(desc(categories.createdAt));
  return records.map(toCategoryDto);
}

export async function getCategoryByOrgAndName(orgId: number, name: string, excludeId?: number) {
  const [record] = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.orgId, orgId),
        sql`lower(${categories.name}) = lower(${name})`,
        excludeId != null ? ne(categories.id, excludeId) : undefined
      )
    )
    .limit(1);
  return record ? toCategoryDto(record) : null;
}

export async function getCategoryById(id: number) {
  const [record] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return record ?? null;
}

export async function getSystemDefaultCategoryForOrg(orgId: number, type: CategoryType) {
  const [record] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.orgId, orgId), eq(categories.type, type), eq(categories.isSystemDefault, true)))
    .limit(1);
  return record ? toCategoryDto(record) : null;
}

export async function createCategoryRecord(input: {
  orgId: number;
  name: string;
  type: CategoryType;
  createdBy: string;
  isSystemDefault?: boolean;
}) {
  const [record] = await db.insert(categories).values(input).returning();
  return record ?? null;
}

/**
 * Seeds the "Others" fallback category for a shared space, one per
 * transaction type (expense/income) — the implicit grouping target for any
 * subcategory a member hasn't explicitly mapped in this space. Idempotent:
 * safe to call on every shared-org creation without risk of duplicates.
 */
export async function ensureSystemDefaultCategories(orgId: number, createdBy: string) {
  // Category names are unique per org regardless of type
  // (categories_name_org_unique), so the two "Others" categories need
  // distinct names even though they share the isSystemDefault fallback role.
  await db
    .insert(categories)
    .values([
      { orgId, name: "Others (Expense)", type: "expense", createdBy, isSystemDefault: true },
      { orgId, name: "Others (Income)", type: "income", createdBy, isSystemDefault: true },
    ])
    .onConflictDoNothing({
      target: [categories.orgId, categories.type],
      where: eq(categories.isSystemDefault, true),
    });
}

export async function updateCategoryRecord(
  id: number,
  input: Partial<{
    name: string;
    type: CategoryType;
    updatedAt: Date;
  }>
) {
  const [record] = await db.update(categories).set(input).where(eq(categories.id, id)).returning();
  return record ?? null;
}

export async function getCategoryUsageCounts(categoryId: number) {
  const [[budgetUsage], [expenseUsage], [mappingUsage]] = await Promise.all([
    db.select({ count: count(budget.id) }).from(budget).where(eq(budget.categoryId, categoryId)),
    db.select({ count: count(financeTransactions.id) }).from(financeTransactions).where(eq(financeTransactions.categoryId, categoryId)),
    db
      .select({ count: count(subcategorySpaceMappings.id) })
      .from(subcategorySpaceMappings)
      .where(eq(subcategorySpaceMappings.categoryId, categoryId)),
  ]);

  return {
    budgetCount: Number(budgetUsage?.count ?? 0),
    expenseCount: Number(expenseUsage?.count ?? 0),
    mappingCount: Number(mappingUsage?.count ?? 0),
  };
}

export async function deleteCategoryRecord(id: number) {
  const [record] = await db.delete(categories).where(eq(categories.id, id)).returning();
  return record ?? null;
}
