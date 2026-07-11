"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/app/lib/auth";
import { ROUTES } from "@/app/lib/constants";
import { getOrganizationById } from "@/app/actions/tables/organizations.table.actions";
import { getCategoriesByOrg, getCategoryById } from "@/app/actions/tables/categories.table.actions";
import {
  createExpenseRecord,
  deleteExpenseRecord,
  getExpenseOwnershipRow,
  getExpensesByOrg,
  getExpensesForSharedSpace,
  updateExpenseRecord,
} from "@/app/actions/tables/expenses.table.actions";
import {
  counterpartyExistsInOrg,
  getCounterpartiesByOrg,
} from "@/app/actions/tables/counterparties.table.actions";
import { getSubcategoriesByOrg, getSubcategoryByIdAndCategory } from "@/app/actions/tables/subcategories.table.actions";
import { getTagsByOrg, getValidTagIdsByOrg, setTransactionTags } from "@/app/actions/tables/tags.table.actions";
import {
  getTransactionModeById,
  getTransactionModesByUser,
} from "@/app/actions/tables/transaction-modes.table.actions";
import type { FinanceActionState } from "@/app/actions/auth-roles/finance.types";
import type { ExpensesDashboardDataDto, TransferDashboardDataDto } from "@/app/lib/expense.types";
import { parseExpenseDate } from "@/app/lib/expense-date";
import type { TransferStatus } from "@/db/schema";

const expenseSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
  counterPartyId: z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? value : undefined),
    z.coerce.number().int().positive().optional()
  ),
  transactionModeId: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  necessityScore: z.coerce.number().int().refine(
    (v) => v === -1 || v === 0 || v === 1,
    { message: "Necessity must be -1 (Optional), 0 (Default), or 1 (Important)" }
  ),
  note: z.string().trim().max(500).nullable(),
  subcategoryId: z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? value : undefined),
    z.coerce.number().int().positive().optional()
  ),
  occurredAt: z.string().trim().min(1, "Expense date is required"),
  tagIds: z.array(z.coerce.number().int().positive()).optional().default([]),
});

const expenseIdSchema = z.object({
  expenseId: z.coerce.number().int().positive(),
});

const transferStatusSchema = z.enum(["open", "settled", "closed"]);

const transferStatusUpdateSchema = z.object({
  expenseId: z.coerce.number().int().positive(),
  transferStatus: transferStatusSchema,
});

function assertOrgId(currentUser: Awaited<ReturnType<typeof requireUser>>) {
  if (!currentUser.orgId) {
    throw new Error("Create or join an organization first");
  }

  return currentUser.orgId;
}

// Personal space is the single source of truth for every transaction: a
// transaction's orgId/categoryId/subcategoryId always resolve against the
// owner's personal org, regardless of which space (personal or shared) is
// currently "active" for navigation/UI purposes.
function assertPersonalOrgId(currentUser: Awaited<ReturnType<typeof requireUser>>) {
  if (!currentUser.personalOrgId) {
    throw new Error("Set up your personal space first");
  }

  return currentUser.personalOrgId;
}

function toMoneyString(amount: number) {
  return amount.toFixed(2);
}

function normalizeField(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function toOrganizationDto(organization: Awaited<ReturnType<typeof getOrganizationById>>) {
  if (!organization) return null;

  return {
    id: organization.id,
    name: organization.name,
    createdBy: organization.createdBy,
    isPersonal: organization.isPersonal,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
  };
}

// Ownership is strictly personal now that transactions always live in the
// owner's personal space — a shared-space admin no longer gets a bypass to
// edit/delete another member's transaction (there's no "org's transaction"
// concept anymore, only "my transaction, visible in spaces I map it into").
async function ensureExpenseOwnership(expenseId: number, currentUser: Awaited<ReturnType<typeof requireUser>>) {
  const expense = await getExpenseOwnershipRow(expenseId);

  if (!expense || expense.userId !== currentUser.id) {
    return null;
  }

  return expense;
}

async function resolveCounterpartyId(orgId: number, counterPartyId: number | null | undefined) {
  if (counterPartyId == null) {
    return null;
  }

  const exists = await counterpartyExistsInOrg(counterPartyId, orgId);
  return exists ? counterPartyId : null;
}

async function resolveTagIds(orgId: number, tagIds: number[]) {
  return getValidTagIdsByOrg(orgId, tagIds);
}

async function resolveSubcategoryId(personalOrgId: number, categoryId: number, subcategoryId: number | undefined) {
  if (subcategoryId == null) {
    return null;
  }

  const match = await getSubcategoryByIdAndCategory(subcategoryId, personalOrgId, categoryId);
  return match ? subcategoryId : undefined;
}

export async function getExpensesDashboardData(): Promise<ExpensesDashboardDataDto> {
  const currentUser = await requireUser();

  if (!currentUser.orgId) {
    return {
      organization: null,
      categories: [],
      counterparties: [],
      transactionModes: [],
      subcategories: [],
      tags: [],
      expenses: [],
      currentUser: {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
        orgId: null,
      },
    };
  }

  // Category/subcategory selection always sources from the personal space —
  // subcategories are user-specific, never space-specific — regardless of
  // which space is currently active. Counterparty/mode stay tied to whichever
  // space is active. Expense listing depends on which kind of space is
  // active: personal orgs list the owner's own transactions directly; shared
  // orgs are a lens — every active member's transactions are visible there,
  // grouped by each subcategory's mapping (or "Others" if unmapped).
  const personalOrgId = currentUser.personalOrgId ?? currentUser.orgId;
  const organization = await getOrganizationById(currentUser.orgId);

  const [categories, counterparties, subcategories, tags, expenses, transactionModes] = await Promise.all([
    getCategoriesByOrg(personalOrgId),
    getCounterpartiesByOrg(currentUser.orgId),
    getSubcategoriesByOrg(personalOrgId),
    getTagsByOrg(currentUser.orgId),
    organization?.isPersonal ?? true
      ? getExpensesByOrg(currentUser.orgId, 500, currentUser.id)
      : getExpensesForSharedSpace(currentUser.orgId, 500),
    getTransactionModesByUser(currentUser.orgId, currentUser.id),
  ]);

  return {
    organization: toOrganizationDto(organization),
    categories,
    counterparties,
    transactionModes,
    subcategories,
    tags,
    expenses,
    currentUser: {
      id: currentUser.id,
      name: currentUser.name,
      role: currentUser.role,
      orgId: currentUser.orgId,
    },
  };
}

export async function getTransfersDashboardData(): Promise<TransferDashboardDataDto> {
  const currentUser = await requireUser();

  if (!currentUser.orgId) {
    return {
      organization: null,
      categories: [],
      counterparties: [],
      transactionModes: [],
      expenses: [],
      currentUser: {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
        orgId: null,
      },
    };
  }

  const personalOrgId = currentUser.personalOrgId ?? currentUser.orgId;
  const organization = await getOrganizationById(currentUser.orgId);

  const [categories, counterparties, expenses, transactionModes] = await Promise.all([
    getCategoriesByOrg(personalOrgId),
    getCounterpartiesByOrg(currentUser.orgId),
    organization?.isPersonal ?? true
      ? getExpensesByOrg(currentUser.orgId, 500, currentUser.id)
      : getExpensesForSharedSpace(currentUser.orgId, 500),
    getTransactionModesByUser(currentUser.orgId, currentUser.id),
  ]);
  const visibleTransfers = expenses.filter((expense) => expense.counterPartyId !== null);

  return {
    organization: toOrganizationDto(organization),
    categories,
    counterparties,
    transactionModes,
    expenses: visibleTransfers,
    currentUser: {
      id: currentUser.id,
      name: currentUser.name,
      role: currentUser.role,
      orgId: currentUser.orgId,
    },
  };
}

export async function createExpenseAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  console.time("createExpenseAction");
  const currentUser = await requireUser();
  const orgId = assertOrgId(currentUser);
  const personalOrgId = assertPersonalOrgId(currentUser);

  const parsed = expenseSchema.safeParse({
    categoryId: formData.get("categoryId"),
    counterPartyId: formData.get("counterPartyId"),
    transactionModeId: formData.get("transactionModeId"),
    amount: formData.get("amount"),
    necessityScore: formData.get("necessityScore"),
    note: normalizeField(formData.get("note")) ?? null,
    subcategoryId: formData.get("subcategoryId"),
    occurredAt: formData.get("occurredAt"),
    tagIds: formData.getAll("tagIds"),
  });

  if (!parsed.success) {
    console.timeEnd("createExpenseAction");
    return { error: parsed.error.issues[0]?.message ?? "Unable to create expense" };
  }

  const [category, counterPartyId, transactionMode, subcategoryId, tagIds] = await Promise.all([
    getCategoryById(parsed.data.categoryId),
    resolveCounterpartyId(orgId, parsed.data.counterPartyId),
    getTransactionModeById(parsed.data.transactionModeId),
    resolveSubcategoryId(personalOrgId, parsed.data.categoryId, parsed.data.subcategoryId),
    resolveTagIds(orgId, parsed.data.tagIds),
  ]);

  if (!category || category.orgId !== personalOrgId) {
    console.timeEnd("createExpenseAction");
    return { error: "Category does not belong to your personal space" };
  }
  if (parsed.data.counterPartyId != null && !counterPartyId) {
    console.timeEnd("createExpenseAction");
    return { error: "Counterparty does not belong to your organization" };
  }
  if (!transactionMode || transactionMode.userId !== currentUser.id) {
    console.timeEnd("createExpenseAction");
    return { error: "Transaction mode does not exist" };
  }
  if (subcategoryId === undefined || subcategoryId === null) {
    console.timeEnd("createExpenseAction");
    return { error: "A subcategory is required" };
  }

  const expenseType = category.type;
  const transferStatus = counterPartyId ? "open" : null;

  const expense = await createExpenseRecord({
    orgId: personalOrgId,
    userId: currentUser.id,
    categoryId: parsed.data.categoryId,
    counterPartyId,
    transactionModeId: transactionMode.id,
    subcategoryId,
    transferStatus,
    amount: toMoneyString(parsed.data.amount),
    type: expenseType,
    necessityScore: parsed.data.necessityScore,
    note: parsed.data.note,
    occurredAt: parseExpenseDate(parsed.data.occurredAt),
  });

  if (expense) {
    await setTransactionTags(expense.id, tagIds);
  }

  console.timeEnd("createExpenseAction");
  redirect(ROUTES.TRANSACTIONS);
}

export async function updateExpenseAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  console.time("updateExpenseAction");
  const currentUser = await requireUser();
  const orgId = assertOrgId(currentUser);
  const personalOrgId = assertPersonalOrgId(currentUser);

  const parsed = expenseSchema.safeParse({
    categoryId: formData.get("categoryId"),
    counterPartyId: formData.get("counterPartyId"),
    transactionModeId: formData.get("transactionModeId"),
    amount: formData.get("amount"),
    necessityScore: formData.get("necessityScore"),
    note: normalizeField(formData.get("note")) ?? null,
    subcategoryId: formData.get("subcategoryId"),
    occurredAt: formData.get("occurredAt"),
    tagIds: formData.getAll("tagIds"),
  });
  const expenseIdResult = expenseIdSchema.safeParse({
    expenseId: formData.get("expenseId"),
  });

  if (!parsed.success) {
    console.timeEnd("updateExpenseAction");
    return { error: parsed.error.issues[0]?.message ?? "Unable to update expense" };
  }

  if (!expenseIdResult.success) {
    console.timeEnd("updateExpenseAction");
    return { error: "Expense is required" };
  }

  const expense = await ensureExpenseOwnership(expenseIdResult.data.expenseId, currentUser);
  if (!expense) {
    console.timeEnd("updateExpenseAction");
    return { error: "Expense does not belong to you" };
  }

  const [category, counterPartyId, transactionMode, subcategoryId, tagIds] = await Promise.all([
    getCategoryById(parsed.data.categoryId),
    resolveCounterpartyId(orgId, parsed.data.counterPartyId),
    getTransactionModeById(parsed.data.transactionModeId),
    resolveSubcategoryId(personalOrgId, parsed.data.categoryId, parsed.data.subcategoryId),
    resolveTagIds(orgId, parsed.data.tagIds),
  ]);

  if (!category || category.orgId !== personalOrgId) {
    console.timeEnd("updateExpenseAction");
    return { error: "Category does not belong to your personal space" };
  }
  if (parsed.data.counterPartyId != null && !counterPartyId) {
    console.timeEnd("updateExpenseAction");
    return { error: "Counterparty does not belong to your organization" };
  }
  if (!transactionMode || transactionMode.userId !== currentUser.id) {
    console.timeEnd("updateExpenseAction");
    return { error: "Transaction mode does not exist" };
  }
  if (subcategoryId === undefined || subcategoryId === null) {
    console.timeEnd("updateExpenseAction");
    return { error: "A subcategory is required" };
  }

  const expenseType = category.type;
  const transferStatus = counterPartyId ? (expense.transferStatus ?? "open") as TransferStatus : null;

  await updateExpenseRecord(expense.id, {
    categoryId: parsed.data.categoryId,
    counterPartyId,
    transactionModeId: transactionMode.id,
    subcategoryId,
    transferStatus,
    amount: toMoneyString(parsed.data.amount),
    type: expenseType,
    necessityScore: parsed.data.necessityScore,
    note: parsed.data.note,
    occurredAt: parseExpenseDate(parsed.data.occurredAt, new Date(expense.occurredAt)),
    updatedAt: new Date(),
  });

  await setTransactionTags(expense.id, tagIds);

  console.timeEnd("updateExpenseAction");
  redirect(ROUTES.TRANSACTIONS);
}

export async function updateTransferStatusAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireUser();
  const parsed = transferStatusUpdateSchema.safeParse({
    expenseId: formData.get("expenseId"),
    transferStatus: formData.get("transferStatus"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to update transfer" };
  }

  const expense = await ensureExpenseOwnership(parsed.data.expenseId, currentUser);
  if (!expense) {
    return { error: "Transfer does not belong to you" };
  }

  if (expense.counterPartyId === null) {
    return { error: "Transfer requires a counterparty" };
  }

  await updateExpenseRecord(expense.id, {
    transferStatus: parsed.data.transferStatus,
    updatedAt: new Date(),
  });

  redirect(ROUTES.TRANSFERS);
}

export async function deleteExpenseAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireUser();
  const expenseIdResult = expenseIdSchema.safeParse({
    expenseId: formData.get("expenseId"),
  });

  if (!expenseIdResult.success) {
    return { error: "Expense is required" };
  }

  const expense = await ensureExpenseOwnership(expenseIdResult.data.expenseId, currentUser);
  if (!expense) {
    return { error: "Expense does not belong to you" };
  }

  await deleteExpenseRecord(expense.id);

  redirect(ROUTES.TRANSACTIONS);
}
