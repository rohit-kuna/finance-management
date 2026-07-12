import type {
  SpaceCategoryRecordDto,
  CounterpartyRecordDto,
  UserCategoryRecordDto,
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
  spaceCategoryId: number | null;
  spaceCategoryName: string | null;
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
  userCategoryId: number;
  userCategoryName: string | null;
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
    isPersonal: boolean;
    createdAt: string;
    updatedAt: string;
  } | null;
  spaceCategories: SpaceCategoryRecordDto[];
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
    isPersonal: boolean;
    createdAt: string;
    updatedAt: string;
  } | null;
  spaceCategories: SpaceCategoryRecordDto[];
  counterparties: CounterpartyRecordDto[];
  transactionModes: TransactionModeRecordDto[];
  userCategories: UserCategoryRecordDto[];
  tags: TagRecordDto[];
  expenses: ExpenseRecordDto[];
  currentUser: {
    id: string;
    name: string;
    role: AppRole | null;
    orgId: number | null;
  };
};
