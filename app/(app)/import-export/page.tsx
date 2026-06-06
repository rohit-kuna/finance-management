import { redirect } from "next/navigation";
import { ROUTES } from "@/app/lib/constants";
import { getManageImportExportData } from "@/app/actions/auth-roles/manage-import-export.actions";
import { ManageImportExport } from "@/components/features/manage-import-export/manage-import-export";

type ManageImportExportPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ManageImportExportPage({ searchParams }: ManageImportExportPageProps) {
  void searchParams;
  const data = await getManageImportExportData();

  if (!data.organization) {
    redirect(ROUTES.DASHBOARD);
  }

  return <ManageImportExport data={data} />;
}
