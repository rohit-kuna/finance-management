"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Download, Upload, X } from "lucide-react";
import { parseBulkAddWorkbookAction, bulkCreateExpenseAction } from "@/app/actions/auth-roles/bulk-expense.actions";
import { CategorySubcategorySelect } from "@/components/features/expenses/category-subcategory-select";
import { TagMultiSelect } from "@/components/features/expenses/tag-multiselect";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BulkAddRowDto } from "@/app/lib/bulk-expense.types";
import type {
  CategoryRecordDto,
  CounterpartyRecordDto,
  SubcategoryRecordDto,
  TagRecordDto,
  TransactionModeRecordDto,
} from "@/app/lib/finance.types";

// ─── Required column label helper ────────────────────────────────────────────

function Req() {
  return <span className="ml-0.5 text-destructive">*</span>;
}

// ─── BulkAddRow ───────────────────────────────────────────────────────────────

function BulkAddRow({
  row,
  categories,
  subcategories,
  counterparties,
  transactionModes,
  tags,
  onRemove,
  onSaved,
}: {
  row: BulkAddRowDto;
  categories: CategoryRecordDto[];
  subcategories: SubcategoryRecordDto[];
  counterparties: CounterpartyRecordDto[];
  transactionModes: TransactionModeRecordDto[];
  tags: TagRecordDto[];
  onRemove: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [categoryId, setCategoryId] = useState<number>(row.categoryId ?? 0);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(row.subcategoryId);
  const [amount, setAmount] = useState(row.amount);
  const [note, setNote] = useState(row.note);
  const [necessity, setNecessity] = useState(String(row.necessityScore));
  const [date, setDate] = useState(row.date);
  const [modeId, setModeId] = useState(String(row.modeId ?? transactionModes[0]?.id ?? ""));
  const [counterPartyId, setCounterPartyId] = useState(String(row.counterPartyId ?? ""));
  const [tagIds, setTagIds] = useState<number[]>(row.tagIds);

  const inferredType = categories.find((c) => c.id === categoryId)?.type ?? null;

  const isValid =
    date.trim() !== "" &&
    Number(amount) > 0 &&
    categoryId > 0 &&
    modeId !== "" &&
    [-1, 0, 1].includes(Number(necessity));

  function handleSave() {
    if (!isValid) return;
    setError(null);

    startTransition(async () => {
      const result = await bulkCreateExpenseAction({
        categoryId,
        subcategoryId,
        transactionModeId: Number(modeId),
        counterPartyId: counterPartyId ? Number(counterPartyId) : null,
        amount,
        necessityScore: Number(necessity),
        note: note.trim() || null,
        tagIds,
        occurredAt: date,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      router.refresh();
      onSaved();
    });
  }

  const selectClass = "h-8 w-full rounded-md border border-input bg-background px-2 text-sm";

  return (
    <TableRow className="bg-muted/10 align-top hover:bg-muted/10">
      {/* Date */}
      <TableCell className="min-w-32 py-2">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 w-full" />
      </TableCell>

      {/* Amount */}
      <TableCell className="min-w-24 py-2">
        <Input
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-8 w-24"
        />
      </TableCell>

      {/* Type */}
      <TableCell className="py-2">
        {inferredType ? (
          <Badge variant={inferredType === "income" ? "default" : "secondary"}>{inferredType}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Category > Subcategory */}
      <TableCell className="min-w-55 py-2">
        <CategorySubcategorySelect
          categories={categories}
          subcategories={subcategories}
          defaultCategoryId={categoryId}
          defaultSubcategoryId={subcategoryId}
          onCategoryChange={(id) => {
            setCategoryId(id);
            setSubcategoryId(null);
          }}
          onSubcategoryChange={setSubcategoryId}
        />
        {row.categoryName && categoryId === 0 ? (
          <p className="mt-0.5 text-xs text-destructive">"{row.categoryName}" not found</p>
        ) : null}
      </TableCell>

      {/* Note */}
      <TableCell className="min-w-35 py-2">
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note…" className="h-8 w-full" />
      </TableCell>

      {/* Tags */}
      <TableCell className="min-w-40 py-2">
        <TagMultiSelect tags={tags} defaultSelectedTagIds={tagIds} onTagsChange={setTagIds} />
      </TableCell>

      {/* Mode */}
      <TableCell className="min-w-27.5 py-2">
        <select value={modeId} onChange={(e) => setModeId(e.target.value)} className={selectClass}>
          {transactionModes.map((mode) => (
            <option key={mode.id} value={String(mode.id)}>
              {mode.name}
            </option>
          ))}
        </select>
      </TableCell>

      {/* Necessity */}
      <TableCell className="min-w-16 py-2">
        <select value={necessity} onChange={(e) => setNecessity(e.target.value)} className={selectClass}>
          <option value="-1">Optional</option>
          <option value="0">Default</option>
          <option value="1">Important</option>
        </select>
      </TableCell>

      {/* Counterparty */}
      <TableCell className="min-w-30 py-2">
        <select value={counterPartyId} onChange={(e) => setCounterPartyId(e.target.value)} className={selectClass}>
          <option value="">None</option>
          {counterparties.map((cp) => (
            <option key={cp.id} value={String(cp.id)}>
              {cp.name}
            </option>
          ))}
        </select>
      </TableCell>

      {/* Actions */}
      <TableCell className="py-2">
        <div className="flex flex-col gap-1">
          {error && <p className="text-xs text-destructive">{error}</p>}
          {row.issues.length > 0 && !error && (
            <p className="text-xs text-amber-500">{row.issues[0]}</p>
          )}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="icon-sm"
              onClick={handleSave}
              disabled={!isValid || pending}
              title={isValid ? "Save" : "Fill required fields to save"}
              aria-label="Save"
            >
              {pending ? <Spinner className="size-3" /> : <Check className="size-4" />}
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              onClick={onRemove}
              disabled={pending}
              title="Remove row"
              aria-label="Remove"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── BulkAddSection ───────────────────────────────────────────────────────────

export function BulkAddSection({
  categories,
  subcategories,
  counterparties,
  transactionModes,
  tags,
  onClose,
}: {
  categories: CategoryRecordDto[];
  subcategories: SubcategoryRecordDto[];
  counterparties: CounterpartyRecordDto[];
  transactionModes: TransactionModeRecordDto[];
  tags: TagRecordDto[];
  onClose: () => void;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<BulkAddRowDto[]>([]);
  const [parsing, startParsing] = useTransition();
  const [savingAll, startSavingAll] = useTransition();
  const [parseError, setParseError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);

    const formData = new FormData();
    formData.append("file", file);

    startParsing(async () => {
      const result = await parseBulkAddWorkbookAction(formData);
      if (result.error) {
        setParseError(result.error);
        return;
      }
      setRows(result.rows);
    });

    // Reset input so the same file can be re-uploaded
    e.target.value = "";
  }

  function removeRow(clientId: string) {
    setRows((current) => current.filter((r) => r.clientId !== clientId));
  }

  function handleRowSaved(clientId: string) {
    setRows((current) => current.filter((r) => r.clientId !== clientId));
  }

  function isRowValid(row: BulkAddRowDto) {
    return (
      row.date.trim() !== "" &&
      Number(row.amount) > 0 &&
      (row.categoryId ?? 0) > 0 &&
      (row.modeId ?? 0) > 0 &&
      [-1, 0, 1].includes(row.necessityScore)
    );
  }

  function handleSaveAll() {
    startSavingAll(async () => {
      const validRows = rows.filter(isRowValid);
      const results = await Promise.allSettled(
        validRows.map((row) =>
          bulkCreateExpenseAction({
            categoryId: row.categoryId!,
            subcategoryId: row.subcategoryId,
            transactionModeId: row.modeId!,
            counterPartyId: row.counterPartyId,
            amount: row.amount,
            necessityScore: row.necessityScore,
            note: row.note.trim() || null,
            tagIds: row.tagIds,
            occurredAt: row.date,
          })
        )
      );

      const savedClientIds = new Set(
        validRows
          .filter((_, i) => {
            const r = results[i];
            return r?.status === "fulfilled" && r.value.success;
          })
          .map((r) => r.clientId)
      );

      setRows((current) => current.filter((r) => !savedClientIds.has(r.clientId)));
      if (savedClientIds.size > 0) router.refresh();
    });
  }

  const validCount = rows.filter(isRowValid).length;

  return (
    <Card className="py-2">
      <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-2xl tracking-tight">Bulk Add Transactions</CardTitle>
            <p className="text-sm text-muted-foreground">
              Upload an Excel file — each row becomes an editable transaction. Save rows individually or all at once.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            <X className="mr-2 size-4" />
            Cancel
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-4 pb-6 sm:px-8 sm:pb-8">
        {/* Upload + template */}
        <div className="flex flex-wrap items-center gap-3">
          <a href="/transactions/template" download>
            <Button type="button" variant="outline" size="sm">
              <Download className="mr-2 size-4" />
              Download Template
            </Button>
          </a>

          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={parsing}
            onClick={() => fileInputRef.current?.click()}
          >
            {parsing ? (
              <>
                <Spinner className="mr-2 size-4" />
                Parsing…
              </>
            ) : (
              <>
                <Upload className="mr-2 size-4" />
                {rows.length ? "Replace File" : "Upload Excel (.xlsx)"}
              </>
            )}
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={handleFileChange}
          />

          {parseError && <p className="text-sm text-destructive">{parseError}</p>}

          {rows.length > 0 && (
            <>
              <Badge variant="secondary">{rows.length} rows</Badge>
              <Button
                type="button"
                size="sm"
                disabled={validCount === 0 || savingAll}
                onClick={handleSaveAll}
              >
                {savingAll ? (
                  <><Spinner className="mr-2 size-4" />Saving…</>
                ) : (
                  `Save all valid (${validCount})`
                )}
              </Button>
            </>
          )}
        </div>

        {/* Pending rows table */}
        {rows.length > 0 && (
          <div className="overflow-visible rounded-lg border">
            <Table className="min-w-350">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">
                    Date<Req />
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">
                    Amount<Req />
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Type</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">
                    Category &gt; Subcategory<Req />
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Note</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Tags</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">
                    Mode<Req />
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">
                    Necessity<Req />
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Counterparty</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <BulkAddRow
                    key={row.clientId}
                    row={row}
                    categories={categories}
                    subcategories={subcategories}
                    counterparties={counterparties}
                    transactionModes={transactionModes}
                    tags={tags}
                    onRemove={() => removeRow(row.clientId)}
                    onSaved={() => handleRowSaved(row.clientId)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {rows.length === 0 && !parsing && (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Upload an .xlsx file to see rows here. Use the template to get the right column format.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
