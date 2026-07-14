import { getExpensesDashboardData } from "@/app/actions/auth-roles/expense.actions";
import { ExpenseManagement, ExpenseTable } from "@/components/features/expenses/expense-management";

export async function TransactionsContent() {
  const data = await getExpensesDashboardData();
  const isPersonalSpace = data.organization?.isPersonal ?? true;

  if (!isPersonalSpace) {
    return (
      <ExpenseTable
        expenses={data.expenses}
        spaceCategories={data.spaceCategories}
        userCategories={data.userCategories}
        counterparties={data.counterparties}
        transactionModes={data.transactionModes}
        tags={data.tags}
        currentUserId={data.currentUser.id}
        isAdmin={data.currentUser.role === "ADMIN"}
        members={data.members}
        readOnly
        showMemberColumn
      />
    );
  }

  return <ExpenseManagement data={data} />;
}

export function TransactionsContentSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-10 w-full max-w-64 rounded-md bg-muted/60" />
        <div className="h-10 w-full max-w-40 rounded-md bg-muted/60" />
      </div>
      <div className="space-y-2 rounded-2xl border bg-background p-4 shadow-sm sm:p-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-12 rounded-lg bg-muted/20" />
        ))}
      </div>
    </div>
  );
}
