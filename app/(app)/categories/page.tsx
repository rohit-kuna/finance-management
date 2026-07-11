import { CategoryManagement } from "@/components/features/admin/category-management";
import { getOrganizationFinanceData } from "@/app/actions/auth-roles/organization-finance.actions";
import { getMySubcategoryMappingsForSpace } from "@/app/actions/auth-roles/subcategory-mapping.actions";

export default async function CategoriesPage() {
  const financeData = await getOrganizationFinanceData();
  const isPersonalSpace = financeData.organization?.isPersonal ?? true;

  const mappingData =
    !isPersonalSpace && financeData.organization
      ? await getMySubcategoryMappingsForSpace(financeData.organization.id)
      : null;

  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <CategoryManagement
        categories={financeData.categories}
        subcategories={financeData.subcategories}
        currentUserId={financeData.currentUser.id}
        canManageCategories={financeData.currentUser.role === "ADMIN"}
        isPersonalSpace={isPersonalSpace}
        targetOrgId={financeData.organization?.id ?? null}
        mappingRows={mappingData?.rows ?? []}
      />
    </main>
  );
}
