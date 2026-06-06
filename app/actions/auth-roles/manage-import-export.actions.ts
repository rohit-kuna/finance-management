"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { categories, counterParty, expenses, transactionModes } from "@/db/schema";
import { requireUser } from "@/app/lib/auth";
import { ROUTES } from "@/app/lib/constants";
import { getCategoriesByOrg } from "@/app/actions/tables/categories.table.actions";
import { getCounterpartiesByOrg } from "@/app/actions/tables/counterparties.table.actions";
import { formatExpenseRecordSummary, getExpensesByOrg } from "@/app/actions/tables/expenses.table.actions";
import {
  ensureDefaultTransactionModesForUser,
  getTransactionModesByUser,
} from "@/app/actions/tables/transaction-modes.table.actions";
import { getOrganizationById, getOrganizationMembers } from "@/app/actions/tables/organizations.table.actions";
import type {
  ImportWorkbookField,
  ImportWorkbookPreview,
  ImportWorkbookRow,
  ManageImportExportActionState,
  ManageImportExportDataDto,
  ManageImportExportScope,
} from "@/app/lib/manage-import-export.types";
import { IMPORT_WORKBOOK_FIELD_CONFIGS } from "@/app/lib/manage-import-export.types";
import { parseWorkbookBuffer } from "@/app/lib/manage-import-export.workbook";
import {
  buildWorkbookHeaderIndex,
  normalizeWorkbookName,
  resolveWorkbookRowValue,
} from "@/app/lib/manage-import-export.shared";

type ImportPayload = ImportWorkbookPreview;

const importPayloadSchema = z.object({
  scope: z.enum(["organization", "user"]),
  fileName: z.string().min(1),
  totalRows: z.number().int().nonnegative(),
  headers: z.array(z.string()),
  fields: z.array(z.string()),
  rows: z.array(
    z.object({
      rowNumber: z.number().int().positive(),
      values: z.array(z.string()),
      issues: z.array(z.string()),
    })
  ),
  previewRows: z.array(
    z.object({
      rowNumber: z.number().int().positive(),
      values: z.array(z.string()),
      issues: z.array(z.string()),
    })
  ),
  suggestedColumnMappings: z.record(z.string(), z.string()),
  warnings: z.array(z.string()),
});

function toManageImportExportOrganizationDto(organization: Awaited<ReturnType<typeof getOrganizationById>>) {
  if (!organization) return null;

  return {
    id: organization.id,
    name: organization.name,
    inviteCode: organization.inviteCode,
    createdBy: organization.createdBy,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
  };
}

function toManageImportExportCurrentUserDto(currentUser: Awaited<ReturnType<typeof requireUser>>) {
  return {
    id: currentUser.id,
    name: currentUser.name,
    email: currentUser.email,
    role: currentUser.role,
    orgId: currentUser.orgId,
  };
}

function resolveManageImportExportScope(
  _requestedScope: string | null,
  _role: string | null | undefined
): ManageImportExportScope {
  return "user";
}

function normalizeTrimmed(value: string) {
  return value.trim();
}

function toDuplicateKey(input: {
  amount: string;
  userId: string;
  categoryId: string | number;
  note: string | null;
  transactionTimestamp: Date;
}) {
  return [
    input.amount,
    input.userId,
    input.categoryId,
    input.note ?? "",
    input.transactionTimestamp.toISOString(),
  ].join("|");
}

function parseAmount(value: string) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid amount: ${value}`);
  }

  return parsed.toFixed(2);
}

function parseNecessityScore(value: string) {
  if (!value.trim()) {
    return 1;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
    throw new Error(`Invalid necessity_score: ${value}`);
  }

  return parsed;
}

function parseExpenseScope(value: string) {
  if (!value.trim()) {
    return "personal";
  }

  const trimmed = value.trim();
  if (trimmed !== "personal" && trimmed !== "family") {
    throw new Error(`Invalid scope: ${value}`);
  }

  return trimmed;
}

function parseCategoryType(value: string) {
  const trimmed = value.trim();
  if (trimmed !== "expense" && trimmed !== "income") {
    throw new Error(`Invalid category type: ${value}`);
  }

  return trimmed;
}

function parseTransactionTimestamp(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("transactionTimestamp is required");
  }

  const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (ymdMatch) {
    return new Date(`${trimmed}T00:00:00Z`);
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid transactionTimestamp: ${value}`);
  }

  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

function parseNote(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function parseModeName(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function formatImportRowSummary(input: {
  amount: string;
  category: string;
  userName: string;
  transactionTimestamp: Date;
  note: string | null;
  counterpartyName: string | null;
  modeName: string | null;
  scope: string;
  type: string | null;
}) {
  const parts = [
    `amount ${input.amount}`,
    `category ${input.category}`,
    `user ${input.userName}`,
    `date ${input.transactionTimestamp.toISOString().slice(0, 10)}`,
  ];

  if (input.note?.trim()) {
    parts.push(`note ${input.note.trim()}`);
  } else {
    parts.push("note (empty)");
  }

  if (input.counterpartyName?.trim()) {
    parts.push(`counterparty ${input.counterpartyName.trim()}`);
  }

  if (input.modeName?.trim()) {
    parts.push(`mode ${input.modeName.trim()}`);
  }

  parts.push(`scope ${input.scope}`);

  if (input.type?.trim()) {
    parts.push(`type ${input.type.trim()}`);
  }

  return parts.join(", ");
}

function toImportPayload(payloadJson: string) {
  const parsed = JSON.parse(payloadJson) as unknown;
  const result = importPayloadSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("The uploaded workbook preview is no longer valid. Please upload the file again.");
  }

  return result.data as ImportPayload;
}

function buildAnnotatedPreview(
  preview: ImportWorkbookPreview,
  rows: ImportWorkbookRow[],
  additionalWarnings: string[] = []
) {
  const rowWarnings = rows
    .filter((row) => row.issues.length > 0)
    .slice(0, 8)
    .map((row) => `Row ${row.rowNumber}: ${row.issues.join(", ")}`);

  const warnings = Array.from(new Set([...preview.warnings, ...rowWarnings, ...additionalWarnings]));

  return {
    ...preview,
    totalRows: rows.length,
    rows,
    previewRows: rows.slice(0, 10),
    warnings,
  };
}

function resolveMappedColumn(payload: ImportPayload, field: ImportWorkbookField, formData: FormData) {
  const value = formData.get(`column_map_${field}`);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }

    const fieldConfig = IMPORT_WORKBOOK_FIELD_CONFIGS.find((config) => config.key === field);
    if (!fieldConfig?.required) {
      return "";
    }
  }

  const suggested = payload.suggestedColumnMappings[field];
  return typeof suggested === "string" ? suggested.trim() : "";
}

function resolveWorkbookValue(
  row: ImportWorkbookRow,
  headerIndex: Map<string, number>,
  field: ImportWorkbookField,
  payload: ImportPayload,
  formData: FormData
) {
  const columnName = resolveMappedColumn(payload, field, formData);
  if (!columnName) return "";

  return resolveWorkbookRowValue(row.values, headerIndex, columnName);
}

function getDistinctWorkbookValues(
  payload: ImportPayload,
  headerIndex: Map<string, number>,
  field: ImportWorkbookField,
  formData: FormData
) {
  const columnName = resolveMappedColumn(payload, field, formData);
  if (!columnName) return [];

  const seen = new Map<string, string>();
  for (const row of payload.rows) {
    const trimmed = resolveWorkbookRowValue(row.values, headerIndex, columnName).trim();
    if (!trimmed) continue;

    const normalized = normalizeWorkbookName(trimmed);
    if (!seen.has(normalized)) {
      seen.set(normalized, trimmed);
    }
  }

  return Array.from(seen.values()).sort((left, right) => left.localeCompare(right));
}

function resolveUserId(userIdValue: string, members: Awaited<ReturnType<typeof getOrganizationMembers>>) {
  const trimmed = normalizeTrimmed(userIdValue);
  if (!trimmed) {
    throw new Error("Select a DB user for every sheet user_name value");
  }

  const member = members.find((item) => item.id === trimmed);
  if (!member) {
    throw new Error("One of the selected users no longer exists in your organization");
  }

  return member.id;
}

function isCreateCounterpartyValue(value: string) {
  return value === "__create__";
}

function isCreateCategoryValue(value: string) {
  return value === "__create__";
}

function isCreateModeValue(value: string) {
  return value === "__create__" || value.startsWith("create:");
}

function isDuplicateExpenseConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (error as any).code === "23505" &&
    "constraint" in error &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (error as any).constraint === "expenses_exact_duplicate_unique"
  );
}

export async function getManageImportExportData(
  requestedScope: ManageImportExportScope = "organization"
): Promise<ManageImportExportDataDto> {
  const currentUser = await requireUser();
  const scope = resolveManageImportExportScope(requestedScope, currentUser.role);

  if (!currentUser.orgId) {
    return {
      scope,
      organization: null,
      categories: [],
      counterparties: [],
      transactionModes: [],
      members: [],
      currentUser: toManageImportExportCurrentUserDto(currentUser),
    };
  }

  const orgId = currentUser.orgId;

  const [organization, categoriesResult, counterparties] = await Promise.all([
    getOrganizationById(orgId),
    getCategoriesByOrg(orgId),
    getCounterpartiesByOrg(orgId),
  ]);

  const members: never[] = [];
  const transactionModes = await getTransactionModesByUser(currentUser.id);

  return {
    scope,
    organization: toManageImportExportOrganizationDto(organization),
    categories: categoriesResult,
    counterparties,
    transactionModes,
    members,
    currentUser: toManageImportExportCurrentUserDto(currentUser),
  };
}

export async function parseImportWorkbookAction(
  _previousState: ManageImportExportActionState,
  formData: FormData
): Promise<ManageImportExportActionState> {
  const currentUser = await requireUser();
  const scopeValue = formData.get("scope");
  const requestedScope = typeof scopeValue === "string" ? scopeValue : null;
  const scope = resolveManageImportExportScope(requestedScope, currentUser.role);

  const file = formData.get("workbook");
  if (!(file instanceof File) || file.size === 0) {
    return {
      error: "Upload an Excel workbook first",
      success: null,
      preview: null,
    };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const preview = parseWorkbookBuffer(buffer, file.name, scope);

    return {
      error: null,
      success: null,
      preview,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to read the workbook",
      success: null,
      preview: null,
    };
  }
}

export async function importExpensesFromWorkbookAction(
  _previousState: ManageImportExportActionState,
  formData: FormData
): Promise<ManageImportExportActionState> {
  const currentUser = await requireUser();

  if (!currentUser.orgId) {
    return {
      error: "Create an organization first",
      success: null,
      preview: null,
    };
  }

  const orgId = currentUser.orgId;

  const payloadJson = formData.get("payload");
  if (typeof payloadJson !== "string" || !payloadJson.trim()) {
    return {
      error: "Upload a workbook and review the preview first",
      success: null,
      preview: null,
    };
  }

  let payload: ImportPayload;
  try {
    payload = toImportPayload(payloadJson);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Invalid workbook preview payload",
      success: null,
      preview: null,
    };
  }

  return importUserScopedExpensesFromWorkbookAction(currentUser, payload, formData);

  /*
  const [orgCategories, orgCounterparties, members, existingExpenses, orgTransactionModesByMember] = await Promise.all([
    getCategoriesByOrg(orgId),
    getCounterpartiesByOrg(orgId),
    getOrganizationMembers(orgId),
    getExpensesByOrg(orgId),
    getOrganizationMembers(orgId).then((orgMembers) =>
      Promise.all(orgMembers.map(async (member) => getTransactionModesByUser(member.id)))
    ),
  ]);

  const orgTransactionModes = orgTransactionModesByMember.flat();
  const headerIndex = buildWorkbookHeaderIndex(payload.headers);

  const categoryMap = new Map<string, { id: number; name: string; type: string }>(
    orgCategories.map((category) => [
      normalizeWorkbookName(category.name),
      { id: category.id, name: category.name, type: category.type },
    ])
  );
  const counterpartyMap = new Map<string, { id: number; name: string }>(
    orgCounterparties.map((counterparty) => [
      normalizeWorkbookName(counterparty.name),
      { id: counterparty.id, name: counterparty.name },
    ])
  );
  const transactionModeById = new Map<number, { id: number; name: string; userId: string }>(
    orgTransactionModes.map((mode) => [
      mode.id,
      {
        id: mode.id,
        name: mode.name,
        userId: mode.userId,
      },
    ])
  );
  const transactionModeByUserAndName = new Map<string, { id: number; name: string; userId: string }>();
  const onlineTransactionModeByUserId = new Map<string, { id: number; name: string; userId: string }>();
  const userHasAnyTransactionModes = new Map<string, boolean>();
  for (const mode of orgTransactionModes) {
    userHasAnyTransactionModes.set(mode.userId, true);
    transactionModeByUserAndName.set(`${mode.userId}|${normalizeWorkbookName(mode.name)}`, {
      id: mode.id,
      name: mode.name,
      userId: mode.userId,
    });

    if (normalizeWorkbookName(mode.name) === "online") {
      onlineTransactionModeByUserId.set(mode.userId, {
        id: mode.id,
        name: mode.name,
        userId: mode.userId,
      });
    }
  }

  const existingExpenseKeys = new Set(
    existingExpenses.map((expense) =>
      toDuplicateKey({
        amount: expense.amount,
        userId: expense.userId,
        categoryId: expense.categoryId,
        note: expense.note,
        transactionTimestamp: new Date(expense.occurredAt),
      })
    )
  );
  const existingExpenseByKey = new Map(
    existingExpenses.map((expense) => [
      toDuplicateKey({
        amount: expense.amount,
        userId: expense.userId,
        categoryId: expense.categoryId,
        note: expense.note,
        transactionTimestamp: new Date(expense.occurredAt),
      }),
      expense,
    ] as const)
  );

  const distinctUserNames = getDistinctWorkbookValues(payload, headerIndex, "user_name", formData);
  const distinctCategoryNames = getDistinctWorkbookValues(payload, headerIndex, "category", formData);
  const distinctCounterpartyNames = getDistinctWorkbookValues(
    payload,
    headerIndex,
    "counter_party_name",
    formData
  );
  const distinctModeNames = getDistinctWorkbookValues(payload, headerIndex, "mode", formData);

  const userSelections = new Map<string, { userId: string | null; error: string | null }>();
  distinctUserNames.forEach((sheetUserName, index) => {
    const selected = formData.get(`user_map_${index}`);
    if (typeof selected !== "string" || !selected.trim()) {
      userSelections.set(normalizeWorkbookName(sheetUserName), {
        userId: null,
        error: `Map the sheet user name "${sheetUserName}" to a DB user`,
      });
      return;
    }

    try {
      userSelections.set(normalizeWorkbookName(sheetUserName), {
        userId: resolveUserId(selected, members),
        error: null,
      });
    } catch (error) {
      userSelections.set(normalizeWorkbookName(sheetUserName), {
        userId: null,
        error: error instanceof Error ? error.message : `Invalid user mapping for "${sheetUserName}"`,
      });
    }
  });

  const categorySelections = new Map<
    string,
    | { mode: "existing"; categoryId: number; categoryName: string; categoryType: "expense" | "income" }
    | { mode: "create"; categoryType: "expense" | "income"; categoryName: string }
    | null
  >();
  const categorySelectionErrors = new Map<string, string>();
  distinctCategoryNames.forEach((sheetCategoryName, index) => {
    const selected = formData.get(`category_map_${index}`);
    const normalizedSheetCategoryName = normalizeWorkbookName(sheetCategoryName);

    if (typeof selected !== "string" || !selected.trim()) {
      categorySelectionErrors.set(
        normalizedSheetCategoryName,
        `Map the sheet category "${sheetCategoryName}" to a DB category`
      );
      categorySelections.set(normalizedSheetCategoryName, null);
      return;
    }

    if (isCreateCategoryValue(selected.trim())) {
      const selectedType = formData.get(`category_type_map_${index}`);
      if (typeof selectedType !== "string" || !selectedType.trim()) {
        categorySelectionErrors.set(
          normalizedSheetCategoryName,
          `Choose a type for the new category "${sheetCategoryName}"`
        );
        categorySelections.set(normalizedSheetCategoryName, null);
        return;
      }

      try {
        categorySelections.set(normalizedSheetCategoryName, {
          mode: "create",
          categoryType: parseCategoryType(selectedType),
          categoryName: sheetCategoryName,
        });
      } catch (error) {
        categorySelectionErrors.set(
          normalizedSheetCategoryName,
          error instanceof Error ? error.message : `Invalid category type for "${sheetCategoryName}"`
        );
        categorySelections.set(normalizedSheetCategoryName, null);
      }
      return;
    }

    const parsedCategoryId = Number.parseInt(selected.trim(), 10);
    if (!Number.isInteger(parsedCategoryId)) {
      categorySelectionErrors.set(
        normalizedSheetCategoryName,
        `Invalid category mapping for "${sheetCategoryName}"`
      );
      categorySelections.set(normalizedSheetCategoryName, null);
      return;
    }

    const existingCategory = orgCategories.find((category) => category.id === parsedCategoryId);
    if (!existingCategory) {
      categorySelectionErrors.set(
        normalizedSheetCategoryName,
        `Category "${sheetCategoryName}" no longer exists in your organization`
      );
      categorySelections.set(normalizedSheetCategoryName, null);
      return;
    }

    categorySelections.set(normalizedSheetCategoryName, {
      mode: "existing",
      categoryId: existingCategory.id,
      categoryName: existingCategory.name,
      categoryType: existingCategory.type as "expense" | "income",
    });
  });

  const counterpartySelections = new Map<string, { value: string | null; error: string | null }>();
  distinctCounterpartyNames.forEach((sheetCounterpartyName, index) => {
    const selected = formData.get(`counterparty_map_${index}`);
    const normalizedSheetCounterpartyName = normalizeWorkbookName(sheetCounterpartyName);

    if (typeof selected !== "string" || !selected.trim()) {
      counterpartySelections.set(normalizedSheetCounterpartyName, {
        value: null,
        error: `Map the sheet counterparty "${sheetCounterpartyName}" to a DB counterparty`,
      });
      return;
    }

    counterpartySelections.set(normalizedSheetCounterpartyName, {
      value: selected.trim(),
      error: null,
    });
  });

  const modeSelections = new Map<string, { value: string | null; error: string | null }>();
  distinctModeNames.forEach((sheetModeName, index) => {
    const selected = formData.get(`mode_map_${index}`);
    const normalizedSheetModeName = normalizeWorkbookName(sheetModeName);

    if (typeof selected !== "string" || !selected.trim()) {
      modeSelections.set(normalizedSheetModeName, {
        value: null,
        error: `Map the sheet mode "${sheetModeName}" to a DB transaction mode`,
      });
      return;
    }

    modeSelections.set(normalizedSheetModeName, {
      value: selected.trim(),
      error: null,
    });
  });

  const createdCategories = new Map<string, number>();
  const createdCounterparties = new Map<string, number>();
  const createdTransactionModes = new Map<string, number>();
  const importedExpenseSummaries = new Map<string, string>();
  const duplicateWarnings: string[] = [];
  const skippedDuplicateRows = new Set<number>();

  const validatedRows: ImportWorkbookRow[] = [];
  const seenDuplicateKeys = new Map<string, string>();

  for (const row of payload.rows) {
    const issues = [...row.issues];

    const amountValue = resolveWorkbookValue(row, headerIndex, "amount", payload, formData);
    const scopeValue = resolveWorkbookValue(row, headerIndex, "scope", payload, formData);
    const necessityScoreValue = resolveWorkbookValue(row, headerIndex, "necessity_score", payload, formData);
    const noteValue = resolveWorkbookValue(row, headerIndex, "note", payload, formData);
    const categoryValue = resolveWorkbookValue(row, headerIndex, "category", payload, formData);
    const timestampValue = resolveWorkbookValue(row, headerIndex, "transactionTimestamp", payload, formData);
    const userValue = resolveWorkbookValue(row, headerIndex, "user_name", payload, formData);
    const counterpartyValue = resolveWorkbookValue(
      row,
      headerIndex,
      "counter_party_name",
      payload,
      formData
    );
    const modeValue = resolveWorkbookValue(row, headerIndex, "mode", payload, formData);

    if (!amountValue.trim()) {
      issues.push("Missing amount");
    }
    if (!categoryValue.trim()) {
      issues.push("Missing category");
    }
    if (!timestampValue.trim()) {
      issues.push("Missing transactionTimestamp");
    }
    if (!userValue.trim()) {
      issues.push("Missing user_name");
    }

    const normalizedUserName = normalizeWorkbookName(userValue);
    const userSelection = userSelections.get(normalizedUserName);
    if (!userSelection) {
      issues.push(`Map the sheet user name "${userValue || "—"}" to a DB user`);
    } else {
      const selectionError = userSelection!.error;
      if (selectionError !== null) {
        issues.push(selectionError as string);
      }
    }

    const normalizedCategoryName = normalizeWorkbookName(categoryValue);
    const categorySelection = categorySelections.get(normalizedCategoryName);
    if (!categorySelection) {
      issues.push(`Map the sheet category "${categoryValue || "—"}" to a DB category`);
    } else if (categorySelection === null) {
      const selectionError = categorySelectionErrors.get(normalizedCategoryName);
      if (selectionError) {
        issues.push(selectionError as string);
      }
    } else {
      const selectionError = categorySelectionErrors.get(normalizedCategoryName);
      if (selectionError) {
        issues.push(selectionError as string);
      }
    }

    const counterpartySelectionValue = counterpartyValue.trim();
    if (counterpartySelectionValue) {
      const normalizedCounterpartyName = normalizeWorkbookName(counterpartySelectionValue);
      const counterpartySelection = counterpartySelections.get(normalizedCounterpartyName);
      if (!counterpartySelection) {
        issues.push(`Map the sheet counterparty "${counterpartySelectionValue}" to a DB counterparty`);
      } else {
        const selectionError = counterpartySelection!.error;
        if (selectionError !== null) {
          issues.push(selectionError as string);
        }
      }
    }

    const modeSelectionValue = modeValue.trim();
    if (modeSelectionValue) {
      const normalizedModeName = normalizeWorkbookName(modeSelectionValue);
      const modeSelection = modeSelections.get(normalizedModeName);
      if (!modeSelection) {
        issues.push(`Map the sheet mode "${modeSelectionValue}" to a DB transaction mode`);
      } else {
        const selectionError = modeSelection!.error;
        if (selectionError !== null) {
          issues.push(selectionError as string);
        }
      }
    }

    let amount = "";
    try {
      amount = parseAmount(amountValue);
    } catch (error) {
      void error;
      issues.push(`Invalid amount: ${amountValue}`);
    }

    try {
      parseNecessityScore(necessityScoreValue);
    } catch (error) {
      void error;
      issues.push(`Invalid necessity_score: ${necessityScoreValue}`);
    }

    let scope = "";
    try {
      scope = parseExpenseScope(scopeValue);
    } catch (error) {
      void error;
      issues.push(`Invalid scope: ${scopeValue}`);
    }

    const note = parseNote(noteValue);
    const modeName = parseModeName(modeValue);

    let transactionTimestamp = new Date(0);
    try {
      transactionTimestamp = parseTransactionTimestamp(timestampValue);
    } catch (error) {
      void error;
      issues.push(`Invalid transactionTimestamp: ${timestampValue}`);
    }

    let categoryDuplicateKey = normalizedCategoryName;
    if (categorySelection && categorySelection !== null) {
      if (categorySelection.mode === "existing") {
        categoryDuplicateKey = String(categorySelection.categoryId);
      } else {
        categoryDuplicateKey = `create:${normalizeWorkbookName(categorySelection.categoryName)}`;
      }
    }

    const userId = userSelection?.userId ?? null;
    const duplicateKey =
      issues.length === 0 && userId && categorySelection && categorySelection !== null
        ? toDuplicateKey({
            amount,
            userId,
            categoryId: categoryDuplicateKey,
            note,
            transactionTimestamp,
          })
        : null;

    if (issues.length === 0 && userId && categorySelection && categorySelection !== null && duplicateKey) {
      const existingExpense =
        categorySelection.mode === "existing"
          ? existingExpenseByKey.get(
              toDuplicateKey({
                amount,
                userId,
                categoryId: categorySelection.categoryId,
                note,
                transactionTimestamp,
            })
          )
          : null;

      if (existingExpense) {
        skippedDuplicateRows.add(row.rowNumber);
        duplicateWarnings.push(
          `Row ${row.rowNumber} skipped because it duplicates an existing expense (${await formatExpenseRecordSummary(existingExpense)})`
        );
        validatedRows.push({
          ...row,
          issues,
        });
        continue;
      } else if (seenDuplicateKeys.has(duplicateKey)) {
        const previousSummary = seenDuplicateKeys.get(duplicateKey);
        skippedDuplicateRows.add(row.rowNumber);
        duplicateWarnings.push(
          `Row ${row.rowNumber} skipped because it duplicates another uploaded row (${previousSummary ?? "same amount, user, category, note, and date"})`
        );
        validatedRows.push({
          ...row,
          issues,
        });
        continue;
      } else {
        seenDuplicateKeys.set(
          duplicateKey,
          formatImportRowSummary({
            amount,
            category: categoryValue.trim(),
            userName: userValue.trim(),
            transactionTimestamp,
            note,
            counterpartyName: counterpartySelectionValue || null,
            modeName,
            scope,
            type: null,
          })
        );
      }
    }

    validatedRows.push({
      ...row,
      issues,
    });
  }

  const annotatedPreview = buildAnnotatedPreview(payload, validatedRows, duplicateWarnings);
  const hasValidationIssues = validatedRows.some((row) => row.issues.length > 0);
  if (hasValidationIssues) {
    return {
      error: "Fix the highlighted row issues and try again",
      success: null,
      preview: annotatedPreview,
    };
  }

  try {
    await db.transaction(async (tx) => {
      for (const row of payload.rows) {
        if (skippedDuplicateRows.has(row.rowNumber)) {
          continue;
        }

        const amountValue = resolveWorkbookValue(row, headerIndex, "amount", payload, formData);
        const scopeValue = resolveWorkbookValue(row, headerIndex, "scope", payload, formData);
        const necessityScoreValue = resolveWorkbookValue(
          row,
          headerIndex,
          "necessity_score",
          payload,
          formData
        );
        const noteValue = resolveWorkbookValue(row, headerIndex, "note", payload, formData);
        const categoryValue = resolveWorkbookValue(row, headerIndex, "category", payload, formData);
        const timestampValue = resolveWorkbookValue(row, headerIndex, "transactionTimestamp", payload, formData);
        const userValue = resolveWorkbookValue(row, headerIndex, "user_name", payload, formData);
        const counterpartyValue = resolveWorkbookValue(
          row,
          headerIndex,
          "counter_party_name",
          payload,
          formData
        );
        const modeValue = resolveWorkbookValue(row, headerIndex, "mode", payload, formData);

        const normalizedCategoryName = normalizeWorkbookName(categoryValue.trim());
        const categorySelection = categorySelections.get(normalizedCategoryName);
        if (!categorySelection) {
          throw new Error(`Map the sheet category "${categoryValue || "—"}" to a DB category`);
        }

        let categoryId: number;
        if (categorySelection.mode === "existing") {
          categoryId = categorySelection.categoryId;
        } else {
          const existingCategory = categoryMap.get(normalizedCategoryName);
          if (existingCategory) {
            categoryId = existingCategory.id;
          } else {
            const created = await tx
              .insert(categories)
              .values({
                orgId,
                name: categoryValue.trim(),
                type: categorySelection.categoryType,
                createdBy: currentUser.id,
              })
              .returning();
            const createdCategory = created[0] ?? null;
            if (!createdCategory) {
              throw new Error(`Unable to create category "${categoryValue}"`);
            }

            categoryId = createdCategory.id;
            categoryMap.set(normalizeWorkbookName(createdCategory.name), {
              id: createdCategory.id,
              name: createdCategory.name,
              type: createdCategory.type,
            });
            createdCategories.set(normalizeWorkbookName(createdCategory.name), createdCategory.id);
          }
        }

        const userSelection = userSelections.get(normalizeWorkbookName(userValue));
        if (!userSelection || !userSelection.userId) {
          throw new Error(`Map the sheet user name "${userValue || "—"}" to a DB user`);
        }

        const counterpartySelection = counterpartyValue.trim();
        let counterpartyId: number | null = null;
        if (counterpartySelection) {
          const selectedValue = counterpartySelections.get(normalizeWorkbookName(counterpartySelection));
          if (!selectedValue || !selectedValue.value) {
            throw new Error(`Map the sheet counterparty "${counterpartySelection}" to a DB counterparty`);
          }

          if (isCreateCounterpartyValue(selectedValue.value)) {
            const normalizedCounterpartyName = normalizeWorkbookName(counterpartySelection);
            const existingCounterparty = counterpartyMap.get(normalizedCounterpartyName);

            if (existingCounterparty) {
              counterpartyId = existingCounterparty.id;
            } else {
              const created = await tx
                .insert(counterParty)
                .values({
                  orgId,
                  name: counterpartySelection,
                })
                .returning();
              const createdCounterparty = created[0] ?? null;
              if (!createdCounterparty) {
                throw new Error(`Unable to create counterparty "${counterpartySelection}"`);
              }

              counterpartyId = createdCounterparty.id;
              counterpartyMap.set(normalizedCounterpartyName, {
                id: createdCounterparty.id,
                name: createdCounterparty.name,
              });
              createdCounterparties.set(normalizedCounterpartyName, createdCounterparty.id);
            }
          } else {
            const parsedCounterpartyId = Number.parseInt(selectedValue.value, 10);
            if (!Number.isInteger(parsedCounterpartyId)) {
              throw new Error(`Invalid counterparty mapping for "${counterpartySelection}"`);
            }

            const existingCounterparty = orgCounterparties.find(
              (counterparty) => counterparty.id === parsedCounterpartyId
            );
            if (!existingCounterparty) {
              throw new Error(`Counterparty "${counterpartySelection}" no longer exists in your organization`);
            }

            counterpartyId = existingCounterparty.id;
          }
        }

        const modeSelectionValue = modeValue.trim();
        let transactionModeId: number | null = null;
        if (modeSelectionValue) {
          const selectedMode = modeSelections.get(normalizeWorkbookName(modeSelectionValue));
          if (!selectedMode || !selectedMode.value) {
            throw new Error(`Map the sheet mode "${modeSelectionValue}" to a DB transaction mode`);
          }

          if (isCreateModeValue(selectedMode.value)) {
            const createUserId = userSelection.userId;

            const normalizedModeName = normalizeWorkbookName(modeSelectionValue);
            const existingMode = transactionModeByUserAndName.get(`${createUserId}|${normalizedModeName}`);
            if (existingMode) {
              transactionModeId = existingMode.id;
            } else {
              const createdModeResult = await tx
                .insert(transactionModes)
                .values({
                  userId: createUserId,
                  name: modeSelectionValue,
                  isDefault: !userHasAnyTransactionModes.get(createUserId),
                })
                .returning();

              const createdMode = createdModeResult[0] ?? null;
              if (!createdMode) {
                throw new Error(`Unable to create mode "${modeSelectionValue}"`);
              }

              transactionModeId = createdMode.id;
              transactionModeById.set(createdMode.id, {
                id: createdMode.id,
                name: createdMode.name,
                userId: createdMode.userId,
              });
              transactionModeByUserAndName.set(
                `${createdMode.userId}|${normalizeWorkbookName(createdMode.name)}`,
                {
                  id: createdMode.id,
                  name: createdMode.name,
                  userId: createdMode.userId,
                }
              );
              createdTransactionModes.set(
                `${createdMode.userId}|${normalizeWorkbookName(createdMode.name)}`,
                createdMode.id
              );
              userHasAnyTransactionModes.set(createUserId, true);
            }
          } else {
            const parsedModeId = Number.parseInt(selectedMode.value, 10);
            if (!Number.isInteger(parsedModeId)) {
              throw new Error(`Invalid mode mapping for "${modeSelectionValue}"`);
            }

            const existingMode = transactionModeById.get(parsedModeId);
            if (!existingMode) {
              throw new Error(`Mode "${modeSelectionValue}" no longer exists in your organization`);
            }

            transactionModeId = existingMode.id;
          }
        } else {
          const existingOnlineMode = onlineTransactionModeByUserId.get(userSelection.userId);
          if (existingOnlineMode) {
            transactionModeId = existingOnlineMode.id;
          } else {
            const createdModeResult = await tx
              .insert(transactionModes)
              .values({
                userId: userSelection.userId,
                name: "Online",
                isDefault: !userHasAnyTransactionModes.get(userSelection.userId),
              })
              .returning();

            const createdMode = createdModeResult[0] ?? null;
            if (!createdMode) {
              throw new Error(`Unable to create mode "Online" for ${userValue || "—"}`);
            }

            transactionModeId = createdMode.id;
            transactionModeById.set(createdMode.id, {
              id: createdMode.id,
              name: createdMode.name,
              userId: createdMode.userId,
            });
            transactionModeByUserAndName.set(`${createdMode.userId}|${normalizeWorkbookName(createdMode.name)}`, {
              id: createdMode.id,
              name: createdMode.name,
              userId: createdMode.userId,
            });
            onlineTransactionModeByUserId.set(createdMode.userId, {
              id: createdMode.id,
              name: createdMode.name,
              userId: createdMode.userId,
            });
            userHasAnyTransactionModes.set(createdMode.userId, true);
            createdTransactionModes.set(
              `${createdMode.userId}|${normalizeWorkbookName(createdMode.name)}`,
              createdMode.id
            );
          }
        }

        const amount = parseAmount(amountValue);
        const necessityScore = parseNecessityScore(necessityScoreValue);
        const note = parseNote(noteValue);
        const transactionTimestamp = parseTransactionTimestamp(timestampValue);
        const type = categorySelection.categoryType;
        const scope = parseExpenseScope(scopeValue);
        const duplicateKey = toDuplicateKey({
          amount,
          userId: userSelection.userId,
          categoryId,
          note,
          transactionTimestamp,
        });

        if (existingExpenseKeys.has(duplicateKey)) {
          const existingExpense = existingExpenseByKey.get(duplicateKey);
          const duplicateDetails = existingExpense
            ? await formatExpenseRecordSummary(existingExpense)
            : importedExpenseSummaries.get(duplicateKey);

          throw new Error(
            `Row ${row.rowNumber}: duplicate expense already exists${duplicateDetails ? ` (${duplicateDetails})` : ""}`
          );
        }

        existingExpenseKeys.add(duplicateKey);
        importedExpenseSummaries.set(
          duplicateKey,
          formatImportRowSummary({
            amount,
            category: categoryValue.trim(),
            userName: userValue.trim(),
            transactionTimestamp,
            note,
            counterpartyName: counterpartySelection || null,
            modeName: modeSelectionValue || null,
            scope,
            type,
          })
        );

        try {
          await tx.insert(expenses).values({
            orgId,
            userId: userSelection.userId,
            categoryId,
            counterPartyId: counterpartyId,
            transactionModeId,
            transferStatus: counterpartyId ? "open" : null,
            amount,
            type,
            scope,
            necessityScore,
            note,
            transactionTimestamp,
          });
        } catch (error) {
          if (isDuplicateExpenseConstraintError(error)) {
            const duplicateDetails =
              importedExpenseSummaries.get(duplicateKey) ??
              (existingExpenseByKey.get(duplicateKey)
                ? await formatExpenseRecordSummary(existingExpenseByKey.get(duplicateKey)!)
                : formatImportRowSummary({
                    amount,
                    category: categoryValue.trim(),
                    userName: userValue.trim(),
                    transactionTimestamp,
                    note,
                    counterpartyName: counterpartySelection || null,
                    modeName: modeSelectionValue || null,
                    scope,
                    type,
                  }));

            throw new Error(
              `Row ${row.rowNumber}: duplicate expense already exists (${duplicateDetails})`
            );
          }

          throw error;
        }
      }
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to import workbook",
      success: null,
      preview: null,
    };
  }

  revalidatePath(ROUTES.EXPENSES);
  revalidatePath(ROUTES.ACTIVITY);
  revalidatePath(ROUTES.TRANSFERS);
  revalidatePath(ROUTES.COUNTERPARTIES);
  revalidatePath(ROUTES.CATEGORIES);
  revalidatePath(ROUTES.DASHBOARD, "layout");

  const importedRowCount = payload.rows.length - skippedDuplicateRows.size;
  const creationNotes = [
    createdCategories.size
      ? `created ${createdCategories.size} category record${createdCategories.size === 1 ? "" : "s"}`
      : "",
    createdCounterparties.size
      ? `created ${createdCounterparties.size} counterparty record${createdCounterparties.size === 1 ? "" : "s"}`
      : "",
    createdTransactionModes.size
      ? `created ${createdTransactionModes.size} mode record${createdTransactionModes.size === 1 ? "" : "s"}`
      : "",
  ].filter(Boolean);

  const statusMessage =
    importedRowCount > 0
      ? `Imported ${importedRowCount} expense row${importedRowCount === 1 ? "" : "s"} successfully`
      : "No new expense rows were imported";
  const createdMessage = creationNotes.length ? ` and ${creationNotes.join(", ")}` : "";
  const duplicateMessage = skippedDuplicateRows.size
    ? `${creationNotes.length ? "," : " and"} skipped ${skippedDuplicateRows.size} duplicate row${
        skippedDuplicateRows.size === 1 ? "" : "s"
      }`
    : "";

  return {
    error: null,
    success: `${statusMessage}${createdMessage}${duplicateMessage}.`,
    preview: null,
  };
  */
}

async function importUserScopedExpensesFromWorkbookAction(
  currentUser: Awaited<ReturnType<typeof requireUser>>,
  payload: ImportPayload,
  formData: FormData
): Promise<ManageImportExportActionState> {
  if (!currentUser.orgId) {
    return {
      error: "Create or join an organization first",
      success: null,
      preview: null,
    };
  }

  const orgId = currentUser.orgId;

  const [orgCategories, orgCounterparties, existingExpenses, userTransactionModes] = await Promise.all([
    getCategoriesByOrg(orgId),
    getCounterpartiesByOrg(orgId),
    getExpensesByOrg(orgId),
    getTransactionModesByUser(currentUser.id),
  ]);

  const existingUserExpenses = existingExpenses.filter((expense) => expense.userId === currentUser.id);
  const headerIndex = buildWorkbookHeaderIndex(payload.headers);

  const categoryMap = new Map<string, { id: number; name: string; type: string }>(
    orgCategories.map((category) => [
      normalizeWorkbookName(category.name),
      { id: category.id, name: category.name, type: category.type },
    ])
  );
  const counterpartyMap = new Map<string, { id: number; name: string }>(
    orgCounterparties.map((counterparty) => [
      normalizeWorkbookName(counterparty.name),
      { id: counterparty.id, name: counterparty.name },
    ])
  );
  const transactionModeById = new Map<number, { id: number; name: string; userId: string }>(
    userTransactionModes.map((mode) => [
      mode.id,
      { id: mode.id, name: mode.name, userId: mode.userId },
    ])
  );
  const defaultTransactionMode = userTransactionModes.find((mode) => mode.isDefault) ?? userTransactionModes[0] ?? null;

  const existingExpenseKeys = new Set(
    existingUserExpenses.map((expense) =>
      toDuplicateKey({
        amount: expense.amount,
        userId: expense.userId,
        categoryId: expense.categoryId,
        note: expense.note,
        transactionTimestamp: new Date(expense.occurredAt),
      })
    )
  );
  const existingExpenseByKey = new Map(
    existingUserExpenses.map((expense) => [
      toDuplicateKey({
        amount: expense.amount,
        userId: expense.userId,
        categoryId: expense.categoryId,
        note: expense.note,
        transactionTimestamp: new Date(expense.occurredAt),
      }),
      expense,
    ] as const)
  );

  const distinctCategoryNames = getDistinctWorkbookValues(payload, headerIndex, "category", formData);
  const distinctCounterpartyNames = getDistinctWorkbookValues(
    payload,
    headerIndex,
    "counter_party_name",
    formData
  );
  const distinctModeNames = getDistinctWorkbookValues(payload, headerIndex, "mode", formData);

  const categorySelections = new Map<
    string,
    { categoryId: number; categoryName: string; categoryType: "expense" | "income" } | null
  >();
  const categorySelectionErrors = new Map<string, string>();
  distinctCategoryNames.forEach((sheetCategoryName, index) => {
    const selected = formData.get(`category_map_${index}`);
    const normalizedSheetCategoryName = normalizeWorkbookName(sheetCategoryName);

    if (typeof selected !== "string" || !selected.trim()) {
      categorySelectionErrors.set(
        normalizedSheetCategoryName,
        `Create the category "${sheetCategoryName}" first, then map it here.`
      );
      categorySelections.set(normalizedSheetCategoryName, null);
      return;
    }

    const parsedCategoryId = Number.parseInt(selected.trim(), 10);
    if (!Number.isInteger(parsedCategoryId)) {
      categorySelectionErrors.set(
        normalizedSheetCategoryName,
        `Invalid category mapping for "${sheetCategoryName}"`
      );
      categorySelections.set(normalizedSheetCategoryName, null);
      return;
    }

    const existingCategory = orgCategories.find((category) => category.id === parsedCategoryId);
    if (!existingCategory) {
      categorySelectionErrors.set(
        normalizedSheetCategoryName,
        `Category "${sheetCategoryName}" no longer exists in your organization. Create it first, then refresh this page.`
      );
      categorySelections.set(normalizedSheetCategoryName, null);
      return;
    }

    categorySelections.set(normalizedSheetCategoryName, {
      categoryId: existingCategory.id,
      categoryName: existingCategory.name,
      categoryType: existingCategory.type as "expense" | "income",
    });
  });

  const counterpartySelections = new Map<string, { counterpartyId: number | null; error: string | null }>();
  distinctCounterpartyNames.forEach((sheetCounterpartyName, index) => {
    const selected = formData.get(`counterparty_map_${index}`);
    const normalizedSheetCounterpartyName = normalizeWorkbookName(sheetCounterpartyName);

    if (typeof selected !== "string" || !selected.trim()) {
      counterpartySelections.set(normalizedSheetCounterpartyName, {
        counterpartyId: null,
        error: `Create the counterparty "${sheetCounterpartyName}" first, then map it here.`,
      });
      return;
    }

    const parsedCounterpartyId = Number.parseInt(selected.trim(), 10);
    if (!Number.isInteger(parsedCounterpartyId)) {
      counterpartySelections.set(normalizedSheetCounterpartyName, {
        counterpartyId: null,
        error: `Invalid counterparty mapping for "${sheetCounterpartyName}"`,
      });
      return;
    }

    const existingCounterparty = orgCounterparties.find((counterparty) => counterparty.id === parsedCounterpartyId);
    if (!existingCounterparty) {
      counterpartySelections.set(normalizedSheetCounterpartyName, {
        counterpartyId: null,
        error: `Counterparty "${sheetCounterpartyName}" no longer exists in your organization. Create it first, then refresh this page.`,
      });
      return;
    }

    counterpartySelections.set(normalizedSheetCounterpartyName, {
      counterpartyId: existingCounterparty.id,
      error: null,
    });
  });

  const modeSelections = new Map<string, { modeId: number | null; error: string | null }>();
  distinctModeNames.forEach((sheetModeName, index) => {
    const selected = formData.get(`mode_map_${index}`);
    const normalizedSheetModeName = normalizeWorkbookName(sheetModeName);

    if (typeof selected !== "string" || !selected.trim()) {
      modeSelections.set(normalizedSheetModeName, {
        modeId: null,
        error: `Create the transaction mode "${sheetModeName}" first, then map it here.`,
      });
      return;
    }

    const parsedModeId = Number.parseInt(selected.trim(), 10);
    if (!Number.isInteger(parsedModeId)) {
      modeSelections.set(normalizedSheetModeName, {
        modeId: null,
        error: `Invalid mode mapping for "${sheetModeName}"`,
      });
      return;
    }

    const existingMode = transactionModeById.get(parsedModeId);
    if (!existingMode) {
      modeSelections.set(normalizedSheetModeName, {
        modeId: null,
        error: `Mode "${sheetModeName}" no longer exists in your user modes. Create it first, then refresh this page.`,
      });
      return;
    }

    modeSelections.set(normalizedSheetModeName, {
      modeId: existingMode.id,
      error: null,
    });
  });

  const importedExpenseSummaries = new Map<string, string>();
  const duplicateWarnings: string[] = [];
  const skippedDuplicateRows = new Set<number>();
  const validatedRows: ImportWorkbookRow[] = [];
  const seenDuplicateKeys = new Map<string, string>();

  for (const row of payload.rows) {
    const issues = [...row.issues];

    const amountValue = resolveWorkbookValue(row, headerIndex, "amount", payload, formData);
    const scopeValue = resolveWorkbookValue(row, headerIndex, "scope", payload, formData);
    const necessityScoreValue = resolveWorkbookValue(row, headerIndex, "necessity_score", payload, formData);
    const noteValue = resolveWorkbookValue(row, headerIndex, "note", payload, formData);
    const categoryValue = resolveWorkbookValue(row, headerIndex, "category", payload, formData);
    const timestampValue = resolveWorkbookValue(row, headerIndex, "transactionTimestamp", payload, formData);
    const counterpartyValue = resolveWorkbookValue(
      row,
      headerIndex,
      "counter_party_name",
      payload,
      formData
    );
    const modeValue = resolveWorkbookValue(row, headerIndex, "mode", payload, formData);

    if (!amountValue.trim()) {
      issues.push("Missing amount");
    }
    if (!categoryValue.trim()) {
      issues.push("Missing category");
    }
    if (!timestampValue.trim()) {
      issues.push("Missing transactionTimestamp");
    }

    const normalizedCategoryName = normalizeWorkbookName(categoryValue);
    const categorySelection = categorySelections.get(normalizedCategoryName);
    if (!categorySelection) {
      issues.push(`Create the category "${categoryValue || "—"}" first, then refresh and map it.`);
    } else if (categorySelection === null) {
      const selectionError = categorySelectionErrors.get(normalizedCategoryName);
      if (selectionError) {
        issues.push(selectionError as string);
      }
    }

    const counterpartySelectionValue = counterpartyValue.trim();
    if (counterpartySelectionValue) {
      const normalizedCounterpartyName = normalizeWorkbookName(counterpartySelectionValue);
      const counterpartySelection = counterpartySelections.get(normalizedCounterpartyName);
      if (!counterpartySelection) {
        issues.push(`Create the counterparty "${counterpartySelectionValue}" first, then refresh and map it.`);
      } else {
        const selectionError = counterpartySelection!.error;
        if (selectionError !== null) {
          issues.push(selectionError as string);
        }
      }
    }

    const modeSelectionValue = modeValue.trim();
    if (modeSelectionValue) {
      const normalizedModeName = normalizeWorkbookName(modeSelectionValue);
      const modeSelection = modeSelections.get(normalizedModeName);
      if (!modeSelection) {
        issues.push(`Create the transaction mode "${modeSelectionValue}" first, then refresh and map it.`);
      } else {
        const selectionError = modeSelection!.error;
        if (selectionError !== null) {
          issues.push(selectionError as string);
        }
      }
    }

    let amount = "";
    try {
      amount = parseAmount(amountValue);
    } catch (error) {
      void error;
      issues.push(`Invalid amount: ${amountValue}`);
    }

    try {
      parseNecessityScore(necessityScoreValue);
    } catch (error) {
      void error;
      issues.push(`Invalid necessity_score: ${necessityScoreValue}`);
    }

    let scope = "";
    try {
      scope = parseExpenseScope(scopeValue);
    } catch (error) {
      void error;
      issues.push(`Invalid scope: ${scopeValue}`);
    }

    const note = parseNote(noteValue);
    let transactionTimestamp = new Date(0);
    try {
      transactionTimestamp = parseTransactionTimestamp(timestampValue);
    } catch (error) {
      void error;
      issues.push(`Invalid transactionTimestamp: ${timestampValue}`);
    }

    const userId = currentUser.id;
    const categoryId = categorySelection?.categoryId ?? null;
    const duplicateKey =
      issues.length === 0 && categoryId !== null
        ? toDuplicateKey({
            amount,
            userId,
            categoryId,
            note,
            transactionTimestamp,
          })
        : null;

    if (issues.length === 0 && categoryId !== null && duplicateKey) {
      const existingExpense = existingExpenseByKey.get(duplicateKey) ?? null;
      if (existingExpense) {
        skippedDuplicateRows.add(row.rowNumber);
        duplicateWarnings.push(
          `Row ${row.rowNumber} skipped because it duplicates an existing expense (${await formatExpenseRecordSummary(existingExpense)})`
        );
        validatedRows.push({
          ...row,
          issues,
        });
        continue;
      }

      if (seenDuplicateKeys.has(duplicateKey)) {
        const previousSummary = seenDuplicateKeys.get(duplicateKey);
        skippedDuplicateRows.add(row.rowNumber);
        duplicateWarnings.push(
          `Row ${row.rowNumber} skipped because it duplicates another uploaded row (${previousSummary ?? "same amount, user, category, note, and date"})`
        );
        validatedRows.push({
          ...row,
          issues,
        });
        continue;
      }

      seenDuplicateKeys.set(
        duplicateKey,
        formatImportRowSummary({
          amount,
          category: categoryValue.trim(),
          userName: currentUser.name,
          transactionTimestamp,
          note,
          counterpartyName: counterpartySelectionValue || null,
          modeName: modeSelectionValue || defaultTransactionMode?.name || null,
          scope,
          type: categorySelection!.categoryType,
        })
      );
    }

    validatedRows.push({
      ...row,
      issues,
    });
  }

  const annotatedPreview = buildAnnotatedPreview(payload, validatedRows, duplicateWarnings);
  const hasValidationIssues = validatedRows.some((row) => row.issues.length > 0);
  if (hasValidationIssues) {
    return {
      error: "Create any missing categories, counterparties, or modes first, then try again",
      success: null,
      preview: annotatedPreview,
    };
  }

  try {
    await db.transaction(async (tx) => {
      for (const row of payload.rows) {
        if (skippedDuplicateRows.has(row.rowNumber)) {
          continue;
        }

        const amountValue = resolveWorkbookValue(row, headerIndex, "amount", payload, formData);
        const scopeValue = resolveWorkbookValue(row, headerIndex, "scope", payload, formData);
        const necessityScoreValue = resolveWorkbookValue(
          row,
          headerIndex,
          "necessity_score",
          payload,
          formData
        );
        const noteValue = resolveWorkbookValue(row, headerIndex, "note", payload, formData);
        const categoryValue = resolveWorkbookValue(row, headerIndex, "category", payload, formData);
        const timestampValue = resolveWorkbookValue(row, headerIndex, "transactionTimestamp", payload, formData);
        const counterpartyValue = resolveWorkbookValue(
          row,
          headerIndex,
          "counter_party_name",
          payload,
          formData
        );
        const modeValue = resolveWorkbookValue(row, headerIndex, "mode", payload, formData);

        const normalizedCategoryName = normalizeWorkbookName(categoryValue.trim());
        const categorySelection = categorySelections.get(normalizedCategoryName);
        if (!categorySelection) {
          throw new Error(`Create the category "${categoryValue || "—"}" first, then refresh and map it.`);
        }

        const categoryId = categorySelection.categoryId;

        const counterpartySelection = counterpartyValue.trim();
        let counterpartyId: number | null = null;
        if (counterpartySelection) {
          const selectedValue = counterpartySelections.get(normalizeWorkbookName(counterpartySelection));
          if (!selectedValue || selectedValue.error || selectedValue.counterpartyId === null) {
            throw new Error(`Create the counterparty "${counterpartySelection}" first, then refresh and map it.`);
          }

          counterpartyId = selectedValue.counterpartyId;
        }

        const modeSelectionValue = modeValue.trim();
        let transactionModeId: number | null = null;
        if (modeSelectionValue) {
          const selectedMode = modeSelections.get(normalizeWorkbookName(modeSelectionValue));
          if (!selectedMode || selectedMode.error || selectedMode.modeId === null) {
            throw new Error(`Create the transaction mode "${modeSelectionValue}" first, then refresh and map it.`);
          }

          transactionModeId = selectedMode.modeId;
        } else if (defaultTransactionMode) {
          transactionModeId = defaultTransactionMode.id;
        }

        const amount = parseAmount(amountValue);
        const necessityScore = parseNecessityScore(necessityScoreValue);
        const note = parseNote(noteValue);
        const transactionTimestamp = parseTransactionTimestamp(timestampValue);
        const type = categorySelection!.categoryType;
        const scope = parseExpenseScope(scopeValue);
        const duplicateKey = toDuplicateKey({
          amount,
          userId: currentUser.id,
          categoryId,
          note,
          transactionTimestamp,
        });

        if (existingExpenseKeys.has(duplicateKey)) {
          const existingExpense = existingExpenseByKey.get(duplicateKey);
          const duplicateDetails = existingExpense
            ? await formatExpenseRecordSummary(existingExpense)
            : importedExpenseSummaries.get(duplicateKey);

          throw new Error(
            `Row ${row.rowNumber}: duplicate expense already exists${duplicateDetails ? ` (${duplicateDetails})` : ""}`
          );
        }

        existingExpenseKeys.add(duplicateKey);
        importedExpenseSummaries.set(
          duplicateKey,
          formatImportRowSummary({
            amount,
            category: categoryValue.trim(),
            userName: currentUser.name,
            transactionTimestamp,
            note,
            counterpartyName: counterpartySelection || null,
            modeName: modeSelectionValue || defaultTransactionMode?.name || null,
            scope,
            type,
          })
        );

        try {
          await tx.insert(expenses).values({
            orgId,
            userId: currentUser.id,
            categoryId,
            counterPartyId: counterpartyId,
            transactionModeId,
            transferStatus: counterpartyId ? "open" : null,
            amount,
            type,
            scope,
            necessityScore,
            note,
            transactionTimestamp,
          });
        } catch (error) {
          if (isDuplicateExpenseConstraintError(error)) {
            const duplicateDetails =
              importedExpenseSummaries.get(duplicateKey) ??
              (existingExpenseByKey.get(duplicateKey)
                ? await formatExpenseRecordSummary(existingExpenseByKey.get(duplicateKey)!)
                : formatImportRowSummary({
                    amount,
                    category: categoryValue.trim(),
                    userName: currentUser.name,
                    transactionTimestamp,
                    note,
                    counterpartyName: counterpartySelection || null,
                    modeName: modeSelectionValue || null,
                    scope,
                    type,
                  }));

            throw new Error(
              `Row ${row.rowNumber}: duplicate expense already exists (${duplicateDetails})`
            );
          }

          throw error;
        }
      }
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to import workbook",
      success: null,
      preview: null,
    };
  }

  revalidatePath(ROUTES.EXPENSES);
  revalidatePath(ROUTES.ACTIVITY);
  revalidatePath(ROUTES.TRANSFERS);
  revalidatePath(ROUTES.COUNTERPARTIES);
  revalidatePath(ROUTES.CATEGORIES);
  revalidatePath(ROUTES.DASHBOARD, "layout");

  const importedRowCount = payload.rows.length - skippedDuplicateRows.size;

  return {
    error: null,
    success:
      importedRowCount > 0
        ? `Imported ${importedRowCount} expense row${importedRowCount === 1 ? "" : "s"} successfully${skippedDuplicateRows.size ? `, skipped ${skippedDuplicateRows.size} duplicate row${skippedDuplicateRows.size === 1 ? "" : "s"}` : ""}.`
        : "No new expense rows were imported.",
    preview: null,
  };
}
