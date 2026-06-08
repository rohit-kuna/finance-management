import { redirect } from "next/navigation";
import { getActivityDashboardData } from "@/app/actions/auth-roles/activity.actions";
import { ROUTES } from "@/app/lib/constants";
import { ActivityDashboard } from "@/components/features/activity/activity-dashboard";

export default async function AnalyticsPage() {
  const data = await getActivityDashboardData();

  if (!data.currentUser.orgId) {
    redirect(ROUTES.DASHBOARD);
  }

  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <ActivityDashboard data={data} />
    </main>
  );
}
