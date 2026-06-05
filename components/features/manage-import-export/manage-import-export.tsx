"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Download, FileUp, RefreshCw, ShieldAlert } from "lucide-react";
import {
  importExpensesFromWorkbookAction,
  parseImportWorkbookAction,
} from "@/app/actions/auth-roles/manage-import-export.actions";
import {
  IMPORT_WORKBOOK_FIELDS,
  IMPORT_WORKBOOK_FIELD_CONFIGS,
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
type RowContext = {
  rowNumber: number;
  userName: string;
};

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

  return `${preview.fileName}|${preview.totalRows}|${preview.headers.join("|")}`;
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

function formatModeLabel(mode: { name: string; userName: string }) {
  return `${mode.name} (${mode.userName})`;
}

function formatCreateModeLabel(sheetValue: string, context: RowContext | null) {
  if (!context) {
    return `Create new "${sheetValue}" mode`;
  }

  return `Create new "${sheetValue}" mode for row ${context.rowNumber} (${context.userName})`;
}

function isCreateModeSelection(value: string) {
  return value === "__create__" || value.startsWith("create:");
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

export function ManageImportExport({ data }: { data: ManageImportExportDataDto }) {
  const [parseState, parseAction, parsePending] = useActionState(
    parseImportWorkbookAction,
    manageImportExportInitialState
  );
  const [importState, importAction, importPending] = useActionState(
    importExpensesFromWorkbookAction,
    manageImportExportInitialState
  );
  const [columnSelections, setColumnSelections] = useState<ColumnSelections>({});
  const [userSelections, setUserSelections] = useState<ValueSelectionMap>({});
  const [counterpartySelections, setCounterpartySelections] = useState<ValueSelectionMap>({});
  const [categorySelections, setCategorySelections] = useState<ValueSelectionMap>({});
  const [categoryTypeSelections, setCategoryTypeSelections] = useState<ValueSelectionMap>({});
  const [modeSelections, setModeSelections] = useState<ValueSelectionMap>({});
  const initializedPreviewKey = useRef("");

  const preview = importState.preview ?? parseState.preview;
  const payloadJson = preview ? JSON.stringify(preview) : "";

  useEffect(() => {
    const nextKey = buildPreviewKey(preview);
    if (!preview || initializedPreviewKey.current === nextKey) {
      return;
    }

    initializedPreviewKey.current = nextKey;
    const timeoutId = window.setTimeout(() => {
      const nextColumnSelections = {} as ColumnSelections;
      for (const field of IMPORT_WORKBOOK_FIELDS) {
        nextColumnSelections[field] = preview.suggestedColumnMappings[field] ?? "";
      }

      setColumnSelections(nextColumnSelections);
      setUserSelections({});
      setCounterpartySelections({});
      setCategorySelections({});
      setCategoryTypeSelections({});
      setModeSelections({});
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [preview]);

  const headerIndex = useMemo(() => {
    if (!preview) {
      return new Map<string, number>();
    }

    return buildWorkbookHeaderIndex(preview.headers);
  }, [preview]);

  const selectedColumns = useMemo(() => {
    const values = {} as Record<ImportWorkbookField, string>;
    for (const field of IMPORT_WORKBOOK_FIELDS) {
      values[field] = columnSelections[field] ?? preview?.suggestedColumnMappings[field] ?? "";
    }
    return values;
  }, [columnSelections, preview]);

  const availableHeaders = useMemo(() => {
    if (!preview) return [];
    return Array.from(new Set(preview.headers.filter((header) => header.trim().length > 0)));
  }, [preview]);

  const memberById = useMemo(
    () => new Map(data.members.map((member) => [member.id, member] as const)),
    [data.members]
  );
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
  const onlineModeByUserId = useMemo(() => {
    return new Map(
      data.transactionModes
        .filter((mode) => normalizeWorkbookName(mode.name) === "online")
        .map((mode) => [mode.userId, mode] as const)
    );
  }, [data.transactionModes]);
  const transactionModesSorted = useMemo(
    () => data.transactionModes.slice().sort(sortByModeName),
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

  const resolvedRows = useMemo(() => {
    if (!preview) return [];

    return preview.rows.map((row) => {
      const resolvedValues = {} as Record<ImportWorkbookField, string>;
      for (const field of IMPORT_WORKBOOK_FIELDS) {
        const selectedColumn = selectedColumns[field];
        resolvedValues[field] = selectedColumn
          ? resolveWorkbookRowValue(row.values, headerIndex, selectedColumn)
          : "";
      }

      const normalizedUserName = normalizeWorkbookName(resolvedValues.user_name);
      const normalizedCategoryName = normalizeWorkbookName(resolvedValues.category);
      const normalizedCounterpartyName = normalizeWorkbookName(resolvedValues.counter_party_name);
      const normalizedModeName = normalizeWorkbookName(resolvedValues.mode);
      const hasCategoryValue = resolvedValues.category.trim().length > 0;
      const hasCounterpartyValue = resolvedValues.counter_party_name.trim().length > 0;
      const hasModeValue = resolvedValues.mode.trim().length > 0;
      const hasUserValue = resolvedValues.user_name.trim().length > 0;

      const userMatch = findUniqueNormalizedMatch(data.members, resolvedValues.user_name);
      const selectedUserId = userSelections[normalizedUserName] ?? (hasUserValue ? userMatch.match?.id ?? "" : "");
      const resolvedUser = selectedUserId ? memberById.get(selectedUserId) : null;

      const categoryMatch = findUniqueNormalizedMatch(data.categories, resolvedValues.category);
      const selectedCategoryValue =
        categorySelections[normalizedCategoryName] ??
        (hasCategoryValue
          ? categoryMatch.match
            ? String(categoryMatch.match.id)
            : categoryMatch.isAmbiguous
              ? ""
              : "__create__"
          : "");
      const resolvedCategory =
        selectedCategoryValue && selectedCategoryValue !== "__create__"
          ? categoryById.get(selectedCategoryValue) ?? null
          : null;

      const counterpartyMatch = findUniqueNormalizedMatch(data.counterparties, resolvedValues.counter_party_name);
      const selectedCounterpartyValue =
        counterpartySelections[normalizedCounterpartyName] ??
        (hasCounterpartyValue
          ? counterpartyMatch.match
            ? String(counterpartyMatch.match.id)
            : counterpartyMatch.isAmbiguous
              ? ""
              : "__create__"
          : "");
      const resolvedCounterparty =
        selectedCounterpartyValue && selectedCounterpartyValue !== "__create__"
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
      const resolvedMode = selectedModeValue && !isCreateModeSelection(selectedModeValue)
        ? modeById.get(selectedModeValue) ?? null
        : null;
      const onlineMode = resolvedUser ? onlineModeByUserId.get(resolvedUser.id) ?? null : null;

      const displayValues: Record<ImportWorkbookField, string> = {
        amount: resolvedValues.amount,
        type: resolvedValues.type,
        scope: resolvedValues.scope.trim() || "personal",
        necessity_score: resolvedValues.necessity_score.trim() || "1",
        note: resolvedValues.note.trim() || "—",
        category:
          selectedCategoryValue === "__create__"
            ? resolvedValues.category
            : resolvedCategory?.name ?? resolvedValues.category,
        transactionTimestamp: resolvedValues.transactionTimestamp,
        user_name: resolvedUser ? resolvedUser.name : resolvedValues.user_name,
        counter_party_name:
          selectedCounterpartyValue === "__create__"
            ? resolvedValues.counter_party_name || "Create new counterparty"
            : (resolvedCounterparty?.name ?? resolvedValues.counter_party_name) || "—",
        mode: resolvedValues.mode
          ? isCreateModeSelection(selectedModeValue)
            ? resolvedValues.mode
            : resolvedMode?.name ?? resolvedValues.mode
          : onlineMode?.name ?? "Online",
      };

      return {
        rowNumber: row.rowNumber,
        values: resolvedValues,
        displayValues,
        issues: row.issues,
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
    memberById,
    categoryById,
    counterpartyById,
    modeById,
    onlineModeByUserId,
    data.categories,
    data.counterparties,
    data.members,
    data.transactionModes,
  ]);

  const distinctUserNames = useMemo(
    () => collectDistinctValues(resolvedRows, "user_name"),
    [resolvedRows]
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

  const modeContextsByName = useMemo(() => {
    const contexts = new Map<string, RowContext>();

    for (const row of resolvedRows) {
      const modeValue = row.values.mode.trim();
      if (!modeValue) continue;

      const normalizedModeName = normalizeWorkbookName(modeValue);
      if (contexts.has(normalizedModeName)) continue;

      contexts.set(normalizedModeName, {
        rowNumber: row.rowNumber,
        userName: row.displayValues.user_name.trim() || row.values.user_name.trim() || "—",
      });
    }

    return contexts;
  }, [resolvedRows]);

  const userMappings = useMemo(() => {
    return distinctUserNames.map((sheetValue) => {
      const match = findUniqueNormalizedMatch(data.members, sheetValue);
      return {
        sheetValue,
        defaultValue: match.match ? match.match.id : "",
        isAmbiguous: match.isAmbiguous,
        hasMatch: Boolean(match.match),
      };
    });
  }, [data.members, distinctUserNames]);

  const counterpartyMappings = useMemo(() => {
    return distinctCounterpartyNames.map((sheetValue) => {
      const match = findUniqueNormalizedMatch(data.counterparties, sheetValue);
      return {
        sheetValue,
        defaultValue: match.match ? String(match.match.id) : match.isAmbiguous ? "" : "__create__",
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
        defaultValue: match.match ? String(match.match.id) : "__create__",
        defaultType: match.match ? match.match.type : "expense",
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
        defaultValue: match.match ? String(match.match.id) : "__create__",
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

  const unresolvedUsers = userMappings.filter((mapping) => !mapping.hasMatch).length;
  const unresolvedCounterparties = counterpartyMappings.filter((mapping) => !mapping.hasMatch).length;
  const unresolvedCategories = categoryChecks.filter((check) => !check.hasMatch).length;
  const unresolvedModes = modeChecks.filter((check) => !check.hasMatch).length;

  const modeColumnMapped = Boolean(selectedColumns.mode);

  const resolvedPreviewRows = resolvedRows.slice(0, 10);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6">
      <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/10 via-background to-background py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <Badge className="w-fit" variant="secondary">
                Admin bulk tools
              </Badge>
              <CardTitle className="text-3xl tracking-tight">Manage Import Export</CardTitle>
              <p className="max-w-3xl text-sm text-muted-foreground">
                Upload an Excel expense sheet, map the workbook headers to the app fields you need,
                and then match users, categories, counterparties, and transaction modes before import.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <a href="/manage-import-export/export">
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
            <p>Categories can be matched to an existing record or created during import.</p>
            <p>Users must already exist in the database and are mapped explicitly.</p>
            <p>Counterparties are optional, and any provided values can be matched or created.</p>
            <p>Modes behave like categories and counterparties: exact matches can be selected, otherwise create a new mode.</p>
            <p>Blank `scope` defaults to personal and blank `necessity_score` defaults to 1.</p>
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
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Users</p>
                    <p className="mt-2 text-sm font-medium">
                      {unresolvedUsers === 0 ? "All mapped" : `${unresolvedUsers} need review`}
                    </p>
                  </div>
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
                        : "Using default modes"}
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
                            fallbackLabel="Create new"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border bg-background/70 p-4 text-sm text-muted-foreground">
                    No mode column has been mapped yet. The import will fall back to each user&apos;s
                    default transaction mode.
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
                  <input type="hidden" name="payload" value={payloadJson} />

                  <div className="space-y-4">
                    <SectionTitle
                      eyebrow="Step 0"
                      title="Map workbook columns"
                      description="Choose which workbook header should populate each expense field. Required fields must be mapped before import."
                    />
                    <div className="space-y-3 rounded-lg border bg-muted/15 p-4">
                      <div className="grid gap-3">
                        {IMPORT_WORKBOOK_FIELDS.map((field) => {
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

                  <div className="space-y-4">
                    <SectionTitle
                      eyebrow="Step 2"
                      title="Map categories"
                      description="Choose an existing DB category or create a new one using the exact sheet value for each distinct sheet category."
                    />
                    <div className="space-y-3 rounded-lg border bg-muted/15 p-4">
                      <div className="grid gap-3">
                        {categoryMappings.map((mapping, index) => {
                          const currentValue =
                            categorySelections[normalizeWorkbookName(mapping.sheetValue)] ?? mapping.defaultValue;
                          const currentType =
                            categoryTypeSelections[normalizeWorkbookName(mapping.sheetValue)] ??
                            mapping.defaultType;

                          return (
                            <div
                              key={mapping.sheetValue}
                              className="grid gap-3 rounded-lg border bg-background/70 p-3 md:grid-cols-[1fr_1.5fr_1fr_auto]"
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
                                  <option value="__create__">Create new &quot;{mapping.sheetValue}&quot; category</option>
                                  {categoriesSorted.map((category) => (
                                    <option key={category.id} value={String(category.id)}>
                                      {category.name} ({category.type})
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`category_type_map_${index}`}>New category type</Label>
                                <select
                                  id={`category_type_map_${index}`}
                                  name={`category_type_map_${index}`}
                                  value={currentType}
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    const key = normalizeWorkbookName(mapping.sheetValue);
                                    setCategoryTypeSelections((current) => ({
                                      ...current,
                                      [key]: value,
                                    }));
                                  }}
                                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                >
                                  <option value="expense">Expense</option>
                                  <option value="income">Income</option>
                                </select>
                              </div>
                              <div className="flex items-start">
                                <SuggestionBadge
                                  match={mapping.hasMatch}
                                  isAmbiguous={mapping.isAmbiguous}
                                  fallbackLabel="Create new"
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
                      eyebrow="Step 3"
                      title="Map counterparties"
                      description="Choose an existing DB counterparty or create a new one using the exact sheet value for each distinct sheet value."
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
                                  <option value="__create__">Create new &quot;{mapping.sheetValue}&quot; counterparty</option>
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
                                  fallbackLabel="Will create"
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
                        eyebrow="Step 4"
                        title="Map modes"
                        description="Each distinct sheet mode can match an existing transaction mode or create a new one using the exact sheet value."
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
                                    <optgroup label="Create a new mode">
                                      <option value="__create__">
                                        {formatCreateModeLabel(
                                          mapping.sheetValue,
                                          modeContextsByName.get(normalizeWorkbookName(mapping.sheetValue)) ?? null
                                        )}
                                      </option>
                                    </optgroup>
                                    <optgroup label="Existing modes">
                                      {transactionModesSorted.map((mode) => (
                                        <option key={mode.id} value={String(mode.id)}>
                                          {formatModeLabel(mode)}
                                        </option>
                                      ))}
                                    </optgroup>
                                  </select>
                                </div>
                                <div className="flex items-start">
                                  <SuggestionBadge
                                    match={mapping.hasMatch}
                                    isAmbiguous={mapping.isAmbiguous}
                                    fallbackLabel="Create new"
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
                      No mode column is mapped, so each row will use or create the selected user&apos;s
                      Online transaction mode.
                    </div>
                  )}

                  <div className="space-y-4">
                    <SectionTitle
                      eyebrow="Step 5"
                      title="Preview rows"
                      description="These are the first rows from the workbook after your column mappings and value mappings are applied."
                    />

                    <div className="overflow-x-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Row</TableHead>
                            {IMPORT_WORKBOOK_FIELDS.map((field) => (
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
                              {IMPORT_WORKBOOK_FIELDS.map((field) => (
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
                          nothing is written to the database.
                        </p>
                      </div>
                    </div>
                    <Button type="submit" disabled={importPending} className="w-full sm:w-auto">
                      {importPending
                        ? "Importing..."
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
