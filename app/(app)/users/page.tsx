import { redirect } from "next/navigation";
import { requireUser } from "@/app/lib/auth";
import { ROUTES } from "@/app/lib/constants";
import { getAdminDashboardData } from "@/app/actions/auth-roles/admin.actions";
import { MemberManagement } from "@/components/features/admin/member-management";

export default async function UsersPage() {
  const currentUser = await requireUser();

  const data = await getAdminDashboardData();

  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <MemberManagement data={data} currentUserId={currentUser.id} />
    </main>
  );
}
