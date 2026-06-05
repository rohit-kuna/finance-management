import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/app/lib/auth";
import { ROUTES } from "@/app/lib/constants";
import { ROLES } from "@/app/lib/roles";
import { getOrganizationById } from "@/app/actions/tables/organizations.table.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingDashboard } from "@/components/features/onboarding/onboarding-dashboard";

type DashboardMenuItem = {
  label: string;
  href: string;
  description: string;
};

function getDisplayName(name?: string | null, email?: string | null) {
  return name?.trim() || email?.trim() || "User";
}

const adminMenuItems: DashboardMenuItem[] = [
  {
    label: "Organization",
    href: ROUTES.ORGANIZATION,
    description: "Manage organization details and invite access.",
  },
  {
    label: "Activity",
    href: ROUTES.ACTIVITY,
    description: "Review charts for income, expenses, and budget health.",
  },
  {
    label: "Users",
    href: ROUTES.USERS,
    description: "Review members and adjust roles.",
  },
  {
    label: "Categories",
    href: ROUTES.CATEGORIES,
    description: "Create and maintain budget categories.",
  },
  {
    label: "Budgets",
    href: ROUTES.BUDGETS,
    description: "Monitor allocation and manage personal or family budgets.",
  },
  {
    label: "Expenses",
    href: ROUTES.EXPENSES,
    description: "Track and manage organization expenses.",
  },
  {
    label: "Import / Export",
    href: ROUTES.MANAGE_IMPORT_EXPORT,
    description: "Upload Excel expense sheets and export the current organization workbook.",
  },
];

const userMenuItems: DashboardMenuItem[] = [
  {
    label: "Activity",
    href: ROUTES.ACTIVITY,
    description: "Review your organization’s spending and budget trends.",
  },
  {
    label: "Budgets",
    href: ROUTES.BUDGETS,
    description: "Manage personal budgets and view allocation summaries.",
  },
  {
    label: "Expenses",
    href: ROUTES.EXPENSES,
    description: "Track and manage your expenses.",
  },
];

export default async function DashboardPage() {
  const user = await getCurrentDbUser();

  if (!user) {
    redirect(ROUTES.SIGN_IN);
  }

  if (!user.orgId) {
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
        <OnboardingDashboard />
      </main>
    );
  }

  const organization = await getOrganizationById(user.orgId);
  const menuItems = user.role === ROLES.ADMIN ? adminMenuItems : userMenuItems;
  const displayName = getDisplayName(user.name, user.email);

  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card className="py-2">
          <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
            <CardTitle className="text-3xl tracking-tight">Welcome back, {displayName}</CardTitle>
            <CardDescription>
              Your workspace is ready. Use the dashboard menu to jump into the right area.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-6 sm:px-8 sm:pb-8">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Organization
                </p>
                <p className="mt-2 text-lg font-semibold">{organization?.name ?? "Workspace"}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Membership
                </p>
                <p className="mt-2 text-lg font-semibold">Active</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Role</p>
                <p className="mt-2 text-lg font-semibold">{user.role}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="py-2">
          <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
            <CardTitle className="text-xl tracking-tight">Dashboard menu</CardTitle>
            <CardDescription>Pick the section you want to manage next.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 px-4 pb-6 sm:px-8 sm:pb-8">
            {menuItems.map((item) => (
              <div key={item.label} className="rounded-lg border bg-muted/20 p-4">
                <p className="font-semibold">{item.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                <Button asChild variant="outline" className="mt-4 w-full justify-start sm:w-auto">
                  <Link href={item.href}>Open {item.label.toLowerCase()}</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
