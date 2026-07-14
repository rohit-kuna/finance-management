"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/app/lib/auth";
import { ROUTES } from "@/app/lib/constants";
import { getSpaceCategoryById } from "@/app/actions/tables/space-categories.table.actions";
import {
  createUserCategoryRecord,
  deleteUserCategoryRecord,
  getUserCategoryByOrgAndName,
  getUserCategoryById,
  getUserCategoryUsageCount,
  updateUserCategoryRecord,
} from "@/app/actions/tables/user-categories.table.actions";
import type { FinanceActionState } from "@/app/actions/auth-roles/finance.types";
import type { UserCategoryRecordDto } from "@/app/lib/finance.types";

const userCategoryNameSchema = z.object({
  name: z.string().trim().min(2, "User category name is required").max(100),
});

const userCategoryIdSchema = z.object({
  userCategoryId: z.coerce.number().int().positive(),
});

// UserCategories are always a personal-space, user-level attribute — never
// space-specific — regardless of which space (personal or shared) is
// currently active for navigation. SpaceCategory is the space-level attribute.
function assertPersonalOrgId(currentUser: Awaited<ReturnType<typeof requireUser>>) {
  if (!currentUser.personalOrgId) {
    throw new Error("Set up your personal space first");
  }

  return currentUser.personalOrgId;
}

function toUserCategoryDto(record: {
  id: number;
  orgId: number;
  spaceCategoryId: number | null;
  name: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}): UserCategoryRecordDto {
  return {
    id: record.id,
    orgId: record.orgId,
    spaceCategoryId: record.spaceCategoryId,
    name: record.name,
    createdBy: record.createdBy,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

/**
 * A new UserCategory starts Unmapped (spaceCategoryId null) unless a
 * spaceCategoryId is passed — used by the transaction form's "create under
 * this SpaceCategory" flow, which maps it immediately since it's created in
 * that explicit context. The Kanban board's "+ New" flow always omits it,
 * leaving the category Unmapped until explicitly dragged.
 */
export async function createUserCategoryInline(
  name: string,
  spaceCategoryId?: number | null
): Promise<{ userCategory: UserCategoryRecordDto } | { error: string }> {
  const currentUser = await requireUser();
  const parsed = userCategoryNameSchema.safeParse({ name });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to create user category" };
  }

  const orgId = assertPersonalOrgId(currentUser);
  const existing = await getUserCategoryByOrgAndName(orgId, parsed.data.name);
  if (existing) {
    return { userCategory: existing };
  }

  let resolvedSpaceCategoryId: number | null = null;
  if (spaceCategoryId != null) {
    const spaceCategory = await getSpaceCategoryById(spaceCategoryId);
    if (!spaceCategory || spaceCategory.orgId !== orgId) {
      return { error: "Space category does not belong to your personal space" };
    }
    resolvedSpaceCategoryId = spaceCategoryId;
  }

  const record = await createUserCategoryRecord({
    orgId,
    name: parsed.data.name,
    createdBy: currentUser.id,
    spaceCategoryId: resolvedSpaceCategoryId,
  });

  if (!record) {
    return { error: "Unable to create user category" };
  }

  revalidatePath(ROUTES.CATEGORIES);
  return { userCategory: toUserCategoryDto(record) };
}

export async function renameUserCategoryAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireUser();
  const parsed = userCategoryNameSchema.safeParse({ name: formData.get("name") });
  const idResult = userCategoryIdSchema.safeParse({ userCategoryId: formData.get("userCategoryId") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to update user category" };
  }
  if (!idResult.success) {
    return { error: "User category is required" };
  }

  const orgId = assertPersonalOrgId(currentUser);
  const userCategory = await getUserCategoryById(idResult.data.userCategoryId);

  if (!userCategory || userCategory.orgId !== orgId || userCategory.createdBy !== currentUser.id) {
    return { error: "User category does not belong to you" };
  }

  if (await getUserCategoryByOrgAndName(orgId, parsed.data.name, userCategory.id)) {
    return { error: "You already have a user category with this name" };
  }

  await updateUserCategoryRecord(userCategory.id, { name: parsed.data.name, updatedAt: new Date() });
  revalidatePath(ROUTES.CATEGORIES);
  return { error: null };
}

/**
 * Drag-and-drop assignment in the personal-space Kanban board — directly
 * sets (or clears, via spaceCategoryId: null) which SpaceCategory this
 * UserCategory maps to. Only meaningful for the user's own personal org.
 */
export async function setUserCategorySpaceCategoryAction(input: {
  userCategoryId: number;
  spaceCategoryId: number | null;
}): Promise<{ error: string } | { success: true }> {
  const currentUser = await requireUser();
  const orgId = assertPersonalOrgId(currentUser);
  const userCategory = await getUserCategoryById(input.userCategoryId);

  if (!userCategory || userCategory.orgId !== orgId || userCategory.createdBy !== currentUser.id) {
    return { error: "User category does not belong to you" };
  }

  if (input.spaceCategoryId !== null) {
    const spaceCategory = await getSpaceCategoryById(input.spaceCategoryId);
    if (!spaceCategory || spaceCategory.orgId !== orgId) {
      return { error: "Space category does not belong to your personal space" };
    }
  }

  await updateUserCategoryRecord(userCategory.id, { spaceCategoryId: input.spaceCategoryId, updatedAt: new Date() });
  revalidatePath(ROUTES.CATEGORIES);
  return { success: true };
}

export async function deleteUserCategoryAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireUser();
  const idResult = userCategoryIdSchema.safeParse({ userCategoryId: formData.get("userCategoryId") });

  if (!idResult.success) {
    return { error: "User category is required" };
  }

  const orgId = assertPersonalOrgId(currentUser);
  const userCategory = await getUserCategoryById(idResult.data.userCategoryId);

  if (!userCategory || userCategory.orgId !== orgId || userCategory.createdBy !== currentUser.id) {
    return { error: "User category does not belong to you" };
  }

  const usageCount = await getUserCategoryUsageCount(userCategory.id);
  if (usageCount > 0) {
    return { error: "User category is in use by existing transactions and cannot be deleted" };
  }

  await deleteUserCategoryRecord(userCategory.id);
  revalidatePath(ROUTES.CATEGORIES);
  return { error: null };
}
