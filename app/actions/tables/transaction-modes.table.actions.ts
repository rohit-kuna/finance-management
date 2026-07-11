"use server";

import { aliasedTable, and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { transactionModes, users } from "@/db/schema";
import type { TransactionModeRecordDto } from "@/app/lib/finance.types";

const transactionModeOwner = aliasedTable(users, "transactionModeOwner");

function toTransactionModeDto(record: {
  id: number;
  name: string;
  userId: string;
  userName: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}): TransactionModeRecordDto {
  return {
    id: record.id,
    name: record.name,
    userId: record.userId,
    userName: record.userName,
    isDefault: record.isDefault,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function getTransactionModesByUser(orgId: number, userId: string): Promise<TransactionModeRecordDto[]> {
  const records = await db
    .select({
      id: transactionModes.id,
      name: transactionModes.name,
      userId: transactionModes.userId,
      userName: transactionModeOwner.name,
      isDefault: transactionModes.isDefault,
      createdAt: transactionModes.createdAt,
      updatedAt: transactionModes.updatedAt,
    })
    .from(transactionModes)
    .innerJoin(transactionModeOwner, eq(transactionModeOwner.id, transactionModes.userId))
    .where(and(eq(transactionModes.orgId, orgId), eq(transactionModes.userId, userId)))
    .orderBy(desc(transactionModes.isDefault), asc(transactionModes.createdAt), desc(transactionModes.id));

  return records.map(toTransactionModeDto);
}

export async function ensureDefaultTransactionModesForUser(orgId: number, ownerUserId: string) {
  const existingModes = await getTransactionModesByUser(orgId, ownerUserId);
  if (existingModes.length) {
    if (!existingModes.some((mode) => mode.isDefault)) {
      const fallbackMode = existingModes[0];
      if (fallbackMode) {
        await setDefaultTransactionModeForUser(orgId, ownerUserId, fallbackMode.id);
        return getTransactionModesByUser(orgId, ownerUserId);
      }
    }

    return existingModes;
  }

  await db.insert(transactionModes).values([
    { orgId, userId: ownerUserId, name: "Online", isDefault: true },
    { orgId, userId: ownerUserId, name: "Cash", isDefault: false },
  ]);

  return getTransactionModesByUser(orgId, ownerUserId);
}

export async function getDefaultTransactionModeByUser(orgId: number, userId: string) {
  const [record] = await db
    .select()
    .from(transactionModes)
    .where(
      and(
        eq(transactionModes.orgId, orgId),
        eq(transactionModes.userId, userId),
        eq(transactionModes.isDefault, true)
      )
    )
    .limit(1);

  return record ?? null;
}

export async function getTransactionModeById(id: number) {
  const [record] = await db
    .select()
    .from(transactionModes)
    .where(eq(transactionModes.id, id))
    .limit(1);

  return record ?? null;
}

export async function createTransactionModeRecord(input: {
  orgId: number;
  userId: string;
  name: string;
  isDefault?: boolean;
}) {
  const [record] = await db
    .insert(transactionModes)
    .values({
      ...input,
      isDefault: input.isDefault ?? false,
    })
    .returning();
  return record ?? null;
}

export async function updateTransactionModeRecord(
  id: number,
  input: Partial<{
    name: string;
    updatedAt: Date;
  }>
) {
  const [record] = await db.update(transactionModes).set(input).where(eq(transactionModes.id, id)).returning();
  return record ?? null;
}

export async function deleteTransactionModeRecord(id: number) {
  const [record] = await db.delete(transactionModes).where(eq(transactionModes.id, id)).returning();
  return record ?? null;
}

export async function setDefaultTransactionModeForUser(orgId: number, userId: string, transactionModeId: number) {
  const result = await db.transaction(async (tx) => {
    await tx
      .update(transactionModes)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(and(eq(transactionModes.orgId, orgId), eq(transactionModes.userId, userId)));

    const [updated] = await tx
      .update(transactionModes)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(
        and(
          eq(transactionModes.id, transactionModeId),
          eq(transactionModes.orgId, orgId),
          eq(transactionModes.userId, userId)
        )
      )
      .returning();

    return updated ?? null;
  });

  return result;
}
