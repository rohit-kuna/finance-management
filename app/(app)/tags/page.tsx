import { TagManagement } from "@/components/features/admin/tag-management";
import { getOrganizationTagsForAdmin } from "@/app/actions/auth-roles/tags.actions";
import { requireUser } from "@/app/lib/auth";

export default async function TagsPage() {
  const currentUser = await requireUser();
  const data = await getOrganizationTagsForAdmin();

  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <TagManagement tags={data.tags} canManageTags={currentUser.role === "ADMIN"} />
    </main>
  );
}
