"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/app/lib/auth";
import { ROUTES } from "@/app/lib/constants";
import { getOrganizationById } from "@/app/actions/tables/organizations.table.actions";
import { getOrganizationMembership } from "@/app/actions/tables/organization-members.table.actions";
import { getCategoriesByOrg, getSystemDefaultCategoryForOrg } from "@/app/actions/tables/categories.table.actions";
import { getSubcategoriesByOrg, getSubcategoryById } from "@/app/actions/tables/subcategories.table.actions";
import {
  deleteMapping,
  getCategoryByIdAndOrg,
  getMappingsForUserAndOrg,
  upsertMapping,
} from "@/app/actions/tables/subcategory-space-mappings.table.actions";
import type { FinanceActionState } from "@/app/actions/auth-roles/finance.types";
import type { CategoryRecordDto } from "@/app/lib/finance.types";

export type SubcategoryMappingRowDto = {
  subcategoryId: number;
  subcategoryName: string;
  parentCategoryName: string;
  mappedCategoryId: number | null; // null = unmapped, falls back to "Others" at read time
  resolvedCategoryId: number | null; // mappedCategoryId, or the space's Others category if unmapped
};

export type SpaceMappingDataDto = {
  targetOrgId: number;
  organizationName: string;
  availableCategories: CategoryRecordDto[];
  rows: SubcategoryMappingRowDto[];
};

async function requireSharedSpaceMembership(targetOrgId: number, userId: string) {
  const [organization, membership] = await Promise.all([
    getOrganizationById(targetOrgId),
    getOrganizationMembership(targetOrgId, userId),
  ]);

  if (!organization || organization.isPersonal || !membership) {
    return null;
  }

  return organization;
}

export async function getMySubcategoryMappingsForSpace(targetOrgId: number): Promise<SpaceMappingDataDto | null> {
  const currentUser = await requireUser();
  if (!currentUser.personalOrgId) return null;

  const organization = await requireSharedSpaceMembership(targetOrgId, currentUser.id);
  if (!organization) return null;

  const [mySubcategories, spaceCategories, existingMappings, myCategories] = await Promise.all([
    getSubcategoriesByOrg(currentUser.personalOrgId),
    getCategoriesByOrg(targetOrgId),
    getMappingsForUserAndOrg(currentUser.id, targetOrgId),
    getCategoriesByOrg(currentUser.personalOrgId),
  ]);

  const mappingBySubcategoryId = new Map(existingMappings.map((m) => [m.subcategoryId, m]));
  const parentCategoryNameById = new Map(myCategories.map((c) => [c.id, c.name] as const));

  const rows: SubcategoryMappingRowDto[] = mySubcategories.map((sub) => {
    const mapping = mappingBySubcategoryId.get(sub.id);
    const mappedCategoryId = mapping?.categoryId ?? null;
    return {
      subcategoryId: sub.id,
      subcategoryName: sub.name,
      parentCategoryName: parentCategoryNameById.get(sub.categoryId) ?? "",
      mappedCategoryId,
      resolvedCategoryId: mappedCategoryId,
    };
  });

  return {
    targetOrgId,
    organizationName: organization.name,
    availableCategories: spaceCategories,
    rows,
  };
}

const mappingSchema = z.object({
  subcategoryId: z.coerce.number().int().positive(),
  targetOrgId: z.coerce.number().int().positive(),
  categoryId: z.coerce.number().int().positive(),
});

async function assertOwnsSubcategoryAndSpace(
  currentUser: Awaited<ReturnType<typeof requireUser>>,
  subcategoryId: number,
  targetOrgId: number
) {
  if (!currentUser.personalOrgId) return null;

  const [subcategory, organization] = await Promise.all([
    getSubcategoryById(subcategoryId),
    requireSharedSpaceMembership(targetOrgId, currentUser.id),
  ]);

  if (!subcategory || subcategory.orgId !== currentUser.personalOrgId || subcategory.createdBy !== currentUser.id) {
    return null;
  }
  if (!organization) return null;

  return { subcategory, organization };
}

export async function updateSubcategoryMappingAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireUser();
  const parsed = mappingSchema.safeParse({
    subcategoryId: formData.get("subcategoryId"),
    targetOrgId: formData.get("targetOrgId"),
    categoryId: formData.get("categoryId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to update mapping" };
  }

  const ownership = await assertOwnsSubcategoryAndSpace(currentUser, parsed.data.subcategoryId, parsed.data.targetOrgId);
  if (!ownership) {
    return { error: "Subcategory or space is not available to you" };
  }

  const category = await getCategoryByIdAndOrg(parsed.data.categoryId, parsed.data.targetOrgId);
  if (!category) {
    return { error: "Category does not belong to this space" };
  }

  await upsertMapping({
    subcategoryId: parsed.data.subcategoryId,
    targetOrgId: parsed.data.targetOrgId,
    categoryId: parsed.data.categoryId,
    updatedBy: currentUser.id,
  });

  revalidatePath(ROUTES.SUBCATEGORIES);
  return { error: null };
}

const unmapSchema = z.object({
  subcategoryId: z.coerce.number().int().positive(),
  targetOrgId: z.coerce.number().int().positive(),
});

export async function unmapSubcategoryAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireUser();
  const parsed = unmapSchema.safeParse({
    subcategoryId: formData.get("subcategoryId"),
    targetOrgId: formData.get("targetOrgId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to unmap subcategory" };
  }

  const ownership = await assertOwnsSubcategoryAndSpace(currentUser, parsed.data.subcategoryId, parsed.data.targetOrgId);
  if (!ownership) {
    return { error: "Subcategory or space is not available to you" };
  }

  await deleteMapping(parsed.data.subcategoryId, parsed.data.targetOrgId);

  revalidatePath(ROUTES.SUBCATEGORIES);
  return { error: null };
}

// Resolves the display category for a subcategory in a shared space, falling
// back to that space's "Others" category (matching the subcategory's own
// category type) when no explicit mapping exists.
export async function resolveDisplayCategoryId(
  targetOrgId: number,
  subcategoryCategoryType: "expense" | "income",
  mappedCategoryId: number | null
) {
  if (mappedCategoryId != null) return mappedCategoryId;
  const fallback = await getSystemDefaultCategoryForOrg(targetOrgId, subcategoryCategoryType);
  return fallback?.id ?? null;
}
