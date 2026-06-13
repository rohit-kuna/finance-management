import { CategoryManagement } from "@/components/features/admin/category-management";
import { getOrganizationCategoriesForAdmin } from "@/app/actions/auth-roles/organization-finance.actions";

export default async function CategoriesPage() {
  const financeData = await getOrganizationCategoriesForAdmin();

  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <CategoryManagement
        categories={financeData.categories}
        subcategories={financeData.subcategories}
      />
    </main>
  );
}
