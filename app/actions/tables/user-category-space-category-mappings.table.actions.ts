"use server";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { spaceCategories, userCategories, userCategorySpaceCategoryMappings } from "@/db/schema";

export type UserCategoryMappingRecordDto = {
  id: number;
  userCategoryId: number;
  targetOrgId: number;
  spaceCategoryId: number;
  updatedBy: string;
  updatedAt: string;
};

function toMappingDto(record: typeof userCategorySpaceCategoryMappings.$inferSelect): UserCategoryMappingRecordDto {
  return {
    id: record.id,
    userCategoryId: record.userCategoryId,
    targetOrgId: record.targetOrgId,
    spaceCategoryId: record.spaceCategoryId,
    updatedBy: record.updatedBy,
    updatedAt: record.updatedAt.toISOString(),
  };
}

/**
 * A UserCategory with no row here is Unmapped for that space — it's simply
 * excluded from that space's views. There is no fallback category.
 */
export async function getMappingsForUserAndOrg(userId: string, targetOrgId: number): Promise<UserCategoryMappingRecordDto[]> {
  const records = await db
    .select({ mapping: userCategorySpaceCategoryMappings })
    .from(userCategorySpaceCategoryMappings)
    .innerJoin(userCategories, eq(userCategories.id, userCategorySpaceCategoryMappings.userCategoryId))
    .where(and(eq(userCategorySpaceCategoryMappings.targetOrgId, targetOrgId), eq(userCategories.createdBy, userId)));

  return records.map((record) => toMappingDto(record.mapping));
}

export async function upsertMapping(input: {
  userCategoryId: number;
  targetOrgId: number;
  spaceCategoryId: number;
  updatedBy: string;
}) {
  const [record] = await db
    .insert(userCategorySpaceCategoryMappings)
    .values(input)
    .onConflictDoUpdate({
      target: [userCategorySpaceCategoryMappings.userCategoryId, userCategorySpaceCategoryMappings.targetOrgId],
      set: {
        spaceCategoryId: input.spaceCategoryId,
        updatedBy: input.updatedBy,
        updatedAt: new Date(),
      },
    })
    .returning();
  return record ? toMappingDto(record) : null;
}

export async function deleteMapping(userCategoryId: number, targetOrgId: number) {
  const [record] = await db
    .delete(userCategorySpaceCategoryMappings)
    .where(
      and(
        eq(userCategorySpaceCategoryMappings.userCategoryId, userCategoryId),
        eq(userCategorySpaceCategoryMappings.targetOrgId, targetOrgId)
      )
    )
    .returning();
  return record ? toMappingDto(record) : null;
}

export async function deleteMappingsForUserAndOrg(userId: string, targetOrgId: number) {
  const userCategoryIds = await db
    .select({ id: userCategories.id })
    .from(userCategories)
    .where(eq(userCategories.createdBy, userId));

  if (!userCategoryIds.length) return;

  const ids = userCategoryIds.map((c) => c.id);
  await db
    .delete(userCategorySpaceCategoryMappings)
    .where(
      and(
        eq(userCategorySpaceCategoryMappings.targetOrgId, targetOrgId),
        inArray(userCategorySpaceCategoryMappings.userCategoryId, ids)
      )
    );
}

export async function getSpaceCategoryByIdAndOrg(spaceCategoryId: number, orgId: number) {
  const [record] = await db
    .select()
    .from(spaceCategories)
    .where(and(eq(spaceCategories.id, spaceCategoryId), eq(spaceCategories.orgId, orgId)))
    .limit(1);
  return record ?? null;
}
