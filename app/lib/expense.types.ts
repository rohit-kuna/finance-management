import type { CategoryRecordDto } from "@/app/lib/finance.types";

export type ExpenseRecordDto = {
  id: number;
  orgId: number;
  userId: string;
  userName: string;
  userEmail: string;
  categoryId: number;
  categoryName: string;
  amount: string;
  type: "expense" | "income";
  transactionMode: "online" | "cash";
  scope: "personal" | "family";
  necessityScore: number;
  note: string | null;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ExpensesDashboardDataDto = {
  organization: {
    id: number;
    name: string;
    inviteCode: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  } | null;
  categories: CategoryRecordDto[];
  expenses: ExpenseRecordDto[];
  currentUser: {
    id: string;
    role: "ADMIN" | "USER";
    orgId: number | null;
  };
};
