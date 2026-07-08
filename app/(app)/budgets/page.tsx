import { redirect } from "next/navigation";
import { getOrganizationFinanceData } from "@/app/actions/auth-roles/organization-finance.actions";
import { ROUTES } from "@/app/lib/constants";
import { ROLES } from "@/app/lib/roles";
import { BudgetManagement } from "@/components/features/budgets/budget-management";

export default async function BudgetsPage() {
  const data = await getOrganizationFinanceData();

  if (!data.currentUser.orgId) {
    redirect(ROUTES.DASHBOARD);
  }

  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <BudgetManagement
        data={data}
        showFamilyBudgetSection={
          Boolean(data.organization && !data.organization.isPersonal) &&
          data.currentUser.role === ROLES.ADMIN
        }
      />
    </main>
  );
}
