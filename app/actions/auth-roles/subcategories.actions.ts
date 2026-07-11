"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/app/lib/auth";
import { ROUTES } from "@/app/lib/constants";
import { getCategoryById } from "@/app/actions/tables/categories.table.actions";
import {
  createSubcategoryRecord,
  deleteSubcategoryRecord,
  getSubcategoryByOrgCategoryAndName,
  getSubcategoryById,
  getSubcategoryUsageCount,
  updateSubcategoryRecord,
} from "@/app/actions/tables/subcategories.table.actions";
import type { FinanceActionState } from "@/app/actions/auth-roles/finance.types";
import type { SubcategoryRecordDto } from "@/app/lib/finance.types";

const subcategorySchema = z.object({
  name: z.string().trim().min(2, "Subcategory name is required").max(100),
  categoryId: z.coerce.number().int().positive(),
});

const subcategoryIdSchema = z.object({
  subcategoryId: z.coerce.number().int().positive(),
});

// Subcategories are always a personal-space, user-level attribute — never
// space-specific — regardless of which space (personal or shared) is
// currently active for navigation. Categories are the space-level attribute.
function assertPersonalOrgId(currentUser: Awaited<ReturnType<typeof requireUser>>) {
  if (!currentUser.personalOrgId) {
    throw new Error("Set up your personal space first");
  }

  return currentUser.personalOrgId;
}

function resolveReturnTo(formData: FormData) {
  const returnTo = formData.get("returnTo");
  return returnTo === ROUTES.SUBCATEGORIES ? ROUTES.SUBCATEGORIES : ROUTES.CATEGORIES;
}

export async function createSubcategoryAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireUser();
  const parsed = subcategorySchema.safeParse({
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to create subcategory" };
  }

  const orgId = assertPersonalOrgId(currentUser);
  const category = await getCategoryById(parsed.data.categoryId);
  if (!category || category.orgId !== orgId) {
    return { error: "Category does not belong to your personal space" };
  }

  if (await getSubcategoryByOrgCategoryAndName(orgId, parsed.data.categoryId, parsed.data.name)) {
    return { error: "Subcategory already exists for this category" };
  }

  await createSubcategoryRecord({
    orgId,
    categoryId: parsed.data.categoryId,
    name: parsed.data.name,
    createdBy: currentUser.id,
  });

  redirect(resolveReturnTo(formData));
}

export async function createSubcategoryInline(
  categoryId: number,
  name: string
): Promise<{ subcategory: SubcategoryRecordDto } | { error: string }> {
  const currentUser = await requireUser();
  const parsed = subcategorySchema.safeParse({ name, categoryId });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to create subcategory" };
  }

  const orgId = assertPersonalOrgId(currentUser);
  const category = await getCategoryById(parsed.data.categoryId);
  if (!category || category.orgId !== orgId) {
    return { error: "Category does not belong to your personal space" };
  }

  const existingSubcategory = await getSubcategoryByOrgCategoryAndName(orgId, parsed.data.categoryId, parsed.data.name);

  if (existingSubcategory) {
    return { subcategory: existingSubcategory };
  }

  const record = await createSubcategoryRecord({
    orgId,
    categoryId: parsed.data.categoryId,
    name: parsed.data.name,
    createdBy: currentUser.id,
  });

  if (!record) {
    return { error: "Unable to create subcategory" };
  }

  return {
    subcategory: {
      id: record.id,
      orgId: record.orgId,
      categoryId: record.categoryId,
      name: record.name,
      createdBy: record.createdBy,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    },
  };
}

export async function updateSubcategoryAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireUser();
  const parsed = subcategorySchema.safeParse({
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
  });
  const subcategoryIdResult = subcategoryIdSchema.safeParse({
    subcategoryId: formData.get("subcategoryId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to update subcategory" };
  }

  if (!subcategoryIdResult.success) {
    return { error: "Subcategory is required" };
  }

  const orgId = assertPersonalOrgId(currentUser);
  const subcategory = await getSubcategoryById(subcategoryIdResult.data.subcategoryId);

  if (!subcategory || subcategory.orgId !== orgId || subcategory.createdBy !== currentUser.id) {
    return { error: "Subcategory does not belong to you" };
  }

  const category = await getCategoryById(parsed.data.categoryId);
  if (!category || category.orgId !== orgId) {
    return { error: "Category does not belong to your personal space" };
  }

  if (
    await getSubcategoryByOrgCategoryAndName(orgId, parsed.data.categoryId, parsed.data.name, subcategory.id)
  ) {
    return { error: "Subcategory already exists for this category" };
  }

  await updateSubcategoryRecord(subcategory.id, {
    name: parsed.data.name,
    categoryId: parsed.data.categoryId,
    updatedAt: new Date(),
  });

  redirect(resolveReturnTo(formData));
}

export async function deleteSubcategoryAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireUser();
  const subcategoryIdResult = subcategoryIdSchema.safeParse({
    subcategoryId: formData.get("subcategoryId"),
  });

  if (!subcategoryIdResult.success) {
    return { error: "Subcategory is required" };
  }

  const orgId = assertPersonalOrgId(currentUser);
  const subcategory = await getSubcategoryById(subcategoryIdResult.data.subcategoryId);

  if (!subcategory || subcategory.orgId !== orgId || subcategory.createdBy !== currentUser.id) {
    return { error: "Subcategory does not belong to you" };
  }

  const usageCount = await getSubcategoryUsageCount(subcategory.id);
  if (usageCount > 0) {
    return { error: "Subcategory is in use by existing transactions and cannot be deleted" };
  }

  await deleteSubcategoryRecord(subcategory.id);

  redirect(resolveReturnTo(formData));
}
