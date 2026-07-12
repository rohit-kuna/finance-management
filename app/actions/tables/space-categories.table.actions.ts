"use server";

import { and, count, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { budget, spaceCategories, userCategories, userCategorySpaceCategoryMappings, type CategoryType } from "@/db/schema";
import type { SpaceCategoryRecordDto } from "@/app/lib/finance.types";

function toSpaceCategoryDto(record: typeof spaceCategories.$inferSelect): SpaceCategoryRecordDto {
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

export async function getSpaceCategoriesByOrg(orgId: number): Promise<SpaceCategoryRecordDto[]> {
  const records = await db
    .select()
    .from(spaceCategories)
    .where(eq(spaceCategories.orgId, orgId))
    .orderBy(desc(spaceCategories.createdAt));
  return records.map(toSpaceCategoryDto);
}

export async function getSpaceCategoryByOrgAndName(orgId: number, name: string, excludeId?: number) {
  const [record] = await db
    .select()
    .from(spaceCategories)
    .where(
      and(
        eq(spaceCategories.orgId, orgId),
        sql`lower(${spaceCategories.name}) = lower(${name})`,
        excludeId != null ? ne(spaceCategories.id, excludeId) : undefined
      )
    )
    .limit(1);
  return record ? toSpaceCategoryDto(record) : null;
}

export async function getSpaceCategoryById(id: number) {
  const [record] = await db.select().from(spaceCategories).where(eq(spaceCategories.id, id)).limit(1);
  return record ?? null;
}

export async function createSpaceCategoryRecord(input: {
  orgId: number;
  name: string;
  type: CategoryType;
  createdBy: string;
}) {
  const [record] = await db.insert(spaceCategories).values(input).returning();
  return record ?? null;
}

export async function updateSpaceCategoryRecord(
  id: number,
  input: Partial<{
    name: string;
    type: CategoryType;
    updatedAt: Date;
  }>
) {
  const [record] = await db.update(spaceCategories).set(input).where(eq(spaceCategories.id, id)).returning();
  return record ?? null;
}

export async function getSpaceCategoryUsageCounts(spaceCategoryId: number) {
  const [[budgetUsage], [directUsage], [mappingUsage]] = await Promise.all([
    db.select({ count: count(budget.id) }).from(budget).where(eq(budget.spaceCategoryId, spaceCategoryId)),
    db
      .select({ count: count(userCategories.id) })
      .from(userCategories)
      .where(eq(userCategories.spaceCategoryId, spaceCategoryId)),
    db
      .select({ count: count(userCategorySpaceCategoryMappings.id) })
      .from(userCategorySpaceCategoryMappings)
      .where(eq(userCategorySpaceCategoryMappings.spaceCategoryId, spaceCategoryId)),
  ]);

  return {
    budgetCount: Number(budgetUsage?.count ?? 0),
    mappingCount: Number(directUsage?.count ?? 0) + Number(mappingUsage?.count ?? 0),
  };
}

export async function deleteSpaceCategoryRecord(id: number) {
  const [record] = await db.delete(spaceCategories).where(eq(spaceCategories.id, id)).returning();
  return record ?? null;
}
