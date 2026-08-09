"use client";

import {
  createUserCategoryInline,
  deleteUserCategoryAction,
  setUserCategorySpaceCategoryAction,
} from "@/app/actions/auth-roles/user-categories.actions";
import {
  updateUserCategoryMappingAction,
  unmapUserCategoryAction,
} from "@/app/actions/auth-roles/user-category-mapping.actions";
import { deleteSpaceCategoryAction } from "@/app/actions/auth-roles/organization-finance.actions";
import { financeInitialState } from "@/app/actions/auth-roles/finance.types";
import type { SpaceCategoryRecordDto, UserCategoryRecordDto } from "@/app/lib/finance.types";
import type { UserCategoryMappingRowDto } from "@/app/actions/auth-roles/user-category-mapping.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateSpaceCategoryForm } from "@/components/features/space-categories/create-space-category-form";
import { UserCategoryKanbanBoard, type KanbanItem } from "@/components/features/space-categories/user-category-kanban-board";

function buildMappingFormData(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.append(key, value);
  return formData;
}

export function SpaceCategoryManagement({
  isPersonalSpace,
  canManageSpaceCategories,
  spaceCategories,
  targetOrgId,
  userCategories,
  mappingRows,
}: {
  isPersonalSpace: boolean;
  canManageSpaceCategories: boolean;
  spaceCategories: SpaceCategoryRecordDto[];
  targetOrgId: number | null;
  userCategories: UserCategoryRecordDto[];
  mappingRows: UserCategoryMappingRowDto[];
}) {
  const items: KanbanItem[] = isPersonalSpace
    ? userCategories.map((userCategory) => ({
        id: userCategory.id,
        name: userCategory.name,
        spaceCategoryId: userCategory.spaceCategoryId,
      }))
    : mappingRows.map((row) => ({
        id: row.userCategoryId,
        name: row.userCategoryName,
        spaceCategoryId: row.mappedSpaceCategoryId,
      }));

  async function handleAssign(userCategoryId: number, spaceCategoryId: number | null) {
    if (isPersonalSpace) {
      const result = await setUserCategorySpaceCategoryAction({ userCategoryId, spaceCategoryId });
      return { error: "error" in result ? result.error : null };
    }

    if (!targetOrgId) return { error: "This space is not available" };

    if (spaceCategoryId === null) {
      const result = await unmapUserCategoryAction(
        financeInitialState,
        buildMappingFormData({ userCategoryId: String(userCategoryId), targetOrgId: String(targetOrgId) })
      );
      return { error: result.error };
    }

    const result = await updateUserCategoryMappingAction(
      financeInitialState,
      buildMappingFormData({
        userCategoryId: String(userCategoryId),
        targetOrgId: String(targetOrgId),
        spaceCategoryId: String(spaceCategoryId),
      })
    );
    return { error: result.error };
  }

  async function handleCreate(name: string) {
    const result = await createUserCategoryInline(name);
    return { error: "error" in result ? result.error : null };
  }

  async function handleDeleteSpaceCategory(spaceCategoryId: number) {
    const result = await deleteSpaceCategoryAction(
      financeInitialState,
      buildMappingFormData({ spaceCategoryId: String(spaceCategoryId) })
    );
    return { error: result.error };
  }

  async function handleDeleteUserCategory(userCategoryId: number) {
    const result = await deleteUserCategoryAction(
      financeInitialState,
      buildMappingFormData({ userCategoryId: String(userCategoryId) })
    );
    return { error: result.error };
  }

  return (
    <section className="space-y-6">
      <Card className="py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <CardTitle className="max-w-3xl text-3xl leading-tight tracking-tight">Manage Categories</CardTitle>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {isPersonalSpace
              ? "Create space categories, then create user categories and drag them onto a space category to organize your transactions. New user categories start Unmapped."
              : "This is a shared space — space categories here are top-level only. Drag your own user categories onto a space category to map them into this space; unmapped ones won't show up in this space's reports."}
          </p>
        </CardHeader>
      </Card>

      {canManageSpaceCategories ? (
        <Card className="py-2">
          <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
            <CardTitle className="text-xl tracking-tight">Add a Space Category</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-6 sm:px-8 sm:pb-8">
            <CreateSpaceCategoryForm />
          </CardContent>
        </Card>
      ) : null}

      <Card className="py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <CardTitle className="text-xl tracking-tight">Categories</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-6 sm:px-8 sm:pb-8">
          <UserCategoryKanbanBoard
            spaceCategories={spaceCategories}
            items={items}
            onAssign={handleAssign}
            onCreate={isPersonalSpace ? handleCreate : undefined}
            onDeleteSpaceCategory={canManageSpaceCategories ? handleDeleteSpaceCategory : undefined}
            onDeleteUserCategory={isPersonalSpace ? handleDeleteUserCategory : undefined}
          />
        </CardContent>
      </Card>
    </section>
  );
}
