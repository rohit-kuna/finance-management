import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/app/lib/auth";
import { ROUTES } from "@/app/lib/constants";
import { TransactionsContent, TransactionsContentSkeleton } from "@/app/(app)/transactions/transactions-content";

export default async function TransactionsPage() {
  const user = await getCurrentDbUser();

  if (!user) {
    redirect(ROUTES.SIGN_IN);
  }

  if (!user.orgId) {
    redirect(ROUTES.DASHBOARD);
  }

  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <Suspense fallback={<TransactionsContentSkeleton />}>
        <TransactionsContent />
      </Suspense>
    </main>
  );
}
