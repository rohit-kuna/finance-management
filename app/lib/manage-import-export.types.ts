import type { CategoryRecordDto, CounterpartyRecordDto, TransactionModeRecordDto } from "@/app/lib/finance.types";
import type { OrganizationMemberRecord } from "@/app/lib/admin-dashboard.types";

export const IMPORT_WORKBOOK_FIELDS = [
  "amount",
  "type",
  "necessity_score",
  "note",
  "category",
  "transactionTimestamp",
  "user_name",
  "counter_party_name",
  "mode",
] as const;

export type ImportWorkbookField = (typeof IMPORT_WORKBOOK_FIELDS)[number];
export type ImportWorkbookValueMapping = "user" | "category" | "counterparty" | "mode" | null;

export type ManageImportExportScope = "organization" | "user";

export const IMPORT_WORKBOOK_FIELD_CONFIGS = [
  { key: "amount", label: "Amount", required: true, valueMapping: null },
  { key: "type", label: "Type", required: false, valueMapping: null },
  { key: "necessity_score", label: "Necessity score", required: false, valueMapping: null },
  { key: "note", label: "Note", required: false, valueMapping: null },
  { key: "category", label: "Category", required: true, valueMapping: "category" },
  { key: "transactionTimestamp", label: "Transaction timestamp", required: true, valueMapping: null },
  { key: "user_name", label: "User", required: true, valueMapping: "user" },
  { key: "counter_party_name", label: "Counterparty", required: false, valueMapping: "counterparty" },
  { key: "mode", label: "Mode", required: false, valueMapping: "mode" },
] as const satisfies ReadonlyArray<{
  key: ImportWorkbookField;
  label: string;
  required: boolean;
  valueMapping: ImportWorkbookValueMapping;
}>;

export const IMPORT_WORKBOOK_FIELDS_BY_SCOPE = {
  organization: [
    "amount",
    "type",
    "necessity_score",
    "note",
    "category",
    "transactionTimestamp",
    "counter_party_name",
    "mode",
  ],
  user: [
    "amount",
    "type",
    "necessity_score",
    "note",
    "category",
    "transactionTimestamp",
    "counter_party_name",
    "mode",
  ],
} as const satisfies Record<ManageImportExportScope, readonly ImportWorkbookField[]>;

export type ImportWorkbookColumnMapping = Partial<Record<ImportWorkbookField, string>>;

export type ImportWorkbookRow = {
  rowNumber: number;
  values: string[];
  issues: string[];
};

export type ImportWorkbookPreview = {
  scope: ManageImportExportScope;
  fileName: string;
  totalRows: number;
  headers: string[];
  fields: ImportWorkbookField[];
  rows: ImportWorkbookRow[];
  previewRows: ImportWorkbookRow[];
  suggestedColumnMappings: ImportWorkbookColumnMapping;
  warnings: string[];
};

export type ManageImportExportActionState = {
  error: string | null;
  success: string | null;
  preview: ImportWorkbookPreview | null;
};

export const manageImportExportInitialState: ManageImportExportActionState = {
  error: null,
  success: null,
  preview: null,
};

export type ManageImportExportDataDto = {
  scope: ManageImportExportScope;
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
  members: Pick<
    OrganizationMemberRecord,
    "id" | "email" | "name" | "role" | "orgId" | "createdAt" | "updatedAt"
  >[];
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: "ADMIN" | "USER";
    orgId: number | null;
  };
};
