import { getManageImportExportOrgData } from "@/app/actions/auth-roles/manage-import-export.actions";
import { getExpensesByOrg } from "@/app/actions/tables/expenses.table.actions";
import { buildExpenseExportWorkbook } from "@/app/lib/manage-import-export.workbook";

export async function GET(request: Request) {
  void request;
  const data = await getManageImportExportOrgData();

  if (!data.organization || !data.currentUser.orgId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const expenses = await getExpensesByOrg(data.currentUser.orgId);
  const workbook = buildExpenseExportWorkbook(
    expenses.map((expense) => ({
      transaction_timestamp: expense.occurredAt.slice(0, 10),
      amount: expense.amount,
      category: expense.categoryName,
      note: expense.note ?? "",
      necessity_score: expense.necessityScore,
      user_name: expense.userName,
      counter_party_name: expense.counterPartyName ?? "",
      mode: expense.transactionModeName ?? "",
      subcategories: expense.subcategoryName ?? "",
    })),
    "organization"
  );

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(workbook, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="manage-import-export-org-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
