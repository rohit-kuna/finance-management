"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { requireAdmin, requireUser } from "@/app/lib/auth";
import { ROUTES } from "@/app/lib/constants";
import { getOrganizationById } from "@/app/actions/tables/organizations.table.actions";
import {
  createCategoryRecord,
  deleteCategoryRecord,
  getCategoriesByOrg,
  getCategoryById,
  getCategoryUsageCounts,
  updateCategoryRecord,
} from "@/app/actions/tables/categories.table.actions";
import {
  createBudgetRecord,
  deleteBudgetRecord,
  getBudgetsByOrg,
  getBudgetById,
  updateBudgetRecord,
} from "@/app/actions/tables/budgets.table.actions";
import { getCounterpartiesByOrg } from "@/app/actions/tables/counterparties.table.actions";
import { getOrganizationMembers } from "@/app/actions/tables/organization-members.table.actions";
import { ensureDefaultTransactionModesForUser } from "@/app/actions/tables/transaction-modes.table.actions";
import { getSubcategoriesByOrg } from "@/app/actions/tables/subcategories.table.actions";
import { buildBudgetAllocationSummaries } from "@/app/lib/budget-utils";
import { getBudgetMonthBounds, isValidBudgetMonth } from "@/app/lib/budget-month";
import type { FinanceActionState } from "@/app/actions/auth-roles/finance.types";
import type { OrganizationFinanceDataDto } from "@/app/lib/finance.types";

const categorySchema = z.object({
  name: z.string().trim().min(2, "Category name is required").max(100),
  type: z.enum(["expense", "income"]).default("expense"),
});

const budgetMonthSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : ""),
  z.string().refine(isValidBudgetMonth, "Month is required")
);

const budgetSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  month: budgetMonthSchema,
});

const budgetIdSchema = z.object({
  budgetId: z.coerce.number().int().positive(),
});

const categoryIdSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
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

export async function getOrganizationFinanceData(): Promise<OrganizationFinanceDataDto> {
  const currentUser = await requireUser();

  if (!currentUser.orgId) {
    return {
      organization: null,
      categories: [],
      counterparties: [],
      transactionModes: [],
      members: [],
      budgets: [],
      allocationSummaries: [],
      currentUser: {
        id: currentUser.id,
        role: currentUser.role,
        orgId: null,
      },
    };
  }

  const [organization, categories, counterparties, budgets, members] = await Promise.all([
    getOrganizationById(currentUser.orgId),
    getCategoriesByOrg(currentUser.orgId),
    getCounterpartiesByOrg(currentUser.orgId),
    getBudgetsByOrg(currentUser.orgId),
    getOrganizationMembers(currentUser.orgId),
  ]);
  const transactionModes = await ensureDefaultTransactionModesForUser(currentUser.orgId, currentUser.id);
  const allocationSummaries = buildBudgetAllocationSummaries(budgets);
  const visibleBudgets = budgets.filter(
    (budget) => budget.scope === "family" || (budget.scope === "personal" && budget.userId === currentUser.id)
  );

  return {
    organization: toOrganizationDto(organization),
    categories,
    counterparties,
    transactionModes,
    members: members.map((member) => ({
      id: member.id,
      email: member.email,
      name: member.name,
      role: member.role,
    })),
    budgets: visibleBudgets,
    allocationSummaries,
    currentUser: {
      id: currentUser.id,
      role: currentUser.role,
      orgId: currentUser.orgId,
    },
  };
}

export async function getOrganizationCategoriesForAdmin() {
  const currentUser = await requireAdmin();

  if (!currentUser.orgId) {
    return {
      organization: null,
      categories: [],
      subcategories: [],
    };
  }

  const [organization, categories, subcategories] = await Promise.all([
    getOrganizationById(currentUser.orgId),
    getCategoriesByOrg(currentUser.orgId),
    getSubcategoriesByOrg(currentUser.orgId),
  ]);

  return { organization, categories, subcategories };
}

export async function getOrganizationCategoriesForUser() {
  const currentUser = await requireUser();

  if (!currentUser.orgId) {
    return {
      organization: null,
      categories: [],
      subcategories: [],
      currentUserId: currentUser.id,
    };
  }

  const [organization, categories, subcategories] = await Promise.all([
    getOrganizationById(currentUser.orgId),
    getCategoriesByOrg(currentUser.orgId),
    getSubcategoriesByOrg(currentUser.orgId),
  ]);

  return { organization, categories, subcategories, currentUserId: currentUser.id };
}

export async function createCategoryAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireAdmin();
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to create category" };
  }

  const orgId = assertOrgId(currentUser);
  const existingCategories = await getCategoriesByOrg(orgId);

  if (existingCategories.some((category) => category.name.toLowerCase() === parsed.data.name.toLowerCase())) {
    return { error: "Category already exists" };
  }

  await createCategoryRecord({
    orgId,
    name: parsed.data.name,
    type: parsed.data.type,
    createdBy: currentUser.id,
  });

  redirect(ROUTES.CATEGORIES);
}

export async function updateCategoryAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireAdmin();
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
  });
  const categoryIdResult = categoryIdSchema.safeParse({
    categoryId: formData.get("categoryId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to update category" };
  }

  if (!categoryIdResult.success) {
    return { error: "Category is required" };
  }

  const category = await getCategoryById(categoryIdResult.data.categoryId);
  if (!category || category.orgId !== currentUser.orgId) {
    return { error: "Category does not belong to your organization" };
  }

  if (category.type === "expense" && parsed.data.type === "income") {
    const usage = await getCategoryUsageCounts(category.id);
    if (usage.budgetCount > 0) {
      return { error: "Categories used by budgets must remain expense type" };
    }
  }

  await updateCategoryRecord(category.id, {
    name: parsed.data.name,
    type: parsed.data.type,
    updatedAt: new Date(),
  });

  redirect(ROUTES.CATEGORIES);
}

export async function deleteCategoryAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireAdmin();
  const categoryIdResult = categoryIdSchema.safeParse({
    categoryId: formData.get("categoryId"),
  });

  if (!categoryIdResult.success) {
    return { error: "Category is required" };
  }

  const category = await getCategoryById(categoryIdResult.data.categoryId);
  if (!category || category.orgId !== currentUser.orgId) {
    return { error: "Category does not belong to your organization" };
  }

  const usage = await getCategoryUsageCounts(category.id);
  if (usage.budgetCount > 0 || usage.expenseCount > 0) {
    return {
      error: "Category is in use by existing budgets or expenses and cannot be deleted",
    };
  }

  await deleteCategoryRecord(category.id);
  redirect(ROUTES.CATEGORIES);
}

async function ensurePersonalBudgetOwnership(budgetId: number, currentUserId: string) {
  const budget = await getBudgetById(budgetId);

  if (!budget || budget.userId !== currentUserId || budget.scope !== "personal") {
    return null;
  }

  return budget;
}

async function ensureFamilyBudgetAdminAccess(budgetId: number, orgId: number) {
  const budget = await getBudgetById(budgetId);

  if (!budget || budget.orgId !== orgId || budget.scope !== "family") {
    return null;
  }

  return budget;
}

export async function createPersonalBudgetAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireUser();
  const orgId = assertOrgId(currentUser);
  const parsed = budgetSchema.safeParse({
    categoryId: formData.get("categoryId"),
    amount: formData.get("amount"),
    month: formData.get("month"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to create budget" };
  }

  const category = await getCategoryById(parsed.data.categoryId);
  if (!category || category.orgId !== orgId) {
    return { error: "Category does not belong to your organization" };
  }
  if (category.type !== "expense") {
    return { error: "Budgets can only use expense categories" };
  }

  const bounds = getBudgetMonthBounds(parsed.data.month);

  await createBudgetRecord({
    orgId,
    userId: currentUser.id,
    categoryId: parsed.data.categoryId,
    scope: "personal",
    amount: toMoneyString(parsed.data.amount),
    periodFrom: bounds.periodFrom,
    periodTo: bounds.periodTo,
    createdBy: currentUser.id,
  });

  redirect(ROUTES.BUDGETS);
}

export async function createFamilyBudgetAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireAdmin();
  const orgId = assertOrgId(currentUser);
  const parsed = budgetSchema.safeParse({
    categoryId: formData.get("categoryId"),
    amount: formData.get("amount"),
    month: formData.get("month"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to create family budget" };
  }

  const category = await getCategoryById(parsed.data.categoryId);
  if (!category || category.orgId !== orgId) {
    return { error: "Category does not belong to your organization" };
  }
  if (category.type !== "expense") {
    return { error: "Budgets can only use expense categories" };
  }

  const bounds = getBudgetMonthBounds(parsed.data.month);

  await createBudgetRecord({
    orgId,
    userId: null,
    categoryId: parsed.data.categoryId,
    scope: "family",
    amount: toMoneyString(parsed.data.amount),
    periodFrom: bounds.periodFrom,
    periodTo: bounds.periodTo,
    createdBy: currentUser.id,
  });

  redirect(ROUTES.BUDGETS);
}

export async function updatePersonalBudgetAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireUser();
  const parsed = budgetSchema.safeParse({
    categoryId: formData.get("categoryId"),
    amount: formData.get("amount"),
    month: formData.get("month"),
  });
  const budgetIdResult = budgetIdSchema.safeParse({
    budgetId: formData.get("budgetId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to update budget" };
  }

  if (!budgetIdResult.success) {
    return { error: "Budget is required" };
  }

  const category = await getCategoryById(parsed.data.categoryId);
  if (!category || category.orgId !== currentUser.orgId) {
    return { error: "Category does not belong to your organization" };
  }
  if (category.type !== "expense") {
    return { error: "Budgets can only use expense categories" };
  }

  const bounds = getBudgetMonthBounds(parsed.data.month);

  const budget = await ensurePersonalBudgetOwnership(budgetIdResult.data.budgetId, currentUser.id);
  if (!budget) {
    return { error: "Budget does not belong to you" };
  }

  await updateBudgetRecord(budget.id, {
    categoryId: parsed.data.categoryId,
    amount: toMoneyString(parsed.data.amount),
    periodFrom: bounds.periodFrom,
    periodTo: bounds.periodTo,
    updatedAt: new Date(),
  });

  redirect(ROUTES.BUDGETS);
}

export async function updateFamilyBudgetAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireAdmin();
  const orgId = assertOrgId(currentUser);
  const parsed = budgetSchema.safeParse({
    categoryId: formData.get("categoryId"),
    amount: formData.get("amount"),
    month: formData.get("month"),
  });
  const budgetIdResult = budgetIdSchema.safeParse({
    budgetId: formData.get("budgetId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to update family budget" };
  }

  if (!budgetIdResult.success) {
    return { error: "Budget is required" };
  }

  const category = await getCategoryById(parsed.data.categoryId);
  if (!category || category.orgId !== orgId) {
    return { error: "Category does not belong to your organization" };
  }
  if (category.type !== "expense") {
    return { error: "Budgets can only use expense categories" };
  }

  const bounds = getBudgetMonthBounds(parsed.data.month);

  const budget = await ensureFamilyBudgetAdminAccess(budgetIdResult.data.budgetId, orgId);
  if (!budget) {
    return { error: "Family budget does not belong to your organization" };
  }

  await updateBudgetRecord(budget.id, {
    categoryId: parsed.data.categoryId,
    amount: toMoneyString(parsed.data.amount),
    periodFrom: bounds.periodFrom,
    periodTo: bounds.periodTo,
    updatedAt: new Date(),
  });

  redirect(ROUTES.BUDGETS);
}

export async function deletePersonalBudgetAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireUser();
  const budgetIdResult = budgetIdSchema.safeParse({
    budgetId: formData.get("budgetId"),
  });

  if (!budgetIdResult.success) {
    return { error: "Budget is required" };
  }

  const budget = await ensurePersonalBudgetOwnership(budgetIdResult.data.budgetId, currentUser.id);
  if (!budget) {
    return { error: "Budget does not belong to you" };
  }

  await deleteBudgetRecord(budget.id);
  redirect(ROUTES.BUDGETS);
}

export async function deleteFamilyBudgetAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireAdmin();
  const orgId = assertOrgId(currentUser);
  const budgetIdResult = budgetIdSchema.safeParse({
    budgetId: formData.get("budgetId"),
  });

  if (!budgetIdResult.success) {
    return { error: "Budget is required" };
  }

  const budget = await ensureFamilyBudgetAdminAccess(budgetIdResult.data.budgetId, orgId);
  if (!budget) {
    return { error: "Family budget does not belong to your organization" };
  }

  await deleteBudgetRecord(budget.id);
  redirect(ROUTES.BUDGETS);
}
