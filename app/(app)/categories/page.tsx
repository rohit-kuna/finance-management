import { CategoryManagement } from "@/components/features/admin/category-management";
import { getOrganizationFinanceData } from "@/app/actions/auth-roles/organization-finance.actions";

export default async function CategoriesPage() {
  const financeData = await getOrganizationFinanceData();

  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <CategoryManagement
        categories={financeData.categories}
        subcategories={financeData.subcategories}
        currentUserId={financeData.currentUser.id}
        canManageCategories={financeData.currentUser.role === "ADMIN"}
      />
    </main>
  );
}
