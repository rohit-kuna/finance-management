"use server";

import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { tags } from "@/db/schema";
import type { TagRecordDto } from "@/app/lib/finance.types";

function toTagDto(record: typeof tags.$inferSelect): TagRecordDto {
  return {
    id: record.id,
    orgId: record.orgId,
    name: record.name,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function getTagsByOrg(orgId: number): Promise<TagRecordDto[]> {
  const records = await db
    .select()
    .from(tags)
    .where(eq(tags.orgId, orgId))
    .orderBy(desc(tags.createdAt));

  return records.map(toTagDto);
}

export async function getTagById(id: number) {
  const [record] = await db.select().from(tags).where(eq(tags.id, id)).limit(1);
  return record ?? null;
}

export async function createTagRecord(input: {
  orgId: number;
  name: string;
  createdBy: string;
}) {
  const [record] = await db.insert(tags).values(input).returning();
  return record ?? null;
}

export async function updateTagRecord(
  id: number,
  input: Partial<{
    name: string;
    updatedAt: Date;
  }>
) {
  const [record] = await db.update(tags).set(input).where(eq(tags.id, id)).returning();
  return record ?? null;
}

export async function deleteTagRecord(id: number) {
  const [record] = await db.delete(tags).where(eq(tags.id, id)).returning();
  return record ?? null;
}
