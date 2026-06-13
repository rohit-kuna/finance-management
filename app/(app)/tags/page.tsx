import { TagManagement } from "@/components/features/admin/tag-management";
import { getOrganizationTagsForAdmin } from "@/app/actions/auth-roles/tags.actions";

export default async function TagsPage() {
  const data = await getOrganizationTagsForAdmin();

  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <TagManagement tags={data.tags} />
    </main>
  );
}
