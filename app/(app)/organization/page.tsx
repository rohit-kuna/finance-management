import { requireUser } from "@/app/lib/auth";
import { getAdminDashboardData } from "@/app/actions/auth-roles/admin.actions";
import { OrganizationOverview } from "@/components/features/admin/organization-overview";
import { OrganizationSettings } from "@/components/features/admin/organization-settings";
import { PersonalSpaceSettings } from "@/components/features/admin/personal-space-settings";

export default async function OrganizationPage() {
  const currentUser = await requireUser();
  const data = await getAdminDashboardData();

  if (currentUser.scope !== "shared") {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6">
        <PersonalSpaceSettings data={data} />
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6">
      <OrganizationOverview data={data} />
      <OrganizationSettings data={data} />
    </main>
  );
}
