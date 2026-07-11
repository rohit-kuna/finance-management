"use server";

import { aliasedTable, and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  counterParty,
  financeTransactions,
  organizationMembers,
  subcategories,
  subcategorySpaceMappings,
  transactionModes,
  transactionTags,
  users,
} from "@/db/schema";
import type { ExpenseRecordDto } from "@/app/lib/expense.types";
import type { ExpenseType, TransferStatus } from "@/db/schema";

const transactionModeOwner = aliasedTable(users, "transactionModeOwner");
const mappedCategory = aliasedTable(categories, "mappedCategory");
const othersCategory = aliasedTable(categories, "othersCategory");

function toExpenseDto(
  record: typeof financeTransactions.$inferSelect & {
    categoryName: string;
    userName: string;
    userEmail: string;
    counterPartyName: string | null;
    transactionModeName: string | null;
    transactionModeOwnerName: string | null;
    subcategoryName: string | null;
    tagIds?: number[];
  }
): ExpenseRecordDto {
  return {
    id: record.id,
    orgId: record.orgId,
    userId: record.userId,
    userName: record.userName,
    userEmail: record.userEmail,
    categoryId: record.categoryId,
    categoryName: record.categoryName,
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
    subcategoryId: record.subcategoryId,
    subcategoryName: record.subcategoryName,
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
    categoryId: financeTransactions.categoryId,
    categoryName: categories.name,
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
    subcategoryId: financeTransactions.subcategoryId,
    subcategoryName: subcategories.name,
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

export async function getExpensesByOrg(orgId: number, limit = 500, userId?: string): Promise<ExpenseRecordDto[]> {
  const whereClause = userId
    ? and(eq(financeTransactions.orgId, orgId), eq(financeTransactions.userId, userId))
    : eq(financeTransactions.orgId, orgId);

  const records: ExpenseJoinRow[] = await db
    .select(expenseSelectShape())
    .from(financeTransactions)
    .innerJoin(categories, eq(categories.id, financeTransactions.categoryId))
    .innerJoin(users, eq(users.id, financeTransactions.userId))
    .leftJoin(counterParty, eq(counterParty.id, financeTransactions.counterPartyId))
    .leftJoin(transactionModes, eq(transactionModes.id, financeTransactions.transactionModeId))
    .leftJoin(transactionModeOwner, eq(transactionModeOwner.id, transactionModes.userId))
    .leftJoin(subcategories, eq(subcategories.id, financeTransactions.subcategoryId))
    .where(whereClause)
    .orderBy(desc(financeTransactions.transactionTimestamp), desc(financeTransactions.createdAt))
    .limit(limit);

  return records.map((record) => toExpenseDto(record));
}

/**
 * Transaction listing for a shared space ("space is a lens"): visibility is
 * membership-only (every active member's transactions show up here, never
 * filtered by financeTransactions.orgId — that's always the owner's personal
 * org now). The displayed category is resolved per-row from this space's
 * mapping for that transaction's subcategory, falling back to the space's
 * "Others" category (matched by transaction type) when no explicit mapping
 * exists — never the transaction's own (personal) categoryId.
 */
export async function getExpensesForSharedSpace(sharedOrgId: number, limit = 500): Promise<ExpenseRecordDto[]> {
  const records = await db
    .select({
      id: financeTransactions.id,
      orgId: financeTransactions.orgId,
      userId: financeTransactions.userId,
      userName: users.name,
      userEmail: users.email,
      categoryId: sql<number>`coalesce(${subcategorySpaceMappings.categoryId}, ${othersCategory.id})`,
      categoryName: sql<string>`coalesce(${mappedCategory.name}, ${othersCategory.name})`,
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
      subcategoryId: financeTransactions.subcategoryId,
      subcategoryName: subcategories.name,
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
    // Visibility: every active member's transactions are visible here,
    // regardless of mapping — mapping only ever affects grouping.
    .innerJoin(
      organizationMembers,
      and(
        eq(organizationMembers.userId, financeTransactions.userId),
        eq(organizationMembers.orgId, sharedOrgId),
        eq(organizationMembers.isActive, true)
      )
    )
    .innerJoin(users, eq(users.id, financeTransactions.userId))
    .leftJoin(counterParty, eq(counterParty.id, financeTransactions.counterPartyId))
    .leftJoin(transactionModes, eq(transactionModes.id, financeTransactions.transactionModeId))
    .leftJoin(transactionModeOwner, eq(transactionModeOwner.id, transactionModes.userId))
    .leftJoin(subcategories, eq(subcategories.id, financeTransactions.subcategoryId))
    .leftJoin(
      subcategorySpaceMappings,
      and(
        eq(subcategorySpaceMappings.subcategoryId, financeTransactions.subcategoryId),
        eq(subcategorySpaceMappings.targetOrgId, sharedOrgId)
      )
    )
    .leftJoin(mappedCategory, eq(mappedCategory.id, subcategorySpaceMappings.categoryId))
    .leftJoin(
      othersCategory,
      and(
        eq(othersCategory.orgId, sharedOrgId),
        eq(othersCategory.type, financeTransactions.type),
        eq(othersCategory.isSystemDefault, true)
      )
    )
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
    .innerJoin(categories, eq(categories.id, financeTransactions.categoryId))
    .innerJoin(users, eq(users.id, financeTransactions.userId))
    .leftJoin(counterParty, eq(counterParty.id, financeTransactions.counterPartyId))
    .leftJoin(transactionModes, eq(transactionModes.id, financeTransactions.transactionModeId))
    .leftJoin(transactionModeOwner, eq(transactionModeOwner.id, transactionModes.userId))
    .leftJoin(subcategories, eq(subcategories.id, financeTransactions.subcategoryId))
    .where(eq(financeTransactions.id, id))
    .limit(1);

  if (!record) return null;

  return toExpenseDto(record);
}

export async function formatExpenseRecordSummary(expense: ExpenseRecordDto) {
  const parts = [
    `amount ${expense.amount}`,
    `category ${expense.categoryName}`,
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
  categoryId: number;
  counterPartyId: number | null;
  transactionModeId: number | null;
  subcategoryId: number;
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
    categoryId: number;
    counterPartyId: number | null;
    transactionModeId: number | null;
    subcategoryId: number;
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
