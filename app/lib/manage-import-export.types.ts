import type { SpaceCategoryRecordDto, CounterpartyRecordDto, UserCategoryRecordDto, TagRecordDto, TransactionModeRecordDto } from "@/app/lib/finance.types";
import type { AppRole } from "@/app/lib/roles";

export const IMPORT_WORKBOOK_FIELDS = [
  "transactionTimestamp",
  "amount",
  "type",
  "category",
  "subcategories",
  "note",
  "tags",
  "mode",
  "necessity_score",
  "user_name",
  "counter_party_name",
] as const;

export type ImportWorkbookField = (typeof IMPORT_WORKBOOK_FIELDS)[number];
export type ImportWorkbookValueMapping = "user" | "category" | "counterparty" | "mode" | null;

// Every transaction lives only in the owner's personal space now — an admin
// has no write access to another member's data — so this is always "user".
export type ManageImportExportScope = "user";

export const IMPORT_WORKBOOK_FIELD_CONFIGS = [
  { key: "transactionTimestamp", label: "Transaction timestamp", required: true, valueMapping: null },
  { key: "amount", label: "Amount", required: true, valueMapping: null },
  { key: "type", label: "Type", required: true, valueMapping: null },
  { key: "category", label: "Space Category", required: false, valueMapping: "category" },
  { key: "subcategories", label: "User Categories", required: true, valueMapping: null },
  { key: "note", label: "Note", required: false, valueMapping: null },
  { key: "tags", label: "Tags", required: false, valueMapping: null },
  { key: "mode", label: "Mode", required: false, valueMapping: "mode" },
  { key: "necessity_score", label: "Necessity score", required: false, valueMapping: null },
  { key: "user_name", label: "User", required: true, valueMapping: "user" },
  { key: "counter_party_name", label: "Counterparty", required: false, valueMapping: "counterparty" },
] as const satisfies ReadonlyArray<{
  key: ImportWorkbookField;
  label: string;
  required: boolean;
  valueMapping: ImportWorkbookValueMapping;
}>;

export const IMPORT_WORKBOOK_FIELDS_BY_SCOPE = {
  user: [
    "transactionTimestamp",
    "amount",
    "type",
    "category",
    "subcategories",
    "note",
    "tags",
    "mode",
    "necessity_score",
    "counter_party_name",
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
    isPersonal: boolean;
    createdAt: string;
    updatedAt: string;
  } | null;
  spaceCategories: SpaceCategoryRecordDto[];
  counterparties: CounterpartyRecordDto[];
  userCategories: UserCategoryRecordDto[];
  tags: TagRecordDto[];
  transactionModes: TransactionModeRecordDto[];
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: AppRole | null;
    orgId: number | null;
  };
};
