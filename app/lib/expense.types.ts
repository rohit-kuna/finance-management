import type {
  CategoryRecordDto,
  CounterpartyRecordDto,
  SubcategoryRecordDto,
  TagRecordDto,
  TransactionModeRecordDto,
} from "@/app/lib/finance.types";
import type { AppRole } from "@/app/lib/roles";

export type ExpenseRecordDto = {
  id: number;
  orgId: number;
  userId: string;
  userName: string;
  userEmail: string;
  categoryId: number;
  categoryName: string;
  counterPartyId: number | null;
  counterPartyName: string | null;
  transactionModeId: number | null;
  transactionModeName: string | null;
  transactionModeOwnerName: string | null;
  amount: string;
  type: "expense" | "income";
  transferStatus: "open" | "settled" | "closed" | null;
  necessityScore: number;
  note: string | null;
  subcategoryId: number | null;
  subcategoryName: string | null;
  tagIds: number[];
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
};

export type TransferDashboardDataDto = {
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
  expenses: ExpenseRecordDto[];
  currentUser: {
    id: string;
    name: string;
    role: AppRole | null;
    orgId: number | null;
  };
};

export type ExpensesDashboardDataDto = {
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
  subcategories: SubcategoryRecordDto[];
  tags: TagRecordDto[];
  expenses: ExpenseRecordDto[];
  currentUser: {
    id: string;
    name: string;
    role: AppRole | null;
    orgId: number | null;
  };
};
