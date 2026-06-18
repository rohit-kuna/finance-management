"use server";

import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { budget, categories } from "@/db/schema";
import { formatBudgetMonth, getBudgetMonthFromDate } from "@/app/lib/budget-month";
import type { BudgetRecordDto } from "@/app/lib/finance.types";
import type { BudgetScope } from "@/db/schema";

function toBudgetDto(
  record: typeof budget.$inferSelect & { categoryName: string }
): BudgetRecordDto {
  const month = getBudgetMonthFromDate(record.periodFrom);

  return {
    id: record.id,
    orgId: record.orgId,
    userId: record.userId,
    categoryId: record.categoryId,
    categoryName: record.categoryName,
    scope: record.scope as BudgetScope,
    amount: record.amount.toString(),
    month,
    monthLabel: formatBudgetMonth(month),
    periodFrom: record.periodFrom,
    periodTo: record.periodTo,
    createdBy: record.createdBy,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function getBudgetsByOrg(orgId: number): Promise<BudgetRecordDto[]> {
  const records = await db
    .select({
      id: budget.id,
      orgId: budget.orgId,
      userId: budget.userId,
      categoryId: budget.categoryId,
      categoryName: categories.name,
      scope: budget.scope,
      amount: budget.amount,
      periodFrom: budget.periodFrom,
      periodTo: budget.periodTo,
      createdBy: budget.createdBy,
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt,
    })
    .from(budget)
    .innerJoin(categories, eq(categories.id, budget.categoryId))
    .where(eq(budget.orgId, orgId))
    .orderBy(desc(budget.createdAt));
  return records.map(toBudgetDto);
}

export async function getBudgetById(id: number): Promise<BudgetRecordDto | null> {
  const [record] = await db
    .select({
      id: budget.id,
      orgId: budget.orgId,
      userId: budget.userId,
      categoryId: budget.categoryId,
      categoryName: categories.name,
      scope: budget.scope,
      amount: budget.amount,
      periodFrom: budget.periodFrom,
      periodTo: budget.periodTo,
      createdBy: budget.createdBy,
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt,
    })
    .from(budget)
    .innerJoin(categories, eq(categories.id, budget.categoryId))
    .where(eq(budget.id, id))
    .limit(1);

  return record ? toBudgetDto(record) : null;
}

export async function createBudgetRecord(input: {
  orgId: number;
  userId: string | null;
  categoryId: number;
  scope: BudgetScope;
  amount: string;
  periodFrom: string;
  periodTo: string;
  createdBy: string;
}) {
  const [record] = await db.insert(budget).values(input).returning();
  return record ?? null;
}

export async function updateBudgetRecord(
  id: number,
  input: Partial<{
    categoryId: number;
    userId: string | null;
    scope: BudgetScope;
    amount: string;
    periodFrom: string;
    periodTo: string;
    updatedAt: Date;
  }>
) {
  const [record] = await db.update(budget).set(input).where(eq(budget.id, id)).returning();
  return record ?? null;
}

export async function deleteBudgetRecord(id: number) {
  const [record] = await db.delete(budget).where(eq(budget.id, id)).returning();
  return record ?? null;
}
