"use server";

import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { tags, transactionTags } from "@/db/schema";
import type { TagRecordDto } from "@/app/lib/finance.types";

function toTagDto(record: typeof tags.$inferSelect): TagRecordDto {
  return {
    id: record.id,
    orgId: record.orgId,
    name: record.name,
    createdBy: record.createdBy,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function getTagsByOrg(orgId: number): Promise<TagRecordDto[]> {
  const records = await db.select().from(tags).where(eq(tags.orgId, orgId)).orderBy(desc(tags.createdAt));

  return records.map(toTagDto);
}

export async function getTagById(id: number) {
  const [record] = await db.select().from(tags).where(eq(tags.id, id)).limit(1);
  return record ?? null;
}

export async function createTagRecord(input: { orgId: number; name: string; createdBy: string }) {
  const [record] = await db.insert(tags).values(input).returning();
  return record ?? null;
}

export async function updateTagRecord(id: number, input: Partial<{ name: string; updatedAt: Date }>) {
  const [record] = await db.update(tags).set(input).where(eq(tags.id, id)).returning();
  return record ?? null;
}

export async function deleteTagRecord(id: number) {
  const [record] = await db.delete(tags).where(eq(tags.id, id)).returning();
  return record ?? null;
}

export async function getTagIdsForTransactions(transactionIds: number[]): Promise<Map<number, number[]>> {
  const map = new Map<number, number[]>();
  if (!transactionIds.length) return map;

  const records = await db
    .select({
      transactionId: transactionTags.transactionId,
      tagId: transactionTags.tagId,
    })
    .from(transactionTags)
    .where(inArray(transactionTags.transactionId, transactionIds));

  for (const record of records) {
    const existing = map.get(record.transactionId);
    if (existing) {
      existing.push(record.tagId);
    } else {
      map.set(record.transactionId, [record.tagId]);
    }
  }

  return map;
}

export async function setTransactionTags(transactionId: number, tagIds: number[]) {
  await db.delete(transactionTags).where(eq(transactionTags.transactionId, transactionId));

  if (!tagIds.length) return;

  await db.insert(transactionTags).values(tagIds.map((tagId) => ({ transactionId, tagId })));
}
