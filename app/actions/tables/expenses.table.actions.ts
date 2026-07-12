"use server";

import { aliasedTable, and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  counterParty,
  financeTransactions,
  organizationMembers,
  spaceCategories,
  transactionModes,
  transactionTags,
  userCategories,
  userCategorySpaceCategoryMappings,
  users,
} from "@/db/schema";
import type { ExpenseRecordDto } from "@/app/lib/expense.types";
import type { ExpenseType, TransferStatus } from "@/db/schema";

const transactionModeOwner = aliasedTable(users, "transactionModeOwner");
const mappedSpaceCategory = aliasedTable(spaceCategories, "mappedSpaceCategory");

function toExpenseDto(
  record: typeof financeTransactions.$inferSelect & {
    spaceCategoryId: number | null;
    spaceCategoryName: string | null;
    userName: string;
    userEmail: string;
    counterPartyName: string | null;
    transactionModeName: string | null;
    transactionModeOwnerName: string | null;
    userCategoryName: string | null;
    tagIds?: number[];
  }
): ExpenseRecordDto {
  return {
    id: record.id,
    orgId: record.orgId,
    userId: record.userId,
    userName: record.userName,
    userEmail: record.userEmail,
    spaceCategoryId: record.spaceCategoryId,
    spaceCategoryName: record.spaceCategoryName,
    counterPartyId: record.counterPartyId,
    counterPartyName: record.counterPartyName,
    transactionModeId: record.transactionModeId,
    transactionModeName: record.transactionModeName,
    transactionModeOwnerName: record.transactionModeOwnerName,
    amount: record.amount.toString(),
    type: record.type as ExpenseType,
    transferStatus: (record.transferStatus as TransferStatus | null) ?? null,
    necessityScore: Number(record.necessityScore),
    note: record.note,
    userCategoryId: record.userCategoryId,
    userCategoryName: record.userCategoryName,
    tagIds: record.tagIds ?? [],
    occurredAt: record.transactionTimestamp.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function expenseSelectShape() {
  return {
    id: financeTransactions.id,
    orgId: financeTransactions.orgId,
    userId: financeTransactions.userId,
    userName: users.name,
    userEmail: users.email,
    spaceCategoryId: spaceCategories.id,
    spaceCategoryName: spaceCategories.name,
    counterPartyId: financeTransactions.counterPartyId,
    counterPartyName: counterParty.name,
    transactionModeId: financeTransactions.transactionModeId,
    transactionModeName: transactionModes.name,
    transactionModeOwnerName: transactionModeOwner.name,
    amount: financeTransactions.amount,
    type: financeTransactions.type,
    transferStatus: financeTransactions.transferStatus,
    necessityScore: financeTransactions.necessityScore,
    note: financeTransactions.note,
    userCategoryId: financeTransactions.userCategoryId,
    userCategoryName: userCategories.name,
    transactionTimestamp: financeTransactions.transactionTimestamp,
    createdAt: financeTransactions.createdAt,
    updatedAt: financeTransactions.updatedAt,
    tagIds: sql<number[]>`coalesce(
      (select array_agg(${transactionTags.tagId})
       from ${transactionTags}
       where ${transactionTags.transactionId} = ${financeTransactions.id}),
      '{}'
    )`.as("tag_ids"),
  } as const;
}

type ExpenseJoinRow = Parameters<typeof toExpenseDto>[0];

export async function getExpensesByOrg(
  orgId: number,
  limit = 500,
  userId?: string,
  options?: { onlyMapped?: boolean }
): Promise<ExpenseRecordDto[]> {
  const whereClause = and(
    userId ? and(eq(financeTransactions.orgId, orgId), eq(financeTransactions.userId, userId)) : eq(financeTransactions.orgId, orgId),
    options?.onlyMapped ? sql`${userCategories.spaceCategoryId} is not null` : undefined
  );

  const records: ExpenseJoinRow[] = await db
    .select(expenseSelectShape())
    .from(financeTransactions)
    .innerJoin(userCategories, eq(userCategories.id, financeTransactions.userCategoryId))
    .leftJoin(spaceCategories, eq(spaceCategories.id, userCategories.spaceCategoryId))
    .innerJoin(users, eq(users.id, financeTransactions.userId))
    .leftJoin(counterParty, eq(counterParty.id, financeTransactions.counterPartyId))
    .leftJoin(transactionModes, eq(transactionModes.id, financeTransactions.transactionModeId))
    .leftJoin(transactionModeOwner, eq(transactionModeOwner.id, transactionModes.userId))
    .where(whereClause)
    .orderBy(desc(financeTransactions.transactionTimestamp), desc(financeTransactions.createdAt))
    .limit(limit);

  return records.map((record) => toExpenseDto(record));
}

/**
 * Transaction listing for a shared space ("space is a lens"): visibility is
 * membership-only (every active member's transactions show up here, never
 * filtered by financeTransactions.orgId — that's always the owner's personal
 * org now). Only transactions whose UserCategory is explicitly mapped into
 * this space show up at all — there is no fallback category, an unmapped
 * UserCategory is simply excluded (inner join throughout).
 */
export async function getExpensesForSharedSpace(sharedOrgId: number, limit = 500): Promise<ExpenseRecordDto[]> {
  const records = await db
    .select({
      id: financeTransactions.id,
      orgId: financeTransactions.orgId,
      userId: financeTransactions.userId,
      userName: users.name,
      userEmail: users.email,
      spaceCategoryId: mappedSpaceCategory.id,
      spaceCategoryName: mappedSpaceCategory.name,
      counterPartyId: financeTransactions.counterPartyId,
      counterPartyName: counterParty.name,
      transactionModeId: financeTransactions.transactionModeId,
      transactionModeName: transactionModes.name,
      transactionModeOwnerName: transactionModeOwner.name,
      amount: financeTransactions.amount,
      type: financeTransactions.type,
      transferStatus: financeTransactions.transferStatus,
      necessityScore: financeTransactions.necessityScore,
      note: financeTransactions.note,
      userCategoryId: financeTransactions.userCategoryId,
      userCategoryName: userCategories.name,
      transactionTimestamp: financeTransactions.transactionTimestamp,
      createdAt: financeTransactions.createdAt,
      updatedAt: financeTransactions.updatedAt,
      tagIds: sql<number[]>`coalesce(
        (select array_agg(${transactionTags.tagId})
         from ${transactionTags}
         where ${transactionTags.transactionId} = ${financeTransactions.id}),
        '{}'
      )`.as("tag_ids"),
    })
    .from(financeTransactions)
    // Visibility: every active member's transactions are candidates here,
    // but only ones whose UserCategory is mapped into this space actually show.
    .innerJoin(
      organizationMembers,
      and(
        eq(organizationMembers.userId, financeTransactions.userId),
        eq(organizationMembers.orgId, sharedOrgId),
        eq(organizationMembers.isActive, true)
      )
    )
    .innerJoin(users, eq(users.id, financeTransactions.userId))
    .innerJoin(userCategories, eq(userCategories.id, financeTransactions.userCategoryId))
    .innerJoin(
      userCategorySpaceCategoryMappings,
      and(
        eq(userCategorySpaceCategoryMappings.userCategoryId, financeTransactions.userCategoryId),
        eq(userCategorySpaceCategoryMappings.targetOrgId, sharedOrgId)
      )
    )
    .innerJoin(mappedSpaceCategory, eq(mappedSpaceCategory.id, userCategorySpaceCategoryMappings.spaceCategoryId))
    .leftJoin(counterParty, eq(counterParty.id, financeTransactions.counterPartyId))
    .leftJoin(transactionModes, eq(transactionModes.id, financeTransactions.transactionModeId))
    .leftJoin(transactionModeOwner, eq(transactionModeOwner.id, transactionModes.userId))
    .orderBy(desc(financeTransactions.transactionTimestamp), desc(financeTransactions.createdAt))
    .limit(limit);

  return records.map((record) => toExpenseDto(record as ExpenseJoinRow));
}

export async function getExpenseOwnershipRow(id: number): Promise<{
  id: number;
  orgId: number;
  userId: string;
  transferStatus: string | null;
  counterPartyId: number | null;
  occurredAt: string;
} | null> {
  const [record] = await db
    .select({
      id: financeTransactions.id,
      orgId: financeTransactions.orgId,
      userId: financeTransactions.userId,
      transferStatus: financeTransactions.transferStatus,
      counterPartyId: financeTransactions.counterPartyId,
      occurredAt: financeTransactions.transactionTimestamp,
    })
    .from(financeTransactions)
    .where(eq(financeTransactions.id, id))
    .limit(1);

  if (!record) return null;
  return { ...record, occurredAt: record.occurredAt.toISOString() };
}

export async function getExpenseById(id: number): Promise<ExpenseRecordDto | null> {
  const [record]: ExpenseJoinRow[] = await db
    .select(expenseSelectShape())
    .from(financeTransactions)
    .innerJoin(userCategories, eq(userCategories.id, financeTransactions.userCategoryId))
    .leftJoin(spaceCategories, eq(spaceCategories.id, userCategories.spaceCategoryId))
    .innerJoin(users, eq(users.id, financeTransactions.userId))
    .leftJoin(counterParty, eq(counterParty.id, financeTransactions.counterPartyId))
    .leftJoin(transactionModes, eq(transactionModes.id, financeTransactions.transactionModeId))
    .leftJoin(transactionModeOwner, eq(transactionModeOwner.id, transactionModes.userId))
    .where(eq(financeTransactions.id, id))
    .limit(1);

  if (!record) return null;

  return toExpenseDto(record);
}

export async function formatExpenseRecordSummary(expense: ExpenseRecordDto) {
  const parts = [
    `amount ${expense.amount}`,
    `category ${expense.spaceCategoryName ?? "Unmapped"}`,
    `user ${expense.userName}`,
    `date ${expense.occurredAt.slice(0, 10)}`,
  ];

  if (expense.note?.trim()) {
    parts.push(`note ${expense.note.trim()}`);
  } else {
    parts.push("note (empty)");
  }

  if (expense.counterPartyName?.trim()) {
    parts.push(`counterparty ${expense.counterPartyName.trim()}`);
  }

  parts.push(`type ${expense.type}`);

  return parts.join(", ");
}

export async function createExpenseRecord(input: {
  orgId: number;
  userId: string;
  counterPartyId: number | null;
  transactionModeId: number | null;
  userCategoryId: number;
  transferStatus: TransferStatus | null;
  amount: string;
  type: ExpenseType;
  necessityScore: number;
  note: string | null;
  occurredAt: Date;
}) {
  const [record] = await db
    .insert(financeTransactions)
    .values({
      ...input,
      transactionTimestamp: input.occurredAt,
    })
    .returning();
  return record ?? null;
}

export async function updateExpenseRecord(
  id: number,
  input: Partial<{
    counterPartyId: number | null;
    transactionModeId: number | null;
    userCategoryId: number;
    transferStatus: TransferStatus | null;
    amount: string;
    type: ExpenseType;
    necessityScore: number;
    note: string | null;
    occurredAt: Date;
    updatedAt: Date;
  }>
) {
  const { occurredAt, ...rest } = input;
  const [record] = await db
    .update(financeTransactions)
    .set({
      ...rest,
      ...(occurredAt ? { transactionTimestamp: occurredAt } : {}),
    })
    .where(eq(financeTransactions.id, id))
    .returning();
  return record ?? null;
}

export async function deleteExpenseRecord(id: number) {
  const [record] = await db.delete(financeTransactions).where(eq(financeTransactions.id, id)).returning();
  return record ?? null;
}
