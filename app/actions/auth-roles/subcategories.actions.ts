"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/app/lib/auth";
import { ROUTES } from "@/app/lib/constants";
import { getCategoryById } from "@/app/actions/tables/categories.table.actions";
import {
  createSubcategoryRecord,
  deleteSubcategoryRecord,
  getSubcategoriesByOrg,
  getSubcategoryById,
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

function normalizeSubcategoryName(value: string) {
  return value.trim().toLowerCase();
}

function findDuplicateSubcategory(
  existingSubcategories: SubcategoryRecordDto[],
  categoryId: number,
  name: string,
  excludeSubcategoryId?: number
) {
  const normalizedName = normalizeSubcategoryName(name);
  return existingSubcategories.find(
    (subcategory) =>
      subcategory.id !== excludeSubcategoryId &&
      subcategory.categoryId === categoryId &&
      normalizeSubcategoryName(subcategory.name) === normalizedName
  );
}

function assertOrgId(currentUser: Awaited<ReturnType<typeof requireUser>>) {
  if (!currentUser.orgId) {
    throw new Error("Create or join an organization first");
  }

  return currentUser.orgId;
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

  const orgId = assertOrgId(currentUser);
  const category = await getCategoryById(parsed.data.categoryId);
  if (!category || category.orgId !== orgId) {
    return { error: "Category does not belong to your organization" };
  }

  const existingSubcategories = await getSubcategoriesByOrg(orgId);
  if (findDuplicateSubcategory(existingSubcategories, parsed.data.categoryId, parsed.data.name)) {
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

  const orgId = assertOrgId(currentUser);
  const category = await getCategoryById(parsed.data.categoryId);
  if (!category || category.orgId !== orgId) {
    return { error: "Category does not belong to your organization" };
  }

  const existingSubcategories = await getSubcategoriesByOrg(orgId);
  const existingSubcategory = findDuplicateSubcategory(existingSubcategories, parsed.data.categoryId, parsed.data.name);

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

  const orgId = assertOrgId(currentUser);
  const subcategory = await getSubcategoryById(subcategoryIdResult.data.subcategoryId);

  if (!subcategory || subcategory.orgId !== orgId) {
    return { error: "Subcategory does not belong to your organization" };
  }

  if (currentUser.role !== "ADMIN" && subcategory.createdBy !== currentUser.id) {
    return { error: "You can only manage subcategories you created" };
  }

  const category = await getCategoryById(parsed.data.categoryId);
  if (!category || category.orgId !== orgId) {
    return { error: "Category does not belong to your organization" };
  }

  const existingSubcategories = await getSubcategoriesByOrg(orgId);
  if (findDuplicateSubcategory(existingSubcategories, parsed.data.categoryId, parsed.data.name, subcategory.id)) {
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

  const orgId = assertOrgId(currentUser);
  const subcategory = await getSubcategoryById(subcategoryIdResult.data.subcategoryId);

  if (!subcategory || subcategory.orgId !== orgId) {
    return { error: "Subcategory does not belong to your organization" };
  }

  if (currentUser.role !== "ADMIN" && subcategory.createdBy !== currentUser.id) {
    return { error: "You can only manage subcategories you created" };
  }

  await deleteSubcategoryRecord(subcategory.id);

  redirect(resolveReturnTo(formData));
}
