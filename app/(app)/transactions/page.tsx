import { Suspense } from "react";
import { requireUser } from "@/app/lib/auth";
import { TransactionsContent, TransactionsContentSkeleton } from "@/app/(app)/transactions/transactions-content";

export default async function TransactionsPage() {
  await requireUser();

  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <Suspense fallback={<TransactionsContentSkeleton />}>
        <TransactionsContent />
      </Suspense>
    </main>
  );
}
