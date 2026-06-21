import { buildExpenseExportWorkbook } from "@/app/lib/manage-import-export.workbook";

export async function GET() {
  const workbook = buildExpenseExportWorkbook([], "user");

  return new Response(workbook, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="bulk-add-template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
