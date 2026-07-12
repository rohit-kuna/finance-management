import { SpaceCategoryManagement } from "@/components/features/space-categories/space-category-management";
import { getOrganizationFinanceData } from "@/app/actions/auth-roles/organization-finance.actions";
import { getMyUserCategoryMappingsForSpace } from "@/app/actions/auth-roles/user-category-mapping.actions";

export default async function CategoriesPage() {
  const financeData = await getOrganizationFinanceData();
  const isPersonalSpace = financeData.organization?.isPersonal ?? true;

  const mappingData =
    !isPersonalSpace && financeData.organization
      ? await getMyUserCategoryMappingsForSpace(financeData.organization.id)
      : null;

  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <SpaceCategoryManagement
        isPersonalSpace={isPersonalSpace}
        canManageSpaceCategories={financeData.currentUser.role === "ADMIN"}
        spaceCategories={financeData.spaceCategories}
        targetOrgId={financeData.organization?.id ?? null}
        userCategories={financeData.userCategories}
        mappingRows={mappingData?.rows ?? []}
      />
    </main>
  );
}
