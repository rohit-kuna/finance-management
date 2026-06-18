"use server";

import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { counterParty } from "@/db/schema";
import type { CounterpartyRecordDto } from "@/app/lib/finance.types";

function toCounterpartyDto(record: typeof counterParty.$inferSelect): CounterpartyRecordDto {
  return {
    id: record.id,
    orgId: record.orgId,
    name: record.name,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function getCounterpartiesByOrg(orgId: number): Promise<CounterpartyRecordDto[]> {
  const records = await db
    .select()
    .from(counterParty)
    .where(eq(counterParty.orgId, orgId))
    .orderBy(desc(counterParty.createdAt));
  return records.map(toCounterpartyDto);
}

export async function getCounterpartyById(id: number) {
  const [record] = await db
    .select()
    .from(counterParty)
    .where(eq(counterParty.id, id))
    .limit(1);

  return record ?? null;
}

export async function createCounterpartyRecord(input: {
  orgId: number;
  name: string;
}) {
  const [record] = await db.insert(counterParty).values(input).returning();
  return record ?? null;
}

export async function updateCounterpartyRecord(
  id: number,
  input: Partial<{
    name: string;
    updatedAt: Date;
  }>
) {
  const [record] = await db.update(counterParty).set(input).where(eq(counterParty.id, id)).returning();
  return record ?? null;
}

export async function deleteCounterpartyRecord(id: number) {
  const [record] = await db.delete(counterParty).where(eq(counterParty.id, id)).returning();
  return record ?? null;
}
