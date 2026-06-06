import { redirect } from "next/navigation";
import { getExpensesDashboardData } from "@/app/actions/auth-roles/expense.actions";
import { ROUTES } from "@/app/lib/constants";
import { ExpenseManagement } from "@/components/features/expenses/expense-management";

export default async function TransactionsPage() {
  const data = await getExpensesDashboardData();

  if (!data.currentUser.orgId) {
    redirect(ROUTES.DASHBOARD);
  }

  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <ExpenseManagement data={data} />
    </main>
  );
}
