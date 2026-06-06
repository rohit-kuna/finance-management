import { redirect } from "next/navigation";
import { ROUTES } from "@/app/lib/constants";

export default function ExpensesPage() {
  redirect(ROUTES.TRANSACTIONS);
}
