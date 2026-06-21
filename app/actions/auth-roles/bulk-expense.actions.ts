"use server";

import { randomUUID } from "crypto";
import { requireUser } from "@/app/lib/auth";
import { parseWorkbookBuffer } from "@/app/lib/manage-import-export.workbook";
import { normalizeWorkbookName } from "@/app/lib/manage-import-export.shared";
import { getCategoriesByOrg } from "@/app/actions/tables/categories.table.actions";
import { getSubcategoriesByOrg } from "@/app/actions/tables/subcategories.table.actions";
import { getCounterpartiesByOrg } from "@/app/actions/tables/counterparties.table.actions";
import { getTagsByOrg } from "@/app/actions/tables/tags.table.actions";
import { ensureDefaultTransactionModesForUser } from "@/app/actions/tables/transaction-modes.table.actions";
import { getCategoryById } from "@/app/actions/tables/categories.table.actions";
import { getCounterpartyById } from "@/app/actions/tables/counterparties.table.actions";
import { getTransactionModeById } from "@/app/actions/tables/transaction-modes.table.actions";
import { createExpenseRecord } from "@/app/actions/tables/expenses.table.actions";
import { setTransactionTags } from "@/app/actions/tables/tags.table.actions";
import { toExpenseDateInputValue, parseExpenseDate } from "@/app/lib/expense-date";
import type { BulkAddRowDto, BulkCreateInput } from "@/app/lib/bulk-expense.types";
import type { ImportWorkbookField } from "@/app/lib/manage-import-export.types";
import type { ImportWorkbookRow, ImportWorkbookPreview } from "@/app/lib/manage-import-export.types";

// ─── helpers (mirrors private functions in manage-import-export.actions.ts) ───

function parseAmount(value: string): string {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`Invalid amount: ${value}`);
  return parsed.toFixed(2);
}

function parseNecessityScore(value: string): number {
  if (!value.trim()) return 0;
  const parsed = Number.parseInt(value, 10);
  if (parsed !== -1 && parsed !== 0 && parsed !== 1) throw new Error(`Invalid necessity_score: "${value}". Must be -1, 0, or 1`);
  return parsed;
}

function parseTransactionDate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Date is required");

  const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (ymdMatch) return trimmed;

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid date: ${value}`);
  return toExpenseDateInputValue(new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate())));
}

function parseTagNames(value: string): string[] {
  return Array.from(
    new Set(
      value.split(",").map((p) => p.trim()).filter((p) => p.length > 0)
    )
  );
}

function parseNote(value: string): string {
  return value.trim();
}

function getFieldValue(
  preview: ImportWorkbookPreview,
  row: ImportWorkbookRow,
  field: ImportWorkbookField
): string {
  const headerName = preview.suggestedColumnMappings[field];
  if (!headerName) return "";
  const idx = preview.headers.indexOf(headerName);
  if (idx < 0) return "";
  return row.values[idx] ?? "";
}

// ─── Server Actions ───────────────────────────────────────────────────────────

export async function parseBulkAddWorkbookAction(
  formData: FormData
): Promise<{ rows: BulkAddRowDto[]; error?: string }> {
  const currentUser = await requireUser();
  if (!currentUser.orgId) return { rows: [], error: "Join an organization first" };

  const orgId = currentUser.orgId;
  const file = formData.get("file");
  if (!(file instanceof File) || !file.name.endsWith(".xlsx")) {
    return { rows: [], error: "Please upload a valid .xlsx file" };
  }

  let preview: ImportWorkbookPreview;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    preview = parseWorkbookBuffer(buffer, file.name, "user");
  } catch (err) {
    return { rows: [], error: err instanceof Error ? err.message : "Failed to parse file" };
  }

  const [categories, subcategories, counterparties, tags, modes] = await Promise.all([
    getCategoriesByOrg(orgId),
    getSubcategoriesByOrg(orgId),
    getCounterpartiesByOrg(orgId),
    getTagsByOrg(orgId),
    ensureDefaultTransactionModesForUser(orgId, currentUser.id),
  ]);

  const defaultMode = modes.find((m) => m.isDefault) ?? modes[0] ?? null;

  // Normalised name → record lookup maps
  const categoryByName = new Map(categories.map((c) => [normalizeWorkbookName(c.name), c]));
  const subcategoryByName = new Map(subcategories.map((s) => [normalizeWorkbookName(s.name), s]));
  const counterpartyByName = new Map(counterparties.map((cp) => [normalizeWorkbookName(cp.name), cp]));
  const tagByName = new Map(tags.map((t) => [normalizeWorkbookName(t.name), t]));
  const modeByName = new Map(modes.map((m) => [normalizeWorkbookName(m.name), m]));

  const rows: BulkAddRowDto[] = preview.rows.map((row) => {
    const issues: string[] = [];

    // Date
    const rawDate = getFieldValue(preview, row, "transactionTimestamp");
    let date = "";
    try {
      date = rawDate ? parseTransactionDate(rawDate) : toExpenseDateInputValue(new Date());
    } catch {
      issues.push(`Row ${row.rowNumber}: invalid date "${rawDate}"`);
      date = toExpenseDateInputValue(new Date());
    }

    // Amount
    const rawAmount = getFieldValue(preview, row, "amount");
    let amount = "";
    try {
      amount = rawAmount ? parseAmount(rawAmount) : "";
    } catch {
      issues.push(`Row ${row.rowNumber}: invalid amount "${rawAmount}"`);
    }

    // Necessity
    const rawNecessity = getFieldValue(preview, row, "necessity_score");
    let necessityScore = 1;
    try {
      necessityScore = parseNecessityScore(rawNecessity);
    } catch {
      issues.push(`Row ${row.rowNumber}: invalid necessity_score "${rawNecessity}"`);
    }

    // Note
    const note = parseNote(getFieldValue(preview, row, "note"));

    // Category
    const rawCategory = getFieldValue(preview, row, "category").trim();
    const resolvedCategory = rawCategory ? categoryByName.get(normalizeWorkbookName(rawCategory)) ?? null : null;
    if (rawCategory && !resolvedCategory) {
      issues.push(`Category "${rawCategory}" not found in your organization`);
    }

    // Subcategory
    const rawSub = getFieldValue(preview, row, "subcategories").trim();
    let resolvedSubId: number | null = null;
    if (rawSub && resolvedCategory) {
      const sub = subcategoryByName.get(normalizeWorkbookName(rawSub));
      if (sub && sub.categoryId === resolvedCategory.id) resolvedSubId = sub.id;
      else if (rawSub) issues.push(`Subcategory "${rawSub}" not found under "${rawCategory}"`);
    }

    // Mode
    const rawMode = getFieldValue(preview, row, "mode").trim();
    const resolvedMode = rawMode ? (modeByName.get(normalizeWorkbookName(rawMode)) ?? null) : null;
    const finalMode = resolvedMode ?? defaultMode;

    // Counterparty
    const rawCp = getFieldValue(preview, row, "counter_party_name").trim();
    const resolvedCp = rawCp ? (counterpartyByName.get(normalizeWorkbookName(rawCp)) ?? null) : null;
    if (rawCp && !resolvedCp) {
      issues.push(`Counterparty "${rawCp}" not found`);
    }

    // Tags
    const rawTags = getFieldValue(preview, row, "tags");
    const tagNames = parseTagNames(rawTags);
    const tagIds = tagNames
      .map((name) => tagByName.get(normalizeWorkbookName(name))?.id)
      .filter((id): id is number => id !== undefined);
    const unresolvedTags = tagNames.filter((name) => !tagByName.has(normalizeWorkbookName(name)));
    if (unresolvedTags.length) issues.push(`Tags not found: ${unresolvedTags.join(", ")}`);

    return {
      clientId: randomUUID(),
      date,
      amount,
      categoryId: resolvedCategory?.id ?? null,
      categoryName: rawCategory,
      subcategoryId: resolvedSubId,
      subcategoryName: rawSub,
      modeId: finalMode?.id ?? null,
      modeName: finalMode?.name ?? rawMode,
      counterPartyId: resolvedCp?.id ?? null,
      counterPartyName: rawCp,
      note,
      tagIds,
      necessityScore,
      issues,
    };
  });

  return { rows };
}

export async function bulkCreateExpenseAction(
  input: BulkCreateInput
): Promise<{ success: boolean; error?: string }> {
  const currentUser = await requireUser();
  if (!currentUser.orgId) return { success: false, error: "Join an organization first" };

  const orgId = currentUser.orgId;

  const [category, mode] = await Promise.all([
    getCategoryById(input.categoryId),
    getTransactionModeById(input.transactionModeId),
  ]);

  if (!category || category.orgId !== orgId) return { success: false, error: "Category not found" };
  if (!mode || mode.userId !== currentUser.id) return { success: false, error: "Transaction mode not found" };

  let counterPartyId: number | null = null;
  if (input.counterPartyId) {
    const cp = await getCounterpartyById(input.counterPartyId);
    if (cp && cp.orgId === orgId) counterPartyId = cp.id;
  }

  let subcategoryId: number | null = null;
  if (input.subcategoryId) {
    const subs = await getSubcategoriesByOrg(orgId);
    const sub = subs.find((s) => s.id === input.subcategoryId && s.categoryId === input.categoryId);
    if (sub) subcategoryId = sub.id;
  }

  const orgTags = await getTagsByOrg(orgId);
  const validTagIds = new Set(orgTags.map((t) => t.id));
  const tagIds = input.tagIds.filter((id) => validTagIds.has(id));

  const expense = await createExpenseRecord({
    orgId,
    userId: currentUser.id,
    categoryId: input.categoryId,
    counterPartyId,
    transactionModeId: input.transactionModeId,
    subcategoryId,
    transferStatus: counterPartyId ? "open" : null,
    amount: input.amount,
    type: category.type,
    necessityScore: input.necessityScore,
    note: input.note,
    occurredAt: parseExpenseDate(input.occurredAt),
  });

  if (!expense) return { success: false, error: "Failed to create transaction" };
  if (tagIds.length) await setTransactionTags(expense.id, tagIds);

  return { success: true };
}
