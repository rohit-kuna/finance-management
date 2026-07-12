import { getTransactionModesData } from "@/app/actions/auth-roles/transaction-modes.actions";
import { TransactionModeManagement } from "@/components/features/transaction-modes/transaction-mode-management";
import { requireActiveOrgIsPersonal } from "@/app/lib/auth";

export default async function TransactionModesPage() {
  await requireActiveOrgIsPersonal();
  const data = await getTransactionModesData();

  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <TransactionModeManagement transactionModes={data.transactionModes} />
    </main>
  );
}
