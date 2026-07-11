"use server";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { categories, subcategories, subcategorySpaceMappings } from "@/db/schema";

export type SubcategoryMappingRecordDto = {
  id: number;
  subcategoryId: number;
  targetOrgId: number;
  categoryId: number;
  updatedBy: string;
  updatedAt: string;
};

function toMappingDto(record: typeof subcategorySpaceMappings.$inferSelect): SubcategoryMappingRecordDto {
  return {
    id: record.id,
    subcategoryId: record.subcategoryId,
    targetOrgId: record.targetOrgId,
    categoryId: record.categoryId,
    updatedBy: record.updatedBy,
    updatedAt: record.updatedAt.toISOString(),
  };
}

/**
 * A subcategory with no row here is unmapped for that space — the read path
 * treats that as an implicit fallback to the space's "Others" category, it is
 * never backfilled as a physical row.
 */
export async function getMappingsForUserAndOrg(userId: string, targetOrgId: number): Promise<SubcategoryMappingRecordDto[]> {
  const records = await db
    .select({ mapping: subcategorySpaceMappings })
    .from(subcategorySpaceMappings)
    .innerJoin(subcategories, eq(subcategories.id, subcategorySpaceMappings.subcategoryId))
    .where(and(eq(subcategorySpaceMappings.targetOrgId, targetOrgId), eq(subcategories.createdBy, userId)));

  return records.map((record) => toMappingDto(record.mapping));
}

export async function upsertMapping(input: {
  subcategoryId: number;
  targetOrgId: number;
  categoryId: number;
  updatedBy: string;
}) {
  const [record] = await db
    .insert(subcategorySpaceMappings)
    .values(input)
    .onConflictDoUpdate({
      target: [subcategorySpaceMappings.subcategoryId, subcategorySpaceMappings.targetOrgId],
      set: {
        categoryId: input.categoryId,
        updatedBy: input.updatedBy,
        updatedAt: new Date(),
      },
    })
    .returning();
  return record ? toMappingDto(record) : null;
}

export async function deleteMapping(subcategoryId: number, targetOrgId: number) {
  const [record] = await db
    .delete(subcategorySpaceMappings)
    .where(and(eq(subcategorySpaceMappings.subcategoryId, subcategoryId), eq(subcategorySpaceMappings.targetOrgId, targetOrgId)))
    .returning();
  return record ? toMappingDto(record) : null;
}

export async function deleteMappingsForUserAndOrg(userId: string, targetOrgId: number) {
  const subcategoryIds = await db
    .select({ id: subcategories.id })
    .from(subcategories)
    .where(eq(subcategories.createdBy, userId));

  if (!subcategoryIds.length) return;

  const ids = subcategoryIds.map((s) => s.id);
  await db
    .delete(subcategorySpaceMappings)
    .where(and(eq(subcategorySpaceMappings.targetOrgId, targetOrgId), inArray(subcategorySpaceMappings.subcategoryId, ids)));
}

export async function getCategoryByIdAndOrg(categoryId: number, orgId: number) {
  const [record] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.orgId, orgId)))
    .limit(1);
  return record ?? null;
}
