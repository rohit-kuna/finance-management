import { redirect } from "next/navigation";
import { ROUTES } from "@/app/lib/constants";

export default function LegacyManageImportExportPage() {
  redirect(ROUTES.MANAGE_IMPORT_EXPORT);
}
