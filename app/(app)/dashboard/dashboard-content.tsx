import { getExpensesDashboardData } from "@/app/actions/auth-roles/expense.actions";
import { ExpenseFormCard, ExpenseTable } from "@/components/features/expenses/expense-management";
import { ExpenseActivityChart } from "@/components/features/activity/activity-dashboard-dynamic";

export async function DashboardContent() {
  const data = await getExpensesDashboardData();
  const ownExpenses = data.expenses.filter((expense) => expense.userId === data.currentUser.id);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const isPersonalSpace = data.organization?.isPersonal ?? true;

  return (
    <>
      {isPersonalSpace ? (
        <ExpenseFormCard
          counterparties={data.counterparties}
          transactionModes={data.transactionModes}
          spaceCategories={data.spaceCategories}
          userCategories={data.userCategories}
          tags={data.tags}
          editingExpense={null}
        />
      ) : (
        <ExpenseTable
          expenses={data.expenses}
          spaceCategories={data.spaceCategories}
          userCategories={data.userCategories}
          counterparties={data.counterparties}
          transactionModes={data.transactionModes}
          tags={data.tags}
          currentUserId={data.currentUser.id}
          isAdmin={data.currentUser.role === "ADMIN"}
          readOnly
          showMemberColumn
        />
      )}

      <ExpenseActivityChart expenses={ownExpenses} monthStart={currentMonth} monthEnd={currentMonth} />
    </>
  );
}

export function DashboardContentSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-background p-4 shadow-sm sm:p-8">
        <div className="h-8 w-full max-w-64 rounded-md bg-muted/60" />
        <div className="mt-3 h-4 w-full max-w-96 rounded-md bg-muted/50" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-24 rounded-xl border bg-muted/20" />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border bg-background p-4 shadow-sm sm:p-8">
        <div className="h-6 w-full max-w-44 rounded-md bg-muted/60" />
        <div className="mt-3 h-4 w-full max-w-56 rounded-md bg-muted/50" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-20 rounded-xl border bg-muted/20" />
          ))}
        </div>
      </div>
    </div>
  );
}
