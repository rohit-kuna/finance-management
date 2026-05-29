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
import type { FinanceActionState } from "@/app/actions/auth-roles/finance.types";
import type { ExpensesDashboardDataDto } from "@/app/lib/expense.types";
import { parseExpenseDate } from "@/app/lib/expense-date";

const expenseSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  type: z.enum(["expense", "income"]),
  transactionMode: z.enum(["online", "cash"]),
  scope: z.enum(["personal", "family"]),
  necessityScore: z.coerce.number().int().min(1, "Necessity score must be between 1 and 5").max(5),
  note: z.string().trim().max(500).nullable(),
  occurredAt: z.string().trim().min(1, "Expense date is required"),
});

const expenseIdSchema = z.object({
  expenseId: z.coerce.number().int().positive(),
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
    inviteCode: organization.inviteCode,
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

export async function getExpensesDashboardData(): Promise<ExpensesDashboardDataDto> {
  const currentUser = await requireUser();

  if (!currentUser.orgId) {
    return {
      organization: null,
      categories: [],
      expenses: [],
      currentUser: {
        id: currentUser.id,
        role: currentUser.role,
        orgId: null,
      },
    };
  }

  const [organization, categories, expenses] = await Promise.all([
    getOrganizationById(currentUser.orgId),
    getCategoriesByOrg(currentUser.orgId),
    getExpensesByOrg(currentUser.orgId),
  ]);
  const visibleExpenses = expenses.filter((expense) => expense.userId === currentUser.id);

  return {
    organization: toOrganizationDto(organization),
    categories,
    expenses: visibleExpenses,
    currentUser: {
      id: currentUser.id,
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

  const parsed = expenseSchema.safeParse({
    categoryId: formData.get("categoryId"),
    amount: formData.get("amount"),
    type: normalizeField(formData.get("type")) ?? "expense",
    transactionMode: normalizeField(formData.get("transactionMode")) ?? "online",
    scope: normalizeField(formData.get("scope")) ?? "personal",
    necessityScore: formData.get("necessityScore"),
    note: normalizeField(formData.get("note")) ?? null,
    occurredAt: formData.get("occurredAt"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to create expense" };
  }

  const category = await getCategoryById(parsed.data.categoryId);
  if (!category || category.orgId !== orgId) {
    return { error: "Category does not belong to your organization" };
  }

  await createExpenseRecord({
    orgId,
    userId: currentUser.id,
    categoryId: parsed.data.categoryId,
    amount: toMoneyString(parsed.data.amount),
    type: parsed.data.type,
    transactionMode: parsed.data.transactionMode,
    scope: parsed.data.scope,
    necessityScore: parsed.data.necessityScore,
    note: parsed.data.note,
    occurredAt: parseExpenseDate(parsed.data.occurredAt),
  });

  redirect(ROUTES.EXPENSES);
}

export async function updateExpenseAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireUser();
  const orgId = assertOrgId(currentUser);

  const parsed = expenseSchema.safeParse({
    categoryId: formData.get("categoryId"),
    amount: formData.get("amount"),
    type: normalizeField(formData.get("type")) ?? "expense",
    transactionMode: normalizeField(formData.get("transactionMode")) ?? "online",
    scope: normalizeField(formData.get("scope")) ?? "personal",
    necessityScore: formData.get("necessityScore"),
    note: normalizeField(formData.get("note")) ?? null,
    occurredAt: formData.get("occurredAt"),
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

  await updateExpenseRecord(expense.id, {
    categoryId: parsed.data.categoryId,
    amount: toMoneyString(parsed.data.amount),
    type: parsed.data.type,
    transactionMode: parsed.data.transactionMode,
    scope: parsed.data.scope,
    necessityScore: parsed.data.necessityScore,
    note: parsed.data.note,
    occurredAt: parseExpenseDate(parsed.data.occurredAt),
    updatedAt: new Date(),
  });

  redirect(ROUTES.EXPENSES);
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

  const expense = await ensureExpenseOwnershipOrAdmin(expenseIdResult.data.expenseId, currentUser);
  if (!expense) {
    return { error: "Expense does not belong to your organization" };
  }

  await deleteExpenseRecord(expense.id);
  redirect(ROUTES.EXPENSES);
}
