import { redirect } from "next/navigation";
import { ROUTES } from "@/app/lib/constants";
import { getManageImportExportOrgData } from "@/app/actions/auth-roles/manage-import-export.actions";
import { ManageImportExport } from "@/components/features/manage-import-export/manage-import-export";

export default async function ManageImportExportOrgPage() {
  const data = await getManageImportExportOrgData();

  if (!data.organization) {
    redirect(ROUTES.DASHBOARD);
  }

  return <ManageImportExport data={data} />;
}
