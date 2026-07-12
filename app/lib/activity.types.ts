import type { SpaceCategoryRecordDto, BudgetRecordDto } from "@/app/lib/finance.types";
import type { ExpenseRecordDto } from "@/app/lib/expense.types";
import type { AppRole } from "@/app/lib/roles";

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
    isPersonal: boolean;
    createdAt: string;
    updatedAt: string;
  } | null;
  spaceCategories: SpaceCategoryRecordDto[];
  members: ActivityMemberDto[];
  budgets: BudgetRecordDto[];
  expenses: ExpenseRecordDto[];
  currentUser: {
    id: string;
    role: AppRole | null;
    orgId: number | null;
  };
};
