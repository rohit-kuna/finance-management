"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, Download, FileUp, RefreshCw, ShieldAlert } from "lucide-react";
import {
  importExpensesFromWorkbookAction,
  importExpensesFromWorkbookOrgAction,
  parseImportWorkbookAction,
  parseImportWorkbookOrgAction,
} from "@/app/actions/auth-roles/manage-import-export.actions";
import {
  IMPORT_WORKBOOK_FIELD_CONFIGS,
  IMPORT_WORKBOOK_FIELDS,
  IMPORT_WORKBOOK_FIELDS_BY_SCOPE,
  manageImportExportInitialState,
  type ImportWorkbookField,
  type ImportWorkbookPreview,
  type ManageImportExportDataDto,
} from "@/app/lib/manage-import-export.types";
import {
  buildWorkbookHeaderIndex,
  findUniqueNormalizedMatch,
  normalizeWorkbookName,
  resolveWorkbookRowValue,
} from "@/app/lib/manage-import-export.shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type ColumnSelections = Partial<Record<ImportWorkbookField, string>>;
type ValueSelectionMap = Record<string, string>;
function ActionBanner({
  error,
  success,
}: {
  error: string | null;
  success: string | null;
}) {
  if (!error && !success) return null;

  const isError = Boolean(error);

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4 text-sm",
        isError
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-emerald-500/30 bg-emerald-500/5 text-emerald-700"
      )}
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{error ?? success}</span>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        {eyebrow}
      </p>
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function SuggestionBadge({
  match,
  isAmbiguous,
  fallbackLabel,
}: {
  match: boolean;
  isAmbiguous: boolean;
  fallbackLabel: string;
}) {
  if (match) {
    return (
      <Badge variant="success" className="shrink-0">
        Matched
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0",
        isAmbiguous ? "border-destructive/50 text-destructive" : "border-muted-foreground/30"
      )}
    >
      {isAmbiguous ? "Ambiguous" : fallbackLabel}
    </Badge>
  );
}

function buildPreviewKey(preview: ImportWorkbookPreview | null) {
  if (!preview) return "";

  return `${preview.scope}|${preview.fileName}|${preview.totalRows}|${preview.headers.join("|")}`;
}

function sortByName(left: { name: string }, right: { name: string }) {
  return left.name.localeCompare(right.name);
}

function sortByModeName(
  left: { name: string; userName: string },
  right: { name: string; userName: string }
) {
  const ownerComparison = left.userName.localeCompare(right.userName);
  if (ownerComparison !== 0) return ownerComparison;

  return left.name.localeCompare(right.name);
}

function collectDistinctValues(rows: Array<{ values: Record<ImportWorkbookField, string> }>, field: ImportWorkbookField) {
  const seen = new Map<string, string>();

  for (const row of rows) {
    const value = row.values[field];
    if (!value) continue;

    const trimmed = value.trim();
    if (!trimmed) continue;

    const normalized = normalizeWorkbookName(trimmed);
    if (!seen.has(normalized)) {
      seen.set(normalized, trimmed);
    }
  }

  return Array.from(seen.values()).sort((left, right) => left.localeCompare(right));
}

function collectDistinctSubcategoryNames(
  rows: Array<{
    values: Record<ImportWorkbookField, string>;
    resolvedCategoryId: number | null;
    resolvedCategoryName: string;
  }>
) {
  const seen = new Map<string, { subcategoryName: string; categoryId: number | null; categoryName: string }>();

  for (const row of rows) {
    const value = row.values.subcategories;
    if (!value) continue;

    for (const part of value.split(",")) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      const key = `${row.resolvedCategoryId}:${normalizeWorkbookName(trimmed)}`;
      if (!seen.has(key)) {
        seen.set(key, {
          subcategoryName: trimmed,
          categoryId: row.resolvedCategoryId,
          categoryName: row.resolvedCategoryName,
        });
      }
    }
  }

  return Array.from(seen.values()).sort((left, right) =>
    left.subcategoryName.localeCompare(right.subcategoryName)
  );
}

function collectDistinctTagNames(rows: Array<{ values: Record<ImportWorkbookField, string> }>) {
  const seen = new Map<string, string>();

  for (const row of rows) {
    const value = row.values.tags;
    if (!value) continue;

    for (const part of value.split(",")) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      const normalized = normalizeWorkbookName(trimmed);
      if (!seen.has(normalized)) {
        seen.set(normalized, trimmed);
      }
    }
  }

  return Array.from(seen.values()).sort((left, right) => left.localeCompare(right));
}

export function ManageImportExport({ data }: { data: ManageImportExportDataDto }) {
  const isOrganizationScope = data.scope === "organization";
  const [parseState, parseAction, parsePending] = useActionState(
    isOrganizationScope ? parseImportWorkbookOrgAction : parseImportWorkbookAction,
    manageImportExportInitialState
  );
  const [importState, importAction, importPending] = useActionState(
    isOrganizationScope ? importExpensesFromWorkbookOrgAction : importExpensesFromWorkbookAction,
    manageImportExportInitialState
  );
  const [columnSelections, setColumnSelections] = useState<ColumnSelections>({});
  const [userSelections, setUserSelections] = useState<ValueSelectionMap>({});
  const [counterpartySelections, setCounterpartySelections] = useState<ValueSelectionMap>({});
  const [categorySelections, setCategorySelections] = useState<ValueSelectionMap>({});
  const [modeSelections, setModeSelections] = useState<ValueSelectionMap>({});
  const initializedPreviewKey = useRef("");

  const preview = importState.preview ?? parseState.preview;
  const payloadJson = preview ? JSON.stringify(preview) : "";
  const fieldList = preview?.fields ?? IMPORT_WORKBOOK_FIELDS_BY_SCOPE[data.scope];
  const exportHref = isOrganizationScope ? "/import-export-org/export" : "/import-export/export";

  useEffect(() => {
    const nextKey = buildPreviewKey(preview);
    if (!preview || initializedPreviewKey.current === nextKey) {
      return;
    }

    initializedPreviewKey.current = nextKey;
    const timeoutId = window.setTimeout(() => {
      const nextColumnSelections = {} as ColumnSelections;
      for (const field of fieldList) {
        nextColumnSelections[field] = preview.suggestedColumnMappings[field] ?? "";
      }

      setColumnSelections(nextColumnSelections);
      setUserSelections({});
      setCounterpartySelections({});
      setCategorySelections({});
      setModeSelections({});
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [preview, fieldList]);

  const headerIndex = useMemo(() => {
    if (!preview) {
      return new Map<string, number>();
    }

    return buildWorkbookHeaderIndex(preview.headers);
  }, [preview]);

  const selectedColumns = useMemo(() => {
    const values = {} as Record<ImportWorkbookField, string>;
    for (const field of fieldList) {
      values[field] = columnSelections[field] ?? preview?.suggestedColumnMappings[field] ?? "";
    }
    return values;
  }, [columnSelections, preview, fieldList]);

  const availableHeaders = useMemo(() => {
    if (!preview) return [];
    return Array.from(new Set(preview.headers.filter((header) => header.trim().length > 0)));
  }, [preview]);

  const counterpartyById = useMemo(
    () => new Map(data.counterparties.map((counterparty) => [String(counterparty.id), counterparty] as const)),
    [data.counterparties]
  );
  const categoryById = useMemo(
    () => new Map(data.categories.map((category) => [String(category.id), category] as const)),
    [data.categories]
  );
  const modeById = useMemo(
    () =>
      new Map(
        data.transactionModes.map((mode) => [
          String(mode.id),
          mode,
        ] as const)
      ),
    [data.transactionModes]
  );
  const transactionModesSorted = useMemo(
    () => data.transactionModes.slice().sort(sortByModeName),
    [data.transactionModes]
  );
  const defaultTransactionMode = useMemo(
    () => data.transactionModes.find((mode) => mode.isDefault) ?? data.transactionModes[0] ?? null,
    [data.transactionModes]
  );
  const categoriesSorted = useMemo(
    () => data.categories.slice().sort(sortByName),
    [data.categories]
  );
  const counterpartiesSorted = useMemo(
    () => data.counterparties.slice().sort(sortByName),
    [data.counterparties]
  );
  const membersSorted = useMemo(() => data.members.slice().sort(sortByName), [data.members]);
  const memberById = useMemo(
    () => new Map(data.members.map((member) => [member.id, member] as const)),
    [data.members]
  );

  const resolvedRows = useMemo(() => {
    if (!preview) return [];

    return preview.rows.map((row) => {
      const resolvedValues = IMPORT_WORKBOOK_FIELDS.reduce((accumulator, field) => {
        accumulator[field] = "";
        return accumulator;
      }, {} as Record<ImportWorkbookField, string>);
      for (const field of fieldList) {
        const selectedColumn = selectedColumns[field];
        resolvedValues[field] = selectedColumn
          ? resolveWorkbookRowValue(row.values, headerIndex, selectedColumn)
          : "";
      }

      const normalizedCategoryName = normalizeWorkbookName(resolvedValues.category);
      const normalizedCounterpartyName = normalizeWorkbookName(resolvedValues.counter_party_name);
      const normalizedModeName = normalizeWorkbookName(resolvedValues.mode);
      const hasCategoryValue = resolvedValues.category.trim().length > 0;
      const hasCounterpartyValue = resolvedValues.counter_party_name.trim().length > 0;
      const hasModeValue = resolvedValues.mode.trim().length > 0;

      const categoryMatch = findUniqueNormalizedMatch(data.categories, resolvedValues.category);
      const selectedCategoryValue =
        categorySelections[normalizedCategoryName] ??
        (hasCategoryValue
          ? categoryMatch.match
            ? String(categoryMatch.match.id)
            : ""
          : "");
      const resolvedCategory =
        selectedCategoryValue
          ? categoryById.get(selectedCategoryValue) ?? null
          : null;

      const counterpartyMatch = findUniqueNormalizedMatch(data.counterparties, resolvedValues.counter_party_name);
      const selectedCounterpartyValue =
        counterpartySelections[normalizedCounterpartyName] ??
        (hasCounterpartyValue
          ? counterpartyMatch.match
            ? String(counterpartyMatch.match.id)
            : ""
          : "");
      const resolvedCounterparty =
        selectedCounterpartyValue
          ? counterpartyById.get(selectedCounterpartyValue) ?? null
          : null;

      const modeMatch = findUniqueNormalizedMatch(data.transactionModes, resolvedValues.mode);
      const selectedModeValue =
        modeSelections[normalizedModeName] ??
        (hasModeValue
          ? modeMatch.match
            ? String(modeMatch.match.id)
            : ""
          : "");
      const resolvedMode = selectedModeValue
        ? modeById.get(selectedModeValue) ?? null
        : null;
      const normalizedUserName = normalizeWorkbookName(resolvedValues.user_name);
      const hasUserValue = resolvedValues.user_name.trim().length > 0;
      const userMatch = findUniqueNormalizedMatch(data.members, resolvedValues.user_name);
      const selectedUserValue =
        userSelections[normalizedUserName] ??
        (hasUserValue
          ? userMatch.match
            ? userMatch.match.id
            : ""
          : "");
      const resolvedUser = selectedUserValue ? memberById.get(selectedUserValue) ?? null : null;
      const resolvedUserName = isOrganizationScope
        ? resolvedUser?.name ?? (resolvedValues.user_name.trim() || "—")
        : data.currentUser.name;

      const displayValues: Record<ImportWorkbookField, string> = {
        amount: resolvedValues.amount,
        type: resolvedValues.type,
        necessity_score: resolvedValues.necessity_score.trim() || "1",
        note: resolvedValues.note.trim() || "—",
        category: resolvedCategory?.name ?? resolvedValues.category,
        transactionTimestamp: resolvedValues.transactionTimestamp,
        user_name: resolvedUserName,
        counter_party_name: (resolvedCounterparty?.name ?? resolvedValues.counter_party_name) || "—",
        mode: resolvedMode?.name || defaultTransactionMode?.name || resolvedValues.mode || "—",
        subcategories: resolvedValues.subcategories.trim() || "—",
        tags: resolvedValues.tags.trim() || "—",
      };

      return {
        rowNumber: row.rowNumber,
        values: resolvedValues,
        displayValues,
        issues: row.issues,
        resolvedCategoryId: resolvedCategory?.id ?? null,
        resolvedCategoryName: resolvedCategory?.name ?? (resolvedValues.category.trim() || "—"),
      };
    });
  }, [
    preview,
    selectedColumns,
    headerIndex,
    userSelections,
    categorySelections,
    counterpartySelections,
    modeSelections,
    categoryById,
    counterpartyById,
    modeById,
    data.categories,
    data.counterparties,
    data.transactionModes,
    data.members,
    memberById,
    defaultTransactionMode,
    data.currentUser.id,
    data.currentUser.name,
    fieldList,
    isOrganizationScope,
  ]);

  const distinctUserNames = useMemo(
    () => (isOrganizationScope ? collectDistinctValues(resolvedRows, "user_name") : []),
    [resolvedRows, isOrganizationScope]
  );
  const distinctCategoryNames = useMemo(
    () => collectDistinctValues(resolvedRows, "category"),
    [resolvedRows]
  );
  const distinctCounterpartyNames = useMemo(
    () => collectDistinctValues(resolvedRows, "counter_party_name"),
    [resolvedRows]
  );
  const distinctModeNames = useMemo(() => collectDistinctValues(resolvedRows, "mode"), [resolvedRows]);
  const distinctSubcategoryNames = useMemo(() => collectDistinctSubcategoryNames(resolvedRows), [resolvedRows]);
  const distinctTagNames = useMemo(() => collectDistinctTagNames(resolvedRows), [resolvedRows]);

  const userMappings = useMemo(() => {
    if (!isOrganizationScope) {
      return [];
    }

    return distinctUserNames.map((sheetValue) => {
      const match = findUniqueNormalizedMatch(data.members, sheetValue);
      return {
        sheetValue,
        defaultValue: match.match ? match.match.id : "",
        isAmbiguous: match.isAmbiguous,
        hasMatch: Boolean(match.match),
      };
    });
  }, [data.members, distinctUserNames, isOrganizationScope]);

  const counterpartyMappings = useMemo(() => {
    return distinctCounterpartyNames.map((sheetValue) => {
      const match = findUniqueNormalizedMatch(data.counterparties, sheetValue);
      return {
        sheetValue,
        defaultValue: match.match ? String(match.match.id) : "",
        isAmbiguous: match.isAmbiguous,
        hasMatch: Boolean(match.match),
      };
    });
  }, [data.counterparties, distinctCounterpartyNames]);

  const categoryMappings = useMemo(() => {
    return distinctCategoryNames.map((sheetValue) => {
      const match = findUniqueNormalizedMatch(data.categories, sheetValue);
      return {
        sheetValue,
        defaultValue: match.match ? String(match.match.id) : "",
        isAmbiguous: match.isAmbiguous,
        hasMatch: Boolean(match.match),
      };
    });
  }, [data.categories, distinctCategoryNames]);

  const modeMappings = useMemo(() => {
    return distinctModeNames.map((sheetValue) => {
      const match = findUniqueNormalizedMatch(data.transactionModes, sheetValue);
      return {
        sheetValue,
        defaultValue: match.match ? String(match.match.id) : "",
        isAmbiguous: match.isAmbiguous,
        hasMatch: Boolean(match.match),
      };
    });
  }, [data.transactionModes, distinctModeNames]);

  const categoryChecks = useMemo(() => {
    return distinctCategoryNames.map((sheetValue) => {
      const match = findUniqueNormalizedMatch(data.categories, sheetValue);
      return {
        sheetValue,
        hasMatch: Boolean(match.match),
        isAmbiguous: match.isAmbiguous,
      };
    });
  }, [data.categories, distinctCategoryNames]);

  const modeChecks = useMemo(() => {
    return distinctModeNames.map((sheetValue) => {
      const match = findUniqueNormalizedMatch(data.transactionModes, sheetValue);
      return {
        sheetValue,
        hasMatch: Boolean(match.match),
        isAmbiguous: match.isAmbiguous,
      };
    });
  }, [data.transactionModes, distinctModeNames]);

  const subcategoryChecks = useMemo(() => {
    return distinctSubcategoryNames.map((entry) => {
      const subcategoriesInCategory = data.subcategories.filter(
        (subcategory) => subcategory.categoryId === entry.categoryId
      );
      const match = findUniqueNormalizedMatch(subcategoriesInCategory, entry.subcategoryName);
      return {
        sheetValue: entry.subcategoryName,
        categoryName: entry.categoryName,
        hasMatch: Boolean(match.match),
      };
    });
  }, [data.subcategories, distinctSubcategoryNames]);

  const tagChecks = useMemo(() => {
    return distinctTagNames.map((sheetValue) => {
      const match = findUniqueNormalizedMatch(data.tags, sheetValue);
      return {
        sheetValue,
        hasMatch: Boolean(match.match),
      };
    });
  }, [data.tags, distinctTagNames]);

  const unresolvedUsers = isOrganizationScope ? userMappings.filter((mapping) => !mapping.hasMatch).length : 0;
  const unresolvedCounterparties = counterpartyMappings.filter((mapping) => !mapping.hasMatch).length;
  const unresolvedCategories = categoryChecks.filter((check) => !check.hasMatch).length;
  const unresolvedModes = modeChecks.filter((check) => !check.hasMatch).length;
  const hasUnresolvedLookups =
    unresolvedCategories > 0 || unresolvedCounterparties > 0 || unresolvedModes > 0;

  const modeColumnMapped = Boolean(selectedColumns.mode);
  const subcategoryColumnMapped = Boolean(selectedColumns.subcategories);
  const tagColumnMapped = Boolean(selectedColumns.tags);
  const categoryStepLabel = isOrganizationScope ? "Step 2" : "Step 1";
  const counterpartyStepLabel = isOrganizationScope ? "Step 3" : "Step 2";
  const modeStepLabel = isOrganizationScope ? "Step 4" : "Step 3";
  const subcategoryStepLabel = isOrganizationScope ? "Step 5" : "Step 4";
  const tagStepLabel = isOrganizationScope ? "Step 6" : "Step 5";
  const previewStepLabel = isOrganizationScope ? "Step 7" : "Step 6";

  const resolvedPreviewRows = resolvedRows.slice(0, 10);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6">
      <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/10 via-background to-background py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="w-fit" variant="secondary">
                  Personal tools
                </Badge>
              </div>
              <CardTitle className="text-3xl tracking-tight">Manage import export</CardTitle>
              <p className="max-w-3xl text-sm text-muted-foreground">
                Upload an Excel expense sheet for the signed-in user, map the workbook headers you
                need, and then match categories, counterparties, and transaction modes that already
                exist in your account before import.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <a href={exportHref}>
                  <Download className="mr-2 size-4" />
                  Export workbook
                </a>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <ActionBanner error={parseState.error ?? importState.error} success={importState.success} />

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="py-2">
          <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
            <CardTitle className="text-2xl tracking-tight">Upload workbook</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 pb-6 sm:px-8 sm:pb-8">
            <form action={parseAction} className="space-y-4">
              <input type="hidden" name="scope" value={data.scope} />
              <div className="space-y-2">
                <Label htmlFor="workbook">Excel workbook</Label>
                <Input
                  id="workbook"
                  name="workbook"
                  type="file"
                  accept=".xlsx"
                  required
                  className="cursor-pointer"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="submit" disabled={parsePending} className="w-full sm:w-auto">
                  <FileUp className="mr-2 size-4" />
                  {parsePending ? "Reading workbook..." : "Upload and preview"}
                </Button>
                {preview ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw className="mr-2 size-4" />
                    Start over
                  </Button>
                ) : null}
              </div>
            </form>

            <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
              Upload a `.xlsx` file and then map each workbook header to the import field it should
              populate. Required fields must still be mapped, but the source column names can now be
              whatever your spreadsheet uses.
            </div>
          </CardContent>
        </Card>

        <Card className="py-2">
          <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
            <CardTitle className="text-2xl tracking-tight">Import rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-6 text-sm text-muted-foreground sm:px-8 sm:pb-8">
            <p>Column names are flexible. Map your workbook headers before reviewing the rows.</p>
            <p>Categories, counterparties, and modes must already exist in your account before you import.</p>
            <p>Every imported row is assigned to the signed-in user, so there is no user column or user mapping.</p>
            <p>If a sheet value does not match an existing category, counterparty, or mode, create it first in the app and then come back to map it.</p>
            <p>Mode rows are optional. If you do not map a mode column, expenses import without a transaction mode.</p>
            <p>Blank `necessity_score` defaults to 1.</p>
            <p>Category type comes from the mapped category record, not the spreadsheet `type` column.</p>
            <p>
              Duplicate rows are rejected when `amount`, `user_id`, `category_id`, `note`, and
              `transactionTimestamp` all match an existing expense.
            </p>
            <p>Imports are atomic, so any bad row stops the whole batch.</p>
          </CardContent>
        </Card>
      </section>

      {preview ? (
        <>
          <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <Card className="py-2">
              <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
                <CardTitle className="text-2xl tracking-tight">Workbook preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-6 sm:px-8 sm:pb-8">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">File</p>
                    <p className="mt-2 break-all text-sm font-medium">{preview.fileName}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Rows</p>
                    <p className="mt-2 text-sm font-medium">{preview.totalRows}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Headers</p>
                    <p className="mt-2 text-sm font-medium">{preview.headers.length}</p>
                  </div>
                </div>

                {preview.warnings.length ? (
                  <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-800 dark:text-amber-300">
                    <p className="mb-2 font-medium">Preview warnings</p>
                    <ul className="list-disc space-y-1 pl-5">
                      {preview.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="rounded-lg border bg-background/70 p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Detected raw headers</p>
                  <p className="mt-1 break-words">{preview.headers.join(" • ") || "—"}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="py-2">
              <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
                <CardTitle className="text-2xl tracking-tight">Coverage check</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-6 sm:px-8 sm:pb-8">
                <div className={`grid gap-3 ${isOrganizationScope ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
                  {isOrganizationScope ? (
                    <div className="rounded-lg border bg-muted/20 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Users</p>
                      <p className="mt-2 text-sm font-medium">
                        {unresolvedUsers === 0 ? "All mapped" : `${unresolvedUsers} need review`}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border bg-muted/20 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">User</p>
                      <p className="mt-2 text-sm font-medium">{data.currentUser.name}</p>
                    </div>
                  )}
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Counterparties</p>
                    <p className="mt-2 text-sm font-medium">
                      {unresolvedCounterparties === 0
                        ? "All mapped"
                        : `${unresolvedCounterparties} need review`}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Categories</p>
                    <p className="mt-2 text-sm font-medium">
                      {unresolvedCategories === 0 ? "All mapped" : `${unresolvedCategories} need review`}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Modes</p>
                    <p className="mt-2 text-sm font-medium">
                      {modeColumnMapped
                        ? unresolvedModes === 0
                          ? "All mapped"
                          : `${unresolvedModes} need review`
                        : "No mode column"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium">Category names in the sheet</p>
                  <div className="grid gap-2">
                    {categoryChecks.map((check) => (
                      <div
                        key={check.sheetValue}
                        className="flex flex-col gap-2 rounded-lg border bg-background/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="text-sm font-medium">{check.sheetValue}</span>
                        <SuggestionBadge
                          match={check.hasMatch}
                          isAmbiguous={check.isAmbiguous}
                          fallbackLabel="Missing"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {modeColumnMapped ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Mode names in the sheet</p>
                    <div className="grid gap-2">
                      {modeChecks.map((check) => (
                        <div
                          key={check.sheetValue}
                          className="flex flex-col gap-2 rounded-lg border bg-background/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <span className="text-sm font-medium">{check.sheetValue}</span>
                          <SuggestionBadge
                            match={check.hasMatch}
                            isAmbiguous={check.isAmbiguous}
                            fallbackLabel="Missing"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border bg-background/70 p-4 text-sm text-muted-foreground">
                      No mode column has been mapped yet. The import will use your default
                      transaction mode.
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6">
            <Card className="py-2">
              <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
                <CardTitle className="text-2xl tracking-tight">Review and map values</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8 px-4 pb-6 sm:px-8 sm:pb-8">
                <form action={importAction} className="space-y-8">
                  <input type="hidden" name="scope" value={data.scope} />
                  <input type="hidden" name="payload" value={payloadJson} />

                  <div className="space-y-4">
                    <SectionTitle
                      eyebrow="Step 0"
                      title="Map workbook columns"
                      description="Choose which workbook header should populate each expense field. Required fields must be mapped before import."
                    />
                    <div className="space-y-3 rounded-lg border bg-muted/15 p-4">
                      <div className="grid gap-3">
                        {fieldList.map((field) => {
                          const fieldConfig = IMPORT_WORKBOOK_FIELD_CONFIGS.find((item) => item.key === field);
                          if (!fieldConfig) return null;

                          return (
                            <div
                              key={field}
                              className="grid gap-3 rounded-lg border bg-background/70 p-3 md:grid-cols-[1fr_1.5fr_auto]"
                            >
                              <div className="space-y-1">
                                <p className="text-sm font-medium">{fieldConfig.label}</p>
                                <p className="text-xs text-muted-foreground">
                                  {fieldConfig.required ? "Required field" : "Optional field"}
                                </p>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`column_map_${field}`}>Workbook column</Label>
                                <select
                                  id={`column_map_${field}`}
                                  name={`column_map_${field}`}
                                  value={selectedColumns[field] ?? ""}
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    setColumnSelections((current) => ({
                                      ...current,
                                      [field]: value,
                                    }));
                                  }}
                                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                  required={fieldConfig.required}
                                >
                                  <option value="">
                                    {fieldConfig.required ? "Select a column" : "Not mapped"}
                                  </option>
                                  {availableHeaders.map((header) => (
                                    <option key={`${field}-${header}`} value={header}>
                                      {header}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex items-start">
                                <SuggestionBadge
                                  match={Boolean(preview.suggestedColumnMappings[field] && selectedColumns[field] === preview.suggestedColumnMappings[field])}
                                  isAmbiguous={false}
                                  fallbackLabel={
                                    preview.suggestedColumnMappings[field]
                                      ? `Suggested: ${preview.suggestedColumnMappings[field]}`
                                      : "Needs mapping"
                                  }
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {isOrganizationScope ? (
                    <div className="space-y-4">
                      <SectionTitle
                        eyebrow="Step 1"
                        title="Map users"
                        description="Each distinct sheet user name must be linked to one existing DB user before import."
                      />

                      <div className="space-y-3 rounded-lg border bg-muted/15 p-4">
                        <div className="grid gap-3">
                          {userMappings.map((mapping, index) => {
                            const currentValue =
                              userSelections[normalizeWorkbookName(mapping.sheetValue)] ?? mapping.defaultValue;

                            return (
                              <div
                                key={mapping.sheetValue}
                                className="grid gap-3 rounded-lg border bg-background/70 p-3 md:grid-cols-[1fr_1.5fr_auto]"
                              >
                                <div className="space-y-1">
                                  <p className="text-sm font-medium">{mapping.sheetValue}</p>
                                  <p className="text-xs text-muted-foreground">sheet user_name value</p>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`user_map_${index}`}>Map to DB user</Label>
                                  <select
                                    id={`user_map_${index}`}
                                    name={`user_map_${index}`}
                                    value={currentValue}
                                    onChange={(event) => {
                                      const value = event.target.value;
                                      const key = normalizeWorkbookName(mapping.sheetValue);
                                      setUserSelections((current) => ({
                                        ...current,
                                        [key]: value,
                                      }));
                                    }}
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                    required
                                  >
                                    <option value="">Select a user</option>
                                    {membersSorted.map((member) => (
                                      <option key={member.id} value={member.id}>
                                        {member.name} ({member.email})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex items-start">
                                  <SuggestionBadge
                                    match={mapping.hasMatch}
                                    isAmbiguous={mapping.isAmbiguous}
                                    fallbackLabel="Needs review"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-4">
                    <SectionTitle
                      eyebrow={categoryStepLabel}
                      title="Map categories"
                      description="Choose an existing DB category for each distinct sheet category. If a sheet value is missing, create it in the app first and then return here."
                    />
                    <div className="space-y-3 rounded-lg border bg-muted/15 p-4">
                      <div className="grid gap-3">
                        {categoryMappings.map((mapping, index) => {
                          const currentValue =
                            categorySelections[normalizeWorkbookName(mapping.sheetValue)] ?? mapping.defaultValue;

                          return (
                            <div
                              key={mapping.sheetValue}
                              className="grid gap-3 rounded-lg border bg-background/70 p-3 md:grid-cols-[1fr_1.5fr_auto]"
                            >
                              <div className="space-y-1">
                                <p className="text-sm font-medium">{mapping.sheetValue}</p>
                                <p className="text-xs text-muted-foreground">sheet category value</p>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`category_map_${index}`}>Map to DB category</Label>
                                <select
                                  id={`category_map_${index}`}
                                  name={`category_map_${index}`}
                                  value={currentValue}
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    const key = normalizeWorkbookName(mapping.sheetValue);
                                    setCategorySelections((current) => ({
                                      ...current,
                                      [key]: value,
                                    }));
                                  }}
                                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                  required
                                  >
                                  <option value="">Select a category</option>
                                  {categoriesSorted.map((category) => (
                                    <option key={category.id} value={String(category.id)}>
                                      {category.name} ({category.type})
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex items-start">
                                <SuggestionBadge
                                  match={mapping.hasMatch}
                                  isAmbiguous={mapping.isAmbiguous}
                                  fallbackLabel="Missing"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <SectionTitle
                      eyebrow={counterpartyStepLabel}
                      title="Map counterparties"
                      description="Choose an existing DB counterparty for each distinct sheet value. If a sheet value is missing, create it in the app first and then return here."
                    />
                    <div className="space-y-3 rounded-lg border bg-muted/15 p-4">
                      <div className="grid gap-3">
                        {counterpartyMappings.map((mapping, index) => {
                          const currentValue =
                            counterpartySelections[normalizeWorkbookName(mapping.sheetValue)] ??
                            mapping.defaultValue;

                          return (
                            <div
                              key={mapping.sheetValue}
                              className="grid gap-3 rounded-lg border bg-background/70 p-3 md:grid-cols-[1fr_1.5fr_auto]"
                            >
                              <div className="space-y-1">
                                <p className="text-sm font-medium">{mapping.sheetValue}</p>
                                <p className="text-xs text-muted-foreground">sheet counter_party_name value</p>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`counterparty_map_${index}`}>Map to DB counterparty</Label>
                                <select
                                  id={`counterparty_map_${index}`}
                                  name={`counterparty_map_${index}`}
                                  value={currentValue}
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    const key = normalizeWorkbookName(mapping.sheetValue);
                                    setCounterpartySelections((current) => ({
                                      ...current,
                                      [key]: value,
                                    }));
                                  }}
                                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                  required
                                  >
                                  <option value="">Select a counterparty</option>
                                  {counterpartiesSorted.map((counterparty) => (
                                    <option key={counterparty.id} value={String(counterparty.id)}>
                                      {counterparty.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex items-start">
                                <SuggestionBadge
                                  match={mapping.hasMatch}
                                  isAmbiguous={mapping.isAmbiguous}
                                  fallbackLabel="Missing"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {modeColumnMapped ? (
                    <div className="space-y-4">
                    <SectionTitle
                      eyebrow={modeStepLabel}
                      title="Map modes"
                      description="Each distinct sheet mode must match an existing transaction mode. If a sheet value is missing, create it in the app first and then return here."
                    />
                      <div className="space-y-3 rounded-lg border bg-muted/15 p-4">
                        <div className="grid gap-3">
                          {modeMappings.map((mapping, index) => {
                            const currentValue =
                              modeSelections[normalizeWorkbookName(mapping.sheetValue)] ?? mapping.defaultValue;

                            return (
                              <div
                                key={mapping.sheetValue}
                                className="grid gap-3 rounded-lg border bg-background/70 p-3 md:grid-cols-[1fr_1.5fr_auto]"
                              >
                                <div className="space-y-1">
                                  <p className="text-sm font-medium">{mapping.sheetValue}</p>
                                  <p className="text-xs text-muted-foreground">sheet mode value</p>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`mode_map_${index}`}>Map to DB mode</Label>
                                  <select
                                    id={`mode_map_${index}`}
                                    name={`mode_map_${index}`}
                                    value={currentValue}
                                    onChange={(event) => {
                                      const value = event.target.value;
                                      const key = normalizeWorkbookName(mapping.sheetValue);
                                      setModeSelections((current) => ({
                                        ...current,
                                        [key]: value,
                                      }));
                                    }}
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                    required
                                  >
                                  <option value="">Select a mode</option>
                                    <optgroup label="Existing modes">
                                      {transactionModesSorted.map((mode) => (
                                        <option key={mode.id} value={String(mode.id)}>
                                          {mode.name}
                                        </option>
                                      ))}
                                    </optgroup>
                                  </select>
                                </div>
                                <div className="flex items-start">
                                  <SuggestionBadge
                                    match={mapping.hasMatch}
                                    isAmbiguous={mapping.isAmbiguous}
                                    fallbackLabel="Missing"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border bg-muted/15 p-4 text-sm text-muted-foreground">
                      No mode column is mapped, so each row will use your default transaction mode.
                    </div>
                  )}

                  {subcategoryColumnMapped ? (
                    <div className="space-y-4">
                      <SectionTitle
                        eyebrow={subcategoryStepLabel}
                        title="Map subcategories"
                        description="Sheet subcategories are matched to your existing subcategories by name within the row's category. Any subcategory that doesn't already exist will be created automatically during import — no action needed here."
                      />
                      <div className="space-y-3 rounded-lg border bg-muted/15 p-4">
                        <div className="grid gap-3">
                          {subcategoryChecks.map((check) => (
                            <div
                              key={`${check.categoryName}:${check.sheetValue}`}
                              className="flex items-center justify-between gap-3 rounded-lg border bg-background/70 p-3"
                            >
                              <div className="space-y-1">
                                <p className="text-sm font-medium">{check.sheetValue}</p>
                                <p className="text-xs text-muted-foreground">
                                  sheet subcategory value · category: {check.categoryName}
                                </p>
                              </div>
                              <Badge variant={check.hasMatch ? "success" : "outline"} className="shrink-0">
                                {check.hasMatch ? "Matched" : "Will be created"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border bg-muted/15 p-4 text-sm text-muted-foreground">
                      No subcategories column is mapped, so imported expenses will not have subcategories.
                    </div>
                  )}

                  {tagColumnMapped ? (
                    <div className="space-y-4">
                      <SectionTitle
                        eyebrow={tagStepLabel}
                        title="Map tags"
                        description="Sheet tags are matched to your existing tags by name. Any tag that doesn't already exist will be created automatically during import — no action needed here."
                      />
                      <div className="space-y-3 rounded-lg border bg-muted/15 p-4">
                        <div className="grid gap-3">
                          {tagChecks.map((check) => (
                            <div
                              key={check.sheetValue}
                              className="flex items-center justify-between gap-3 rounded-lg border bg-background/70 p-3"
                            >
                              <div className="space-y-1">
                                <p className="text-sm font-medium">{check.sheetValue}</p>
                                <p className="text-xs text-muted-foreground">sheet tag value</p>
                              </div>
                              <Badge variant={check.hasMatch ? "success" : "outline"} className="shrink-0">
                                {check.hasMatch ? "Matched" : "Will be created"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border bg-muted/15 p-4 text-sm text-muted-foreground">
                      No tags column is mapped, so imported expenses will not have tags.
                    </div>
                  )}

                  <div className="space-y-4">
                    <SectionTitle
                      eyebrow={previewStepLabel}
                      title="Preview rows"
                      description="These are the first rows from the workbook after your column mappings and value mappings are applied."
                    />

                    <div className="overflow-x-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Row</TableHead>
                            {fieldList.map((field) => (
                              <TableHead key={field}>
                                {IMPORT_WORKBOOK_FIELD_CONFIGS.find((item) => item.key === field)?.label ?? field}
                              </TableHead>
                            ))}
                            <TableHead>Issues</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {resolvedPreviewRows.map((row) => (
                            <TableRow key={row.rowNumber}>
                              <TableCell className="font-medium">{row.rowNumber}</TableCell>
                              {fieldList.map((field) => (
                                <TableCell key={field}>{row.displayValues[field] || "—"}</TableCell>
                              ))}
                              <TableCell className="max-w-64">
                                {row.issues.length ? row.issues.join(", ") : "OK"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border border-primary/15 bg-primary/5 p-4">
                    <div className="flex items-start gap-3">
                      <ShieldAlert className="mt-0.5 size-5 shrink-0 text-primary" />
                      <div className="space-y-1">
                        <p className="font-medium">Ready to import</p>
                        <p className="text-sm text-muted-foreground">
                          The import runs in a single transaction. If any mapping or row fails,
                          nothing is written to the database. Missing categories, counterparties,
                          or modes must be created first.
                        </p>
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={importPending || hasUnresolvedLookups}
                      className="w-full sm:w-auto"
                    >
                      {importPending
                        ? "Importing..."
                        : hasUnresolvedLookups
                          ? "Resolve lookup values first"
                          : `Import ${preview.totalRows} row${preview.totalRows === 1 ? "" : "s"}`}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </section>
        </>
      ) : (
        <Card className="py-2">
          <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
            <CardTitle className="text-2xl tracking-tight">What happens next</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-6 text-sm text-muted-foreground sm:px-8 sm:pb-8">
            Upload a workbook to start the preview and mapping flow.
          </CardContent>
        </Card>
      )}
    </main>
  );
}
