"use server";

import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { budget, categories, financeTransactions, type CategoryType } from "@/db/schema";
import type { CategoryRecordDto } from "@/app/lib/finance.types";

function toCategoryDto(record: typeof categories.$inferSelect): CategoryRecordDto {
  return {
    id: record.id,
    orgId: record.orgId,
    name: record.name,
    type: record.type,
    createdBy: record.createdBy,
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

export async function getCategoryById(id: number) {
  const [record] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return record ?? null;
}

export async function createCategoryRecord(input: {
  orgId: number;
  name: string;
  type: CategoryType;
  createdBy: string;
}) {
  const [record] = await db.insert(categories).values(input).returning();
  return record ?? null;
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
  const [budgetUsage] = await db
    .select({
      count: count(budget.id),
    })
    .from(budget)
    .where(eq(budget.categoryId, categoryId));

  const [expenseUsage] = await db
    .select({
      count: count(financeTransactions.id),
    })
    .from(financeTransactions)
    .where(eq(financeTransactions.categoryId, categoryId));

  return {
    budgetCount: Number(budgetUsage?.count ?? 0),
    expenseCount: Number(expenseUsage?.count ?? 0),
  };
}

export async function deleteCategoryRecord(id: number) {
  const [record] = await db.delete(categories).where(eq(categories.id, id)).returning();
  return record ?? null;
}
