import { getOrganizationTagsData } from "@/app/actions/auth-roles/tags.actions";
import { TagManagement } from "@/components/features/tags/tag-management";

export default async function TagsPage() {
  const data = await getOrganizationTagsData();

  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <TagManagement tags={data.tags} />
    </main>
  );
}
