"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/app/lib/auth";
import { ROUTES } from "@/app/lib/constants";
import { getOrganizationById } from "@/app/actions/tables/organizations.table.actions";
import { getOrganizationMembership } from "@/app/actions/tables/organization-members.table.actions";
import {
  createSpaceCategoryRecord,
  getSpaceCategoriesByOrg,
  getSpaceCategoryByOrgAndName,
} from "@/app/actions/tables/space-categories.table.actions";
import { getUserCategoriesByOrg, getUserCategoryById } from "@/app/actions/tables/user-categories.table.actions";
import {
  deleteMapping,
  getSpaceCategoryByIdAndOrg,
  getMappingsForUserAndOrg,
  upsertMapping,
} from "@/app/actions/tables/user-category-space-category-mappings.table.actions";
import type { FinanceActionState } from "@/app/actions/auth-roles/finance.types";
import type { SpaceCategoryRecordDto } from "@/app/lib/finance.types";

export type UserCategoryMappingRowDto = {
  userCategoryId: number;
  userCategoryName: string;
  personalSpaceCategoryName: string | null; // where this UserCategory lives in the owner's personal space, if mapped there
  mappedSpaceCategoryId: number | null; // null = Unmapped for this space — no fallback
};

export type UserCategorySpaceMappingDataDto = {
  targetOrgId: number;
  organizationName: string;
  availableSpaceCategories: SpaceCategoryRecordDto[];
  rows: UserCategoryMappingRowDto[];
};

export async function requireSharedSpaceMembership(targetOrgId: number, userId: string) {
  const [organization, membership] = await Promise.all([
    getOrganizationById(targetOrgId),
    getOrganizationMembership(targetOrgId, userId),
  ]);

  if (!organization || organization.isPersonal || !membership) {
    return null;
  }

  return organization;
}

export async function getMyUserCategoryMappingsForSpace(targetOrgId: number): Promise<UserCategorySpaceMappingDataDto | null> {
  const currentUser = await requireUser();
  if (!currentUser.personalOrgId) return null;

  const organization = await requireSharedSpaceMembership(targetOrgId, currentUser.id);
  if (!organization) return null;

  const [myUserCategories, targetSpaceCategories, existingMappings, mySpaceCategories] = await Promise.all([
    getUserCategoriesByOrg(currentUser.personalOrgId),
    getSpaceCategoriesByOrg(targetOrgId),
    getMappingsForUserAndOrg(currentUser.id, targetOrgId),
    getSpaceCategoriesByOrg(currentUser.personalOrgId),
  ]);

  const mappingByUserCategoryId = new Map(existingMappings.map((m) => [m.userCategoryId, m]));
  const personalSpaceCategoryNameById = new Map(mySpaceCategories.map((c) => [c.id, c.name] as const));

  const rows: UserCategoryMappingRowDto[] = myUserCategories.map((userCategory) => {
    const mapping = mappingByUserCategoryId.get(userCategory.id);
    return {
      userCategoryId: userCategory.id,
      userCategoryName: userCategory.name,
      personalSpaceCategoryName:
        userCategory.spaceCategoryId != null ? personalSpaceCategoryNameById.get(userCategory.spaceCategoryId) ?? null : null,
      mappedSpaceCategoryId: mapping?.spaceCategoryId ?? null,
    };
  });

  return {
    targetOrgId,
    organizationName: organization.name,
    availableSpaceCategories: targetSpaceCategories,
    rows,
  };
}

export type ImportableSpaceCategoryDto = SpaceCategoryRecordDto & {
  alreadyExists: boolean; // caller already has a personal SpaceCategory with this name — hinted, not auto-imported
};

export type ImportCategoriesDataDto = {
  targetOrgId: number;
  organizationName: string;
  categories: ImportableSpaceCategoryDto[];
};

export async function getImportableCategoriesForSpace(targetOrgId: number): Promise<ImportCategoriesDataDto | null> {
  const currentUser = await requireUser();
  if (!currentUser.personalOrgId) return null;

  const organization = await requireSharedSpaceMembership(targetOrgId, currentUser.id);
  if (!organization) return null;

  const [targetSpaceCategories, mySpaceCategories] = await Promise.all([
    getSpaceCategoriesByOrg(targetOrgId),
    getSpaceCategoriesByOrg(currentUser.personalOrgId),
  ]);

  const myNames = new Set(mySpaceCategories.map((c) => c.name.trim().toLowerCase()));

  return {
    targetOrgId,
    organizationName: organization.name,
    categories: targetSpaceCategories.map((category) => ({
      ...category,
      alreadyExists: myNames.has(category.name.trim().toLowerCase()),
    })),
  };
}

const importCategoriesSchema = z.object({
  targetOrgId: z.coerce.number().int().positive(),
  spaceCategoryIds: z.array(z.coerce.number().int().positive()).min(1, "Select at least one category to import"),
});

/**
 * Copies selected SpaceCategories from a shared space into the caller's
 * personal space as new personal SpaceCategories (top-level Kanban columns)
 * — a head start on personal category structure, not a mapping. A category
 * whose name already exists personally is silently skipped (the picker
 * already hints this) rather than erroring, since re-running an import is
 * expected.
 */
export async function importSharedSpaceCategoriesAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireUser();
  if (!currentUser.personalOrgId) {
    return { error: "Set up your personal space first" };
  }

  const parsed = importCategoriesSchema.safeParse({
    targetOrgId: formData.get("targetOrgId"),
    spaceCategoryIds: formData.getAll("spaceCategoryId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to import categories" };
  }

  const organization = await requireSharedSpaceMembership(parsed.data.targetOrgId, currentUser.id);
  if (!organization) {
    return { error: "Space is not available to you" };
  }

  const personalOrgId = currentUser.personalOrgId;

  for (const spaceCategoryId of parsed.data.spaceCategoryIds) {
    const spaceCategory = await getSpaceCategoryByIdAndOrg(spaceCategoryId, parsed.data.targetOrgId);
    if (!spaceCategory) continue;

    const existing = await getSpaceCategoryByOrgAndName(personalOrgId, spaceCategory.name);
    if (existing) continue;

    await createSpaceCategoryRecord({
      orgId: personalOrgId,
      name: spaceCategory.name,
      type: spaceCategory.type,
      createdBy: currentUser.id,
    });
  }

  revalidatePath(ROUTES.CATEGORIES);
  revalidatePath(ROUTES.IMPORT_CATEGORIES);
  return { error: null };
}

const mappingSchema = z.object({
  userCategoryId: z.coerce.number().int().positive(),
  targetOrgId: z.coerce.number().int().positive(),
  spaceCategoryId: z.coerce.number().int().positive(),
});

async function assertOwnsUserCategoryAndSpace(
  currentUser: Awaited<ReturnType<typeof requireUser>>,
  userCategoryId: number,
  targetOrgId: number
) {
  if (!currentUser.personalOrgId) return null;

  const [userCategory, organization] = await Promise.all([
    getUserCategoryById(userCategoryId),
    requireSharedSpaceMembership(targetOrgId, currentUser.id),
  ]);

  if (!userCategory || userCategory.orgId !== currentUser.personalOrgId || userCategory.createdBy !== currentUser.id) {
    return null;
  }
  if (!organization) return null;

  return { userCategory, organization };
}

export async function updateUserCategoryMappingAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireUser();
  const parsed = mappingSchema.safeParse({
    userCategoryId: formData.get("userCategoryId"),
    targetOrgId: formData.get("targetOrgId"),
    spaceCategoryId: formData.get("spaceCategoryId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to update mapping" };
  }

  const ownership = await assertOwnsUserCategoryAndSpace(currentUser, parsed.data.userCategoryId, parsed.data.targetOrgId);
  if (!ownership) {
    return { error: "Space category or space is not available to you" };
  }

  const spaceCategory = await getSpaceCategoryByIdAndOrg(parsed.data.spaceCategoryId, parsed.data.targetOrgId);
  if (!spaceCategory) {
    return { error: "Space category does not belong to this space" };
  }

  await upsertMapping({
    userCategoryId: parsed.data.userCategoryId,
    targetOrgId: parsed.data.targetOrgId,
    spaceCategoryId: parsed.data.spaceCategoryId,
    updatedBy: currentUser.id,
  });

  revalidatePath(ROUTES.CATEGORIES);
  return { error: null };
}

const unmapSchema = z.object({
  userCategoryId: z.coerce.number().int().positive(),
  targetOrgId: z.coerce.number().int().positive(),
});

export async function unmapUserCategoryAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireUser();
  const parsed = unmapSchema.safeParse({
    userCategoryId: formData.get("userCategoryId"),
    targetOrgId: formData.get("targetOrgId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to unmap user category" };
  }

  const ownership = await assertOwnsUserCategoryAndSpace(currentUser, parsed.data.userCategoryId, parsed.data.targetOrgId);
  if (!ownership) {
    return { error: "Space category or space is not available to you" };
  }

  await deleteMapping(parsed.data.userCategoryId, parsed.data.targetOrgId);

  revalidatePath(ROUTES.CATEGORIES);
  return { error: null };
}
