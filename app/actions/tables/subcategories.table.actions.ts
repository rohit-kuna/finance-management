"use server";

import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { subcategories } from "@/db/schema";
import type { SubcategoryRecordDto } from "@/app/lib/finance.types";

function toSubcategoryDto(record: typeof subcategories.$inferSelect): SubcategoryRecordDto {
  return {
    id: record.id,
    orgId: record.orgId,
    categoryId: record.categoryId,
    name: record.name,
    createdBy: record.createdBy,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function getSubcategoriesByOrg(orgId: number): Promise<SubcategoryRecordDto[]> {
  const records = await db
    .select()
    .from(subcategories)
    .where(eq(subcategories.orgId, orgId))
    .orderBy(desc(subcategories.createdAt));

  return records.map(toSubcategoryDto);
}

export async function getSubcategoryById(id: number) {
  const [record] = await db.select().from(subcategories).where(eq(subcategories.id, id)).limit(1);
  return record ?? null;
}

export async function createSubcategoryRecord(input: {
  orgId: number;
  categoryId: number;
  name: string;
  createdBy: string;
}) {
  const [record] = await db.insert(subcategories).values(input).returning();
  return record ?? null;
}

export async function updateSubcategoryRecord(
  id: number,
  input: Partial<{
    name: string;
    categoryId: number;
    updatedAt: Date;
  }>
) {
  const [record] = await db.update(subcategories).set(input).where(eq(subcategories.id, id)).returning();
  return record ?? null;
}

export async function deleteSubcategoryRecord(id: number) {
  const [record] = await db.delete(subcategories).where(eq(subcategories.id, id)).returning();
  return record ?? null;
}
