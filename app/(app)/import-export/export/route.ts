import { requireActiveOrgIsPersonal } from "@/app/lib/auth";
import { getManageImportExportData } from "@/app/actions/auth-roles/manage-import-export.actions";
import { getExpensesByOrg } from "@/app/actions/tables/expenses.table.actions";
import { buildExpenseExportWorkbook } from "@/app/lib/manage-import-export.workbook";

export async function GET(request: Request) {
  void request;
  const currentUser = await requireActiveOrgIsPersonal();
  const data = await getManageImportExportData();

  if (!data.organization || !currentUser.personalOrgId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Transactions only ever live in the personal org — export from
  // personalOrgId, never the (possibly shared) active orgId.
  // Exports must cover every transaction, not the UI's default page size —
  // pass an explicit no-op limit rather than relying on getExpensesByOrg's default cap.
  const filteredExpenses = await getExpensesByOrg(
    currentUser.personalOrgId,
    Number.MAX_SAFE_INTEGER,
    currentUser.id
  );
  const tagNameById = new Map(data.tags.map((tag) => [tag.id, tag.name]));
  const workbook = buildExpenseExportWorkbook(
    filteredExpenses.map((expense) => ({
      transaction_timestamp: expense.occurredAt.slice(0, 10),
      amount: expense.amount,
      type: expense.type,
      category: expense.spaceCategoryName ?? "",
      note: expense.note ?? "",
      necessity_score: expense.necessityScore,
      counter_party_name: expense.counterPartyName ?? "",
      mode: expense.transactionModeName ?? "",
      subcategories: expense.userCategoryName ?? "",
      tags: expense.tagIds.map((tagId) => tagNameById.get(tagId)).filter(Boolean).join(", "),
    }))
  );

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(workbook, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="manage-import-export-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
