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
  getExpenseById,
  getExpensesByOrg,
  updateExpenseRecord,
} from "@/app/actions/tables/expenses.table.actions";
import {
  getCounterpartiesByOrg,
  getCounterpartyById,
} from "@/app/actions/tables/counterparties.table.actions";
import { getSubcategoriesByOrg } from "@/app/actions/tables/subcategories.table.actions";
import { getTagsByOrg, setTransactionTags } from "@/app/actions/tables/tags.table.actions";
import {
  ensureDefaultTransactionModesForUser,
  getTransactionModeById,
} from "@/app/actions/tables/transaction-modes.table.actions";
import type { FinanceActionState } from "@/app/actions/auth-roles/finance.types";
import type { ExpensesDashboardDataDto, TransferDashboardDataDto } from "@/app/lib/expense.types";
import { parseExpenseDate } from "@/app/lib/expense-date";

const expenseSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
  counterPartyId: z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? value : undefined),
    z.coerce.number().int().positive().optional()
  ),
  transactionModeId: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  necessityScore: z.coerce.number().int().min(1, "Necessity score must be between 1 and 5").max(5),
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
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
  };
}

async function ensureExpenseOwnershipOrAdmin(expenseId: number, currentUser: Awaited<ReturnType<typeof requireUser>>) {
  const expense = await getExpenseById(expenseId);

  if (!expense || expense.orgId !== currentUser.orgId) {
    return null;
  }

  if (currentUser.role === "ADMIN") {
    return expense;
  }

  if (expense.userId !== currentUser.id) {
    return null;
  }

  return expense;
}

async function resolveCounterpartyId(orgId: number, counterPartyId: number | null | undefined) {
  if (counterPartyId == null) {
    return null;
  }

  const counterparty = await getCounterpartyById(counterPartyId);
  if (!counterparty || counterparty.orgId !== orgId) {
    return null;
  }

  return counterparty.id;
}

async function resolveTagIds(orgId: number, tagIds: number[]) {
  if (!tagIds.length) return [];

  const orgTags = await getTagsByOrg(orgId);
  const validTagIds = new Set(orgTags.map((tag) => tag.id));

  return tagIds.filter((tagId) => validTagIds.has(tagId));
}

async function resolveSubcategoryId(orgId: number, categoryId: number, subcategoryId: number | undefined) {
  if (subcategoryId == null) {
    return null;
  }

  const orgSubcategories = await getSubcategoriesByOrg(orgId);
  const subcategory = orgSubcategories.find((candidate) => candidate.id === subcategoryId);

  if (!subcategory || subcategory.categoryId !== categoryId) {
    return undefined;
  }

  return subcategoryId;
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

  const [organization, categories, counterparties, subcategories, tags, expenses] = await Promise.all([
    getOrganizationById(currentUser.orgId),
    getCategoriesByOrg(currentUser.orgId),
    getCounterpartiesByOrg(currentUser.orgId),
    getSubcategoriesByOrg(currentUser.orgId),
    getTagsByOrg(currentUser.orgId),
    getExpensesByOrg(currentUser.orgId),
  ]);
  const transactionModes = await ensureDefaultTransactionModesForUser(currentUser.orgId, currentUser.id);
  const visibleExpenses = currentUser.role === "ADMIN"
    ? expenses
    : expenses.filter((expense) => expense.userId === currentUser.id);

  return {
    organization: toOrganizationDto(organization),
    categories,
    counterparties,
    transactionModes,
    subcategories,
    tags,
    expenses: visibleExpenses,
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

  const [organization, categories, counterparties, expenses] = await Promise.all([
    getOrganizationById(currentUser.orgId),
    getCategoriesByOrg(currentUser.orgId),
    getCounterpartiesByOrg(currentUser.orgId),
    getExpensesByOrg(currentUser.orgId),
  ]);
  const transactionModes = await ensureDefaultTransactionModesForUser(currentUser.orgId, currentUser.id);
  const visibleExpenses =
    currentUser.role === "ADMIN"
      ? expenses
      : expenses.filter((expense) => expense.userId === currentUser.id);
  const visibleTransfers = visibleExpenses.filter((expense) => expense.counterPartyId !== null);

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
  const currentUser = await requireUser();
  const orgId = assertOrgId(currentUser);
  await ensureDefaultTransactionModesForUser(orgId, currentUser.id);

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
    return { error: parsed.error.issues[0]?.message ?? "Unable to create expense" };
  }

  const category = await getCategoryById(parsed.data.categoryId);
  if (!category || category.orgId !== orgId) {
    return { error: "Category does not belong to your organization" };
  }

  const counterPartyId = await resolveCounterpartyId(orgId, parsed.data.counterPartyId);
  if (parsed.data.counterPartyId != null && !counterPartyId) {
    return { error: "Counterparty does not belong to your organization" };
  }

  const transactionMode = await getTransactionModeById(parsed.data.transactionModeId);
  if (!transactionMode || transactionMode.userId !== currentUser.id) {
    return { error: "Transaction mode does not exist" };
  }

  const subcategoryId = await resolveSubcategoryId(orgId, parsed.data.categoryId, parsed.data.subcategoryId);
  if (subcategoryId === undefined) {
    return { error: "Subcategory does not belong to the selected category" };
  }

  const expenseType = category.type;
  const transferStatus = counterPartyId ? "open" : null;
  const tagIds = await resolveTagIds(orgId, parsed.data.tagIds);

  const expense = await createExpenseRecord({
    orgId,
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

  redirect(ROUTES.TRANSACTIONS);
}

export async function updateExpenseAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireUser();
  const orgId = assertOrgId(currentUser);
  await ensureDefaultTransactionModesForUser(orgId, currentUser.id);

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
    return { error: parsed.error.issues[0]?.message ?? "Unable to update expense" };
  }

  if (!expenseIdResult.success) {
    return { error: "Expense is required" };
  }

  const expense = await ensureExpenseOwnershipOrAdmin(expenseIdResult.data.expenseId, currentUser);
  if (!expense) {
    return { error: "Expense does not belong to your organization" };
  }

  const category = await getCategoryById(parsed.data.categoryId);
  if (!category || category.orgId !== orgId) {
    return { error: "Category does not belong to your organization" };
  }

  const counterPartyId = await resolveCounterpartyId(orgId, parsed.data.counterPartyId);
  if (parsed.data.counterPartyId != null && !counterPartyId) {
    return { error: "Counterparty does not belong to your organization" };
  }

  const transactionMode = await getTransactionModeById(parsed.data.transactionModeId);
  if (!transactionMode || transactionMode.userId !== currentUser.id) {
    return { error: "Transaction mode does not exist" };
  }

  const subcategoryId = await resolveSubcategoryId(orgId, parsed.data.categoryId, parsed.data.subcategoryId);
  if (subcategoryId === undefined) {
    return { error: "Subcategory does not belong to the selected category" };
  }

  const expenseType = category.type;
  const transferStatus = counterPartyId ? expense.transferStatus ?? "open" : null;
  const tagIds = await resolveTagIds(orgId, parsed.data.tagIds);

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

  redirect(ROUTES.TRANSACTIONS);
}

export async function updateTransferStatusAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireUser();
  const orgId = assertOrgId(currentUser);
  const parsed = transferStatusUpdateSchema.safeParse({
    expenseId: formData.get("expenseId"),
    transferStatus: formData.get("transferStatus"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to update transfer" };
  }

  const expense = await ensureExpenseOwnershipOrAdmin(parsed.data.expenseId, currentUser);
  if (!expense || expense.orgId !== orgId) {
    return { error: "Transfer does not belong to your organization" };
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
  const orgId = assertOrgId(currentUser);
  const expenseIdResult = expenseIdSchema.safeParse({
    expenseId: formData.get("expenseId"),
  });

  if (!expenseIdResult.success) {
    return { error: "Expense is required" };
  }

  const expense = await ensureExpenseOwnershipOrAdmin(expenseIdResult.data.expenseId, currentUser);
  if (!expense || expense.orgId !== orgId) {
    return { error: "Expense does not belong to your organization" };
  }

  await deleteExpenseRecord(expense.id);

  redirect(ROUTES.TRANSACTIONS);
}
