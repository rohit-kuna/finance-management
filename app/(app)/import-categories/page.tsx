import { requireUser } from "@/app/lib/auth";
import { getOrganizationsForUser } from "@/app/actions/tables/organization-members.table.actions";
import { getImportableCategoriesForSpace } from "@/app/actions/auth-roles/user-category-mapping.actions";
import { ImportCategoriesForm } from "@/components/features/import-categories/import-categories-form";

type ImportCategoriesPageProps = {
  searchParams?: Promise<{ orgId?: string }>;
};

export default async function ImportCategoriesPage({ searchParams }: ImportCategoriesPageProps) {
  const currentUser = await requireUser();
  const memberships = await getOrganizationsForUser(currentUser.id);
  const sharedSpaces = memberships.filter((membership) => !membership.isPersonal);

  const { orgId: orgIdParam } = (await searchParams) ?? {};
  const selectedOrgId = orgIdParam ? Number(orgIdParam) : null;
  const isValidSelection = selectedOrgId != null && sharedSpaces.some((space) => space.orgId === selectedOrgId);

  const importData = isValidSelection ? await getImportableCategoriesForSpace(selectedOrgId) : null;

  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <div className="mb-6 space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Personal Space</p>
        <h1 className="text-3xl font-semibold tracking-tight">Import categories</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Pull a shared space&apos;s categories into your personal space as new personal categories. Categories you
          already have (by name) are skipped.
        </p>
      </div>
      <ImportCategoriesForm
        sharedSpaces={sharedSpaces.map((space) => ({ orgId: space.orgId, name: space.orgName }))}
        selectedOrgId={isValidSelection ? selectedOrgId : null}
        importData={importData}
      />
    </main>
  );
}
