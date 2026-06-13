"use server";

import { aliasedTable, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  counterParty,
  financeTransactions,
  subcategories,
  transactionModes,
  users,
} from "@/db/schema";
import { getTagIdsForTransactions } from "@/app/actions/tables/tags.table.actions";
import type { ExpenseRecordDto } from "@/app/lib/expense.types";
import type { ExpenseType, TransferStatus } from "@/db/schema";

const transactionModeOwner = aliasedTable(users, "transactionModeOwner");

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
  } as const;
}

type ExpenseJoinRow = Parameters<typeof toExpenseDto>[0];

export async function getExpensesByOrg(orgId: number): Promise<ExpenseRecordDto[]> {
  const records: ExpenseJoinRow[] = await db
    .select(expenseSelectShape())
    .from(financeTransactions)
    .innerJoin(categories, eq(categories.id, financeTransactions.categoryId))
    .innerJoin(users, eq(users.id, financeTransactions.userId))
    .leftJoin(counterParty, eq(counterParty.id, financeTransactions.counterPartyId))
    .leftJoin(transactionModes, eq(transactionModes.id, financeTransactions.transactionModeId))
    .leftJoin(transactionModeOwner, eq(transactionModeOwner.id, transactionModes.userId))
    .leftJoin(subcategories, eq(subcategories.id, financeTransactions.subcategoryId))
    .where(eq(financeTransactions.orgId, orgId))
    .orderBy(desc(financeTransactions.transactionTimestamp), desc(financeTransactions.createdAt));

  const tagIdsByTransaction = await getTagIdsForTransactions(records.map((record) => record.id));

  return records.map((record) => toExpenseDto({ ...record, tagIds: tagIdsByTransaction.get(record.id) ?? [] }));
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

  const tagIdsByTransaction = await getTagIdsForTransactions([record.id]);

  return toExpenseDto({ ...record, tagIds: tagIdsByTransaction.get(record.id) ?? [] });
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
  subcategoryId: number | null;
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
    subcategoryId: number | null;
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
