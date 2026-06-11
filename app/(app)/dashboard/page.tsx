import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/app/lib/auth";
import { ROUTES } from "@/app/lib/constants";
import { getOrganizationsForUser } from "@/app/actions/tables/organization-members.table.actions";
import { getExpensesDashboardData } from "@/app/actions/auth-roles/expense.actions";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingDashboard } from "@/components/features/onboarding/onboarding-dashboard";
import { ExpenseFormCard } from "@/components/features/expenses/expense-management";
import { ExpenseActivityChart } from "@/components/features/activity/activity-dashboard";

export default async function DashboardPage() {
  const user = await getCurrentDbUser();

  if (!user) {
    redirect(ROUTES.SIGN_IN);
  }

  if (!user.orgId) {
    const organizations = await getOrganizationsForUser(user.id);

    return (
      <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
        <div className="mb-6 space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Onboarding
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome — let’s get your workspace set up
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Join an existing organization with an invite code, or create a new one and become
            its admin.
          </p>
        </div>
        <OnboardingDashboard organizations={organizations} />
      </main>
    );
  }

  const data = await getExpensesDashboardData();
  const greetingName = data.currentUser.name || "there";
  const organizationName = data.organization?.name ?? "your organization";
  const ownExpenses = data.expenses.filter((expense) => expense.userId === data.currentUser.id);
  const recentExpense = ownExpenses
    .slice()
    .sort((left, right) =>
      right.occurredAt.localeCompare(left.occurredAt) || right.createdAt.localeCompare(left.createdAt)
    )[0];
  const recentCategoryId = recentExpense?.categoryId ?? null;
  const currentMonth = new Date().toISOString().slice(0, 7);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      <Card className="py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <CardTitle className="max-w-3xl text-xl leading-tight tracking-tight sm:text-3xl">
            <span className="block">
              Hi {greetingName}, Welcome
              <span className="hidden sm:inline"> to {organizationName} Dashboard</span>
            </span>
          </CardTitle>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Add a transaction quickly, then track how your income and spending compare this month.
          </p>
        </CardHeader>
      </Card>

      <ExpenseFormCard
        key={`new-${recentCategoryId ?? "none"}`}
        categories={data.categories}
        counterparties={data.counterparties}
        transactionModes={data.transactionModes}
        tags={data.tags}
        categoryTags={data.categoryTags}
        editingExpense={null}
        recentCategoryId={recentCategoryId}
      />

      <ExpenseActivityChart expenses={ownExpenses} monthStart={currentMonth} monthEnd={currentMonth} />
    </main>
  );
}
