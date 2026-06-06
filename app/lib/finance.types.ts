import type { BudgetScope, CategoryType } from "@/db/schema";

export type CategoryRecordDto = {
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
  categoryId: number;
  categoryName: string;
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
  categoryId: number;
  categoryName: string;
  month: string;
  monthLabel: string;
  periodFrom: string;
  periodTo: string;
  familyBudget: BudgetRecordDto | null;
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
    createdAt: string;
    updatedAt: string;
  } | null;
  categories: CategoryRecordDto[];
  counterparties: CounterpartyRecordDto[];
  transactionModes: TransactionModeRecordDto[];
  members: FinanceMemberDto[];
  budgets: BudgetRecordDto[];
  allocationSummaries: BudgetAllocationSummaryDto[];
  currentUser: {
    id: string;
    role: "ADMIN" | "USER";
    orgId: number | null;
  };
};
