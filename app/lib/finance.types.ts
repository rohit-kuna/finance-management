import type { BudgetScope, CategoryType, UserScope } from "@/db/schema";
import type { AppRole } from "@/app/lib/roles";

export type SpaceCategoryRecordDto = {
  id: number;
  orgId: number;
  name: string;
  type: CategoryType;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type BudgetRecordDto = {
  id: number;
  orgId: number;
  userId: string | null;
  spaceCategoryId: number;
  spaceCategoryName: string;
  scope: BudgetScope;
  amount: string;
  month: string;
  monthLabel: string;
  periodFrom: string;
  periodTo: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type BudgetAllocationSummaryDto = {
  spaceCategoryId: number;
  spaceCategoryName: string;
  month: string;
  monthLabel: string;
  periodFrom: string;
  periodTo: string;
  sharedBudget: BudgetRecordDto | null;
  personalBudgets: BudgetRecordDto[];
  personalTotal: string;
  availableCapacityAmount: string | null;
  availableCapacityPercent: number | null;
  overageAmount: string | null;
};

export type CounterpartyRecordDto = {
  id: number;
  orgId: number;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type UserCategoryRecordDto = {
  id: number;
  orgId: number;
  spaceCategoryId: number | null;
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type TagRecordDto = {
  id: number;
  orgId: number;
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type TransactionModeRecordDto = {
  id: number;
  name: string;
  userId: string;
  userName: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FinanceMemberDto = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "USER";
};

export type OrganizationFinanceDataDto = {
  organization: {
    id: number;
    name: string;
    createdBy: string;
    isPersonal: boolean;
    createdAt: string;
    updatedAt: string;
  } | null;
  spaceCategories: SpaceCategoryRecordDto[];
  userCategories: UserCategoryRecordDto[];
  counterparties: CounterpartyRecordDto[];
  transactionModes: TransactionModeRecordDto[];
  members: FinanceMemberDto[];
  budgets: BudgetRecordDto[];
  allocationSummaries: BudgetAllocationSummaryDto[];
  currentUser: {
    id: string;
    role: AppRole | null;
    orgId: number | null;
    scope: UserScope | null;
  };
};
