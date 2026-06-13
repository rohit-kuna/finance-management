import { utils, read, write } from "xlsx";
import {
  IMPORT_WORKBOOK_FIELD_CONFIGS,
  IMPORT_WORKBOOK_FIELDS_BY_SCOPE,
  type ManageImportExportScope,
  type ImportWorkbookColumnMapping,
  type ImportWorkbookField,
  type ImportWorkbookPreview,
  type ImportWorkbookRow,
} from "@/app/lib/manage-import-export.types";
import { normalizeWorkbookHeaderName } from "@/app/lib/manage-import-export.shared";

export const EXPORT_WORKBOOK_HEADERS = [
  "transaction_timestamp",
  "amount",
  "type",
  "category",
  "note",
  "necessity_score",
  "user_name",
  "counter_party_name",
  "mode",
  "subcategories",
  "tags",
] as const;

export const USER_EXPORT_WORKBOOK_HEADERS = [
  "transaction_timestamp",
  "amount",
  "type",
  "category",
  "note",
  "necessity_score",
  "counter_party_name",
  "mode",
  "subcategories",
  "tags",
] as const;

const FIELD_ALIASES: Record<ImportWorkbookField, string[]> = {
  amount: ["amount", "amt", "total amount", "total"],
  type: ["type", "expense type", "transaction type"],
  necessity_score: ["necessity_score", "necessity score", "necessity", "priority score"],
  note: ["note", "memo", "description", "remarks"],
  category: ["category", "expense category"],
  transactionTimestamp: ["transaction_timestamp", "transactiontimestamp", "transaction timestamp", "date", "transaction date", "occurred_at"],
  user_name: ["user_name", "user name", "user", "member", "member name"],
  counter_party_name: ["counter_party_name", "counter party name", "counterparty", "counterparty name"],
  mode: ["mode", "transaction mode", "transaction_mode", "payment mode"],
  subcategories: ["subcategories", "subcategory"],
  tags: ["tags", "tag", "labels"],
};

function toWorkbookText(value: unknown) {
  if (value === null || value === undefined) return "";

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }

  return String(value).trim();
}

function isBlankRow(row: string[]) {
  return row.every((value) => value.trim().length === 0);
}

function getSuggestedHeader(headers: string[], aliases: string[]) {
  const normalizedAliases = new Set(aliases.map((alias) => normalizeWorkbookHeaderName(alias)));
  const matches = headers.filter((header) => normalizedAliases.has(normalizeWorkbookHeaderName(header)));

  if (matches.length === 1) {
    return matches[0] ?? "";
  }

  return "";
}

function getSuggestedColumnMappings(
  headers: string[],
  fields: readonly ImportWorkbookField[]
): ImportWorkbookColumnMapping {
  return fields.reduce<ImportWorkbookColumnMapping>((accumulator, field) => {
    const suggestion = getSuggestedHeader(headers, FIELD_ALIASES[field]);
    if (suggestion) {
      accumulator[field] = suggestion;
    }

    return accumulator;
  }, {});
}

export function parseWorkbookBuffer(
  buffer: Buffer,
  fileName: string,
  scope: ManageImportExportScope
): ImportWorkbookPreview {
  const workbook = read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("The workbook must contain at least one worksheet");
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error("Unable to read the workbook sheet");
  }

  const matrix = utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  }) as unknown[][];

  if (!matrix.length) {
    throw new Error("The workbook is empty");
  }

  const headers = (matrix[0] ?? []).map((header) => toWorkbookText(header));
  const rows: ImportWorkbookRow[] = [];

  matrix.slice(1).forEach((row, rowOffset) => {
    const values = (row ?? []).map((value) => toWorkbookText(value));
    const normalizedValues = headers.map((_, columnIndex) => values[columnIndex] ?? "");

    if (isBlankRow(normalizedValues)) {
      return;
    }

    rows.push({
      rowNumber: rowOffset + 2,
      values: normalizedValues,
      issues: [],
    });
  });

  const fields = IMPORT_WORKBOOK_FIELDS_BY_SCOPE[scope];
  const suggestedColumnMappings = getSuggestedColumnMappings(headers, fields);
  const fieldSet = new Set<ImportWorkbookField>(fields as readonly ImportWorkbookField[]);
  const warnings = IMPORT_WORKBOOK_FIELD_CONFIGS.filter(
    (field) => {
      const fieldKey = field.key as ImportWorkbookField;
      return fieldSet.has(fieldKey) && field.required && !suggestedColumnMappings[fieldKey];
    }
  ).map((field) => `Could not auto-detect the ${field.label.toLowerCase()} column. Please map it manually.`);

  return {
    scope,
    fileName,
    totalRows: rows.length,
    headers,
    fields: [...fields],
    rows,
    previewRows: rows.slice(0, 10),
    suggestedColumnMappings,
    warnings,
  };
}

export function buildExpenseExportWorkbook(
  rows: Array<{
    amount: string;
    type: string;
    necessity_score: number | string;
    note: string;
    category: string;
    transaction_timestamp: string;
    user_name?: string;
    counter_party_name: string;
    mode: string;
    subcategories: string;
    tags: string;
  }>,
  scope: ManageImportExportScope
) {
  const workbook = utils.book_new();
  const header = scope === "organization" ? EXPORT_WORKBOOK_HEADERS : USER_EXPORT_WORKBOOK_HEADERS;
  const sheet = utils.json_to_sheet(rows, {
    header: [...header],
    skipHeader: false,
  });

  utils.book_append_sheet(workbook, sheet, "Expenses");

  return Buffer.from(write(workbook, { type: "buffer", bookType: "xlsx" }));
}
