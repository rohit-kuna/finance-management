import { requireUser } from "@/app/lib/auth";
import { getOrganizationsForUser } from "@/app/actions/tables/organization-members.table.actions";
import { OnboardingDashboard } from "@/components/features/onboarding/onboarding-dashboard";

export default async function SwitchOrganizationPage() {
  const user = await requireUser();
  const organizations = await getOrganizationsForUser(user.id);
  const hasPersonalOrganization = organizations.some((organization) => organization.isPersonal);

  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <div className="mb-6 space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Space
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Switch space</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Open a different space you belong to, join one with an invite code, or create
          a shared space. Each user can keep one personal space.
        </p>
      </div>
      <OnboardingDashboard
        organizations={organizations}
        hasPersonalOrganization={hasPersonalOrganization}
      />
    </main>
  );
}
