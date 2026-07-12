"use server";

import { and, count, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { financeTransactions, userCategories } from "@/db/schema";
import type { UserCategoryRecordDto } from "@/app/lib/finance.types";

function toUserCategoryDto(record: typeof userCategories.$inferSelect): UserCategoryRecordDto {
  return {
    id: record.id,
    orgId: record.orgId,
    spaceCategoryId: record.spaceCategoryId,
    name: record.name,
    createdBy: record.createdBy,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function getUserCategoriesByOrg(orgId: number): Promise<UserCategoryRecordDto[]> {
  const records = await db
    .select()
    .from(userCategories)
    .where(eq(userCategories.orgId, orgId))
    .orderBy(desc(userCategories.createdAt));
  return records.map(toUserCategoryDto);
}

export async function getUserCategoryByIdAndOrg(id: number, orgId: number): Promise<{ id: number } | null> {
  const [record] = await db
    .select({ id: userCategories.id })
    .from(userCategories)
    .where(and(eq(userCategories.id, id), eq(userCategories.orgId, orgId)))
    .limit(1);
  return record ?? null;
}

export async function getUserCategoryByOrgAndName(
  orgId: number,
  name: string,
  excludeId?: number
): Promise<UserCategoryRecordDto | null> {
  const [record] = await db
    .select()
    .from(userCategories)
    .where(
      and(
        eq(userCategories.orgId, orgId),
        sql`lower(${userCategories.name}) = lower(${name})`,
        excludeId != null ? ne(userCategories.id, excludeId) : undefined
      )
    )
    .limit(1);
  return record ? toUserCategoryDto(record) : null;
}

export async function getUserCategoryById(id: number) {
  const [record] = await db.select().from(userCategories).where(eq(userCategories.id, id)).limit(1);
  return record ?? null;
}

export async function createUserCategoryRecord(input: {
  orgId: number;
  name: string;
  createdBy: string;
  spaceCategoryId?: number | null;
}) {
  const [record] = await db.insert(userCategories).values(input).returning();
  return record ?? null;
}

export async function updateUserCategoryRecord(
  id: number,
  input: Partial<{
    name: string;
    spaceCategoryId: number | null;
    updatedAt: Date;
  }>
) {
  const [record] = await db.update(userCategories).set(input).where(eq(userCategories.id, id)).returning();
  return record ?? null;
}

export async function getUserCategoryUsageCount(userCategoryId: number) {
  const [record] = await db
    .select({ count: count(financeTransactions.id) })
    .from(financeTransactions)
    .where(eq(financeTransactions.userCategoryId, userCategoryId));
  return Number(record?.count ?? 0);
}

export async function deleteUserCategoryRecord(id: number) {
  const [record] = await db.delete(userCategories).where(eq(userCategories.id, id)).returning();
  return record ?? null;
}
