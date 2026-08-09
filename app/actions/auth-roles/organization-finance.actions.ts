"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "@/app/lib/auth";
import { ROUTES } from "@/app/lib/constants";
import { getOrganizationById } from "@/app/actions/tables/organizations.table.actions";
import {
  createSpaceCategoryRecord,
  deleteSpaceCategoryRecord,
  getSpaceCategoriesByOrg,
  getSpaceCategoryByOrgAndName,
  getSpaceCategoryById,
  getSpaceCategoryUsageCounts,
  updateSpaceCategoryRecord,
} from "@/app/actions/tables/space-categories.table.actions";
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
import { getUserCategoriesByOrg } from "@/app/actions/tables/user-categories.table.actions";
import { buildBudgetAllocationSummaries } from "@/app/lib/budget-utils";
import { getBudgetMonthBounds, isValidBudgetMonth } from "@/app/lib/budget-month";
import type { FinanceActionState } from "@/app/actions/auth-roles/finance.types";
import type { OrganizationFinanceDataDto, SpaceCategoryRecordDto } from "@/app/lib/finance.types";

const spaceCategorySchema = z.object({
  name: z.string().trim().min(2, "Space category name is required").max(100),
  type: z.enum(["expense", "income"]).default("expense"),
});

const budgetMonthSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : ""),
  z.string().refine(isValidBudgetMonth, "Month is required")
);

const budgetSchema = z.object({
  spaceCategoryId: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  month: budgetMonthSchema,
});

const budgetIdSchema = z.object({
  budgetId: z.coerce.number().int().positive(),
});

const spaceCategoryIdSchema = z.object({
  spaceCategoryId: z.coerce.number().int().positive(),
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
    isPersonal: organization.isPersonal,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
  };
}

export async function getOrganizationFinanceData(): Promise<OrganizationFinanceDataDto> {
  const currentUser = await requireUser();

  if (!currentUser.orgId) {
    return {
      organization: null,
      spaceCategories: [],
      userCategories: [],
      counterparties: [],
      transactionModes: [],
      members: [],
      budgets: [],
      allocationSummaries: [],
      currentUser: {
        id: currentUser.id,
        role: currentUser.role,
        orgId: null,
        scope: currentUser.scope,
      },
    };
  }

  const [organization, spaceCategories, userCategories, counterparties, budgets, members, transactionModes] = await Promise.all([
    getOrganizationById(currentUser.orgId),
    getSpaceCategoriesByOrg(currentUser.orgId),
    currentUser.personalOrgId ? getUserCategoriesByOrg(currentUser.personalOrgId) : Promise.resolve([]),
    getCounterpartiesByOrg(currentUser.orgId),
    getBudgetsByOrg(currentUser.orgId),
    getOrganizationMembers(currentUser.orgId),
    ensureDefaultTransactionModesForUser(currentUser.orgId, currentUser.id),
  ]);
  const allocationSummaries = buildBudgetAllocationSummaries(budgets);
  const visibleBudgets = budgets.filter(
    (budget) => budget.scope === "shared" || (budget.scope === "personal" && budget.userId === currentUser.id)
  );

  return {
    organization: toOrganizationDto(organization),
    spaceCategories,
    userCategories,
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
      scope: currentUser.scope,
    },
  };
}

export async function createSpaceCategoryAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireAdmin();
  const parsed = spaceCategorySchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to create space category" };
  }

  const orgId = assertOrgId(currentUser);

  if (await getSpaceCategoryByOrgAndName(orgId, parsed.data.name)) {
    return { error: "Space category already exists" };
  }

  await createSpaceCategoryRecord({
    orgId,
    name: parsed.data.name,
    type: parsed.data.type,
    createdBy: currentUser.id,
  });

  redirect(ROUTES.CATEGORIES);
}

/**
 * No-redirect variant of createSpaceCategoryAction, used by the transaction
 * form's inline "create category" step (which lives inside a client-managed
 * combobox, not a plain <form>, so a redirecting server action would break
 * the flow).
 */
export async function createSpaceCategoryInline(
  name: string,
  type: "expense" | "income"
): Promise<{ spaceCategory: SpaceCategoryRecordDto } | { error: string }> {
  const currentUser = await requireAdmin();
  const parsed = spaceCategorySchema.safeParse({ name, type });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to create space category" };
  }

  const orgId = assertOrgId(currentUser);

  const existing = await getSpaceCategoryByOrgAndName(orgId, parsed.data.name);
  if (existing) {
    return { spaceCategory: existing };
  }

  const record = await createSpaceCategoryRecord({
    orgId,
    name: parsed.data.name,
    type: parsed.data.type,
    createdBy: currentUser.id,
  });

  if (!record) {
    return { error: "Unable to create space category" };
  }

  revalidatePath(ROUTES.CATEGORIES);
  return {
    spaceCategory: {
      id: record.id,
      orgId: record.orgId,
      name: record.name,
      type: record.type,
      createdBy: record.createdBy,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    },
  };
}

export async function updateSpaceCategoryAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireAdmin();
  const parsed = spaceCategorySchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
  });
  const spaceCategoryIdResult = spaceCategoryIdSchema.safeParse({
    spaceCategoryId: formData.get("spaceCategoryId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to update space category" };
  }

  if (!spaceCategoryIdResult.success) {
    return { error: "Space category is required" };
  }

  const spaceCategory = await getSpaceCategoryById(spaceCategoryIdResult.data.spaceCategoryId);
  if (!spaceCategory || spaceCategory.orgId !== currentUser.orgId) {
    return { error: "Space category does not belong to your organization" };
  }

  if (spaceCategory.type === "expense" && parsed.data.type === "income") {
    const usage = await getSpaceCategoryUsageCounts(spaceCategory.id);
    if (usage.budgetCount > 0) {
      return { error: "Space categories used by budgets must remain expense type" };
    }
  }

  await updateSpaceCategoryRecord(spaceCategory.id, {
    name: parsed.data.name,
    type: parsed.data.type,
    updatedAt: new Date(),
  });

  redirect(ROUTES.CATEGORIES);
}

export async function deleteSpaceCategoryAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireAdmin();
  const spaceCategoryIdResult = spaceCategoryIdSchema.safeParse({
    spaceCategoryId: formData.get("spaceCategoryId"),
  });

  if (!spaceCategoryIdResult.success) {
    return { error: "Space category is required" };
  }

  const spaceCategory = await getSpaceCategoryById(spaceCategoryIdResult.data.spaceCategoryId);
  if (!spaceCategory || spaceCategory.orgId !== currentUser.orgId) {
    return { error: "Space category does not belong to your organization" };
  }

  const usage = await getSpaceCategoryUsageCounts(spaceCategory.id);
  if (usage.budgetCount > 0) {
    return {
      error: "Space category is in use by existing budgets and cannot be deleted",
    };
  }

  await deleteSpaceCategoryRecord(spaceCategory.id);
  revalidatePath(ROUTES.CATEGORIES);
  return { error: null };
}

async function ensurePersonalBudgetOwnership(budgetId: number, currentUserId: string) {
  const budget = await getBudgetById(budgetId);

  if (!budget || budget.userId !== currentUserId || budget.scope !== "personal") {
    return null;
  }

  return budget;
}

async function ensureSharedBudgetAdminAccess(budgetId: number, orgId: number) {
  const budget = await getBudgetById(budgetId);

  if (!budget || budget.orgId !== orgId || budget.scope !== "shared") {
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
    spaceCategoryId: formData.get("spaceCategoryId"),
    amount: formData.get("amount"),
    month: formData.get("month"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to create budget" };
  }

  const spaceCategory = await getSpaceCategoryById(parsed.data.spaceCategoryId);
  if (!spaceCategory || spaceCategory.orgId !== orgId) {
    return { error: "Space category does not belong to your organization" };
  }
  if (spaceCategory.type !== "expense") {
    return { error: "Budgets can only use expense space categories" };
  }

  const bounds = getBudgetMonthBounds(parsed.data.month);

  await createBudgetRecord({
    orgId,
    userId: currentUser.id,
    spaceCategoryId: parsed.data.spaceCategoryId,
    scope: "personal",
    amount: toMoneyString(parsed.data.amount),
    periodFrom: bounds.periodFrom,
    periodTo: bounds.periodTo,
    createdBy: currentUser.id,
  });

  redirect(ROUTES.BUDGETS);
}

export async function createSharedBudgetAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireAdmin();
  const orgId = assertOrgId(currentUser);
  const parsed = budgetSchema.safeParse({
    spaceCategoryId: formData.get("spaceCategoryId"),
    amount: formData.get("amount"),
    month: formData.get("month"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to create shared budget" };
  }

  const spaceCategory = await getSpaceCategoryById(parsed.data.spaceCategoryId);
  if (!spaceCategory || spaceCategory.orgId !== orgId) {
    return { error: "Space category does not belong to your organization" };
  }
  if (spaceCategory.type !== "expense") {
    return { error: "Budgets can only use expense space categories" };
  }

  const bounds = getBudgetMonthBounds(parsed.data.month);

  await createBudgetRecord({
    orgId,
    userId: null,
    spaceCategoryId: parsed.data.spaceCategoryId,
    scope: "shared",
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
    spaceCategoryId: formData.get("spaceCategoryId"),
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

  const spaceCategory = await getSpaceCategoryById(parsed.data.spaceCategoryId);
  if (!spaceCategory || spaceCategory.orgId !== currentUser.orgId) {
    return { error: "Space category does not belong to your organization" };
  }
  if (spaceCategory.type !== "expense") {
    return { error: "Budgets can only use expense space categories" };
  }

  const bounds = getBudgetMonthBounds(parsed.data.month);

  const budget = await ensurePersonalBudgetOwnership(budgetIdResult.data.budgetId, currentUser.id);
  if (!budget) {
    return { error: "Budget does not belong to you" };
  }

  await updateBudgetRecord(budget.id, {
    spaceCategoryId: parsed.data.spaceCategoryId,
    amount: toMoneyString(parsed.data.amount),
    periodFrom: bounds.periodFrom,
    periodTo: bounds.periodTo,
    updatedAt: new Date(),
  });

  redirect(ROUTES.BUDGETS);
}

export async function updateSharedBudgetAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireAdmin();
  const orgId = assertOrgId(currentUser);
  const parsed = budgetSchema.safeParse({
    spaceCategoryId: formData.get("spaceCategoryId"),
    amount: formData.get("amount"),
    month: formData.get("month"),
  });
  const budgetIdResult = budgetIdSchema.safeParse({
    budgetId: formData.get("budgetId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to update shared budget" };
  }

  if (!budgetIdResult.success) {
    return { error: "Budget is required" };
  }

  const spaceCategory = await getSpaceCategoryById(parsed.data.spaceCategoryId);
  if (!spaceCategory || spaceCategory.orgId !== orgId) {
    return { error: "Space category does not belong to your organization" };
  }
  if (spaceCategory.type !== "expense") {
    return { error: "Budgets can only use expense space categories" };
  }

  const bounds = getBudgetMonthBounds(parsed.data.month);

  const budget = await ensureSharedBudgetAdminAccess(budgetIdResult.data.budgetId, orgId);
  if (!budget) {
    return { error: "Shared budget does not belong to your organization" };
  }

  await updateBudgetRecord(budget.id, {
    spaceCategoryId: parsed.data.spaceCategoryId,
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

export async function deleteSharedBudgetAction(
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

  const budget = await ensureSharedBudgetAdminAccess(budgetIdResult.data.budgetId, orgId);
  if (!budget) {
    return { error: "Shared budget does not belong to your organization" };
  }

  await deleteBudgetRecord(budget.id);
  redirect(ROUTES.BUDGETS);
}
