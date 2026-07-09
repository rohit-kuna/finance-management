import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/app/lib/auth";
import { ROUTES } from "@/app/lib/constants";
import { getOrganizationsForUser } from "@/app/actions/tables/organization-members.table.actions";
import { getOrganizationById } from "@/app/actions/tables/organizations.table.actions";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingDashboard } from "@/components/features/onboarding/onboarding-dashboard";
import { ScopeSelector } from "@/components/features/onboarding/scope-selector";
import { DashboardContent, DashboardContentSkeleton } from "@/app/(app)/dashboard/dashboard-content";

export default async function DashboardPage() {
  const user = await getCurrentDbUser();

  if (!user) {
    redirect(ROUTES.SIGN_IN);
  }

  if (!user.scope) {
    return (
      <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
        <ScopeSelector />
      </main>
    );
  }

  if (!user.orgId) {
    const organizations = await getOrganizationsForUser(user.id);
    const hasPersonalOrganization = organizations.some((organization) => organization.isPersonal);

    return (
      <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
        <div className="mb-6 space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Onboarding
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome — let’s get your space set up
          </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Join an existing space with an invite code, or create a new one and become
          its admin.
        </p>
      </div>
      <OnboardingDashboard
        organizations={organizations}
        hasPersonalOrganization={hasPersonalOrganization}
      />
    </main>
  );
  }

  // Cheap, React-cache-deduped lookups — enough to render the shell without
  // waiting on the heavy 7-query dashboard fetch (streamed below via Suspense).
  const organization = await getOrganizationById(user.orgId);
  const greetingName = user.name || "there";
  const organizationName = organization?.name ?? "your space";

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

      <Suspense fallback={<DashboardContentSkeleton />}>
        <DashboardContent />
      </Suspense>
    </main>
  );
}
