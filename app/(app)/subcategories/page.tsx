import { SubcategoryManagement } from "@/components/features/subcategories/subcategory-management";
import { getOrganizationCategoriesForUser } from "@/app/actions/auth-roles/organization-finance.actions";

export default async function SubcategoriesPage() {
  const financeData = await getOrganizationCategoriesForUser();

  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <SubcategoryManagement
        categories={financeData.categories}
        subcategories={financeData.subcategories}
        currentUserId={financeData.currentUserId}
      />
    </main>
  );
}
