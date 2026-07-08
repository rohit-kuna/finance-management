import type { CategoryRecordDto, BudgetRecordDto } from "@/app/lib/finance.types";
import type { ExpenseRecordDto } from "@/app/lib/expense.types";
import type { AppRole } from "@/app/lib/roles";
import type { UserScope } from "@/db/schema";

export type ActivityMemberDto = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "USER";
};

export type ActivityDashboardDataDto = {
  organization: {
    id: number;
    name: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  } | null;
  categories: CategoryRecordDto[];
  members: ActivityMemberDto[];
  budgets: BudgetRecordDto[];
  expenses: ExpenseRecordDto[];
  currentUser: {
    id: string;
    role: AppRole | null;
    orgId: number | null;
    scope: UserScope | null;
  };
};
