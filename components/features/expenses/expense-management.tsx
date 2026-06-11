"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type Column,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { AlertCircle, ArrowDown, ArrowUp, ArrowUpDown, CalendarDays, PencilLine, Trash2, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { financeInitialState } from "@/app/actions/auth-roles/finance.types";
import {
  createExpenseAction,
  deleteExpenseAction,
  updateExpenseAction,
} from "@/app/actions/auth-roles/expense.actions";
import type {
  CategoryRecordDto,
  CategoryTagRecordDto,
  CounterpartyRecordDto,
  TagRecordDto,
  TransactionModeRecordDto,
} from "@/app/lib/finance.types";
import type { ExpenseRecordDto, ExpensesDashboardDataDto } from "@/app/lib/expense.types";
import { TagMultiSelect } from "@/components/features/expenses/tag-multi-select";
import {
  formatExpenseDate,
  toExpenseDateInputValue,
} from "@/app/lib/expense-date";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MonthInput } from "@/components/ui/month-input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const moneyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const expenseTypes = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
] as const;

const necessityScores = [1, 2, 3, 4, 5] as const;

function formatMoney(amount: string) {
  return moneyFormatter.format(Number(amount));
}

function formatNecessityScore(score: number) {
  return String(score);
}

function formatTransactionModeLabel(mode: TransactionModeRecordDto) {
  return mode.isDefault ? `${mode.name} (default)` : mode.name;
}

function getTransactionCardClasses(transactionType: "income" | "expense" | null) {
  if (transactionType === "income") {
    return "overflow-hidden border-emerald-500/50 bg-emerald-500/15 shadow-[0_0_0_1px_rgba(16,185,129,0.25)] dark:border-emerald-400/50 dark:bg-emerald-950/35";
  }

  if (transactionType === "expense") {
    return "overflow-hidden border-pink-500/55 bg-pink-500/15 shadow-[0_0_0_1px_rgba(236,72,153,0.25)] dark:border-pink-400/50 dark:bg-pink-950/35";
  }

  return "overflow-hidden border-primary/35 bg-primary/10 shadow-[0_0_0_1px_rgba(244,114,182,0.15)]";
}

function ActionError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function CategorySelect({
  categories,
  value,
  onChange,
}: {
  categories: CategoryRecordDto[];
  value: number;
  onChange: (value: number) => void;
}) {
  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");

  return (
    <select
      name="categoryId"
      value={String(value)}
      onChange={(event) => onChange(Number(event.target.value))}
      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      required
    >
      {expenseCategories.length > 0 && (
        <optgroup label="Expense">
          {expenseCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </optgroup>
      )}
      {incomeCategories.length > 0 && (
        <optgroup label="Income">
          {incomeCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}

function FormSelect({
  id,
  name,
  defaultValue,
  options,
  required = true,
  includeEmptyOption,
}: {
  id?: string;
  name: string;
  defaultValue: string;
  options: readonly { value: string; label: string }[];
  required?: boolean;
  includeEmptyOption?: string;
}) {
  return (
    <select
      id={id}
      name={name}
      defaultValue={defaultValue}
      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      required={required}
    >
      {includeEmptyOption ? <option value="">{includeEmptyOption}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function NecessityScoreSlider({ defaultValue }: { defaultValue: number }) {
  const [value, setValue] = useState(defaultValue);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const scores = [1, 2, 3, 4, 5] as const;

  function valueFromClientX(clientX: number) {
    if (!containerRef.current) return value;
    const { left, width } = containerRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - left) / width));
    return Math.max(1, Math.min(5, Math.round(ratio * 4) + 1)) as 1 | 2 | 3 | 4 | 5;
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = true;
    containerRef.current?.setPointerCapture(e.pointerId);
    setValue(valueFromClientX(e.clientX));
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    setValue(valueFromClientX(e.clientX));
  }

  function handlePointerUp() {
    dragging.current = false;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="expense-necessity">Necessity score <span className="text-destructive">*</span></Label>
        <span className="text-sm text-muted-foreground">1 low → 5 high</span>
      </div>
      <input type="hidden" id="expense-necessity" name="necessityScore" value={value} />
      <div
        ref={containerRef}
        className="relative flex h-9 cursor-pointer select-none items-center justify-between rounded-full border border-border bg-background px-1"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-primary/20 transition-all duration-150"
          style={{ width: `calc(${(value - 1) / 4} * (100% - 2.25rem) + 2rem)` }}
        />
        {scores.map((score) => (
          <div key={score} className="relative z-10 flex items-center justify-center">
            {score === value ? (
              <span className="flex h-7 w-7 cursor-grab items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow active:cursor-grabbing">
                {score}
              </span>
            ) : (
              <span className="flex h-7 w-7 items-center justify-center text-sm text-muted-foreground transition-colors hover:text-foreground">
                {score}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SortableHeader({
  column,
  title,
}: {
  column: Column<ExpenseRecordDto, unknown>;
  title: string;
}) {
  const sortState = column.getIsSorted();
  const Icon = sortState === "asc" ? ArrowUp : sortState === "desc" ? ArrowDown : ArrowUpDown;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={column.getToggleSortingHandler()}
      className="-ml-3 h-8 gap-1 px-2 text-xs font-semibold uppercase tracking-wide"
    >
      {title}
      <Icon className="size-3.5" />
    </Button>
  );
}

export function ExpenseFormCard({
  categories,
  counterparties,
  transactionModes,
  tags,
  categoryTags,
  editingExpense,
  recentCategoryId,
  onCancelEdit,
}: {
  categories: CategoryRecordDto[];
  counterparties: CounterpartyRecordDto[];
  transactionModes: TransactionModeRecordDto[];
  tags: TagRecordDto[];
  categoryTags: CategoryTagRecordDto[];
  editingExpense: ExpenseRecordDto | null;
  recentCategoryId: number | null;
  onCancelEdit?: () => void;
}) {
  const [createState, createAction, createPending] = useActionState(createExpenseAction, financeInitialState);
  const [updateState, updateAction, updatePending] = useActionState(updateExpenseAction, financeInitialState);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const isEditing = Boolean(editingExpense);
  const activeAction = isEditing ? updateAction : createAction;
  const activePending = isEditing ? updatePending : createPending;
  const activeError = isEditing ? updateState.error : createState.error;
  const defaultOccurredAt = editingExpense
    ? toExpenseDateInputValue(new Date(editingExpense.occurredAt))
    : toExpenseDateInputValue(new Date());
  const defaultTransactionModeId = editingExpense?.transactionModeId
    ? String(editingExpense.transactionModeId)
    : String(transactionModes.find((mode) => mode.isDefault)?.id ?? transactionModes[0]?.id ?? "");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const defaultCategoryId = isEditing
    ? editingExpense?.categoryId ?? categories[0]?.id ?? 0
    : categories.some((category) => category.id === recentCategoryId)
      ? recentCategoryId ?? categories[0]?.id ?? 0
      : categories[0]?.id ?? 0;
  const [selectedCategoryId, setSelectedCategoryId] = useState(defaultCategoryId);
  const resolvedSelectedCategoryId = categories.some((category) => category.id === selectedCategoryId)
    ? selectedCategoryId
    : defaultCategoryId;

  const isAdvanced = isEditing || showAdvanced;
  const transactionCardClasses = getTransactionCardClasses(
    categories.find((category) => category.id === resolvedSelectedCategoryId)?.type ?? null
  );

  return (
    <Card className={cn("py-2", transactionCardClasses)}>
      <CardHeader className="flex flex-col gap-2 px-4 pt-6 sm:px-8 sm:pt-8">
        {!isEditing ? (
          <div className="flex justify-end w-full">
            <div className="flex items-center gap-3 rounded-full border border-border/70 bg-background/90 px-3 py-2 shadow-sm">
              <span className={cn("text-xs font-medium uppercase tracking-wide", !showAdvanced && "text-foreground")}>
                <span className="sm:hidden">Quick</span>
                <span className="hidden sm:inline">Quick Add</span>
              </span>
              <Switch
                checked={showAdvanced}
                onCheckedChange={setShowAdvanced}
                aria-label="Toggle advanced transaction fields"
              />
              <span className={cn("text-xs font-medium uppercase tracking-wide", showAdvanced && "text-foreground")}>
                <span className="sm:hidden">Adv</span>
                <span className="hidden sm:inline">Advanced</span>
              </span>
            </div>
          </div>
        ) : null}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-2xl tracking-tight">
              {isEditing ? "Edit Transaction" : "Add Transaction"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {isEditing
                ? "Update all transaction details."
                : "Quick Add keeps the essentials visible while Advanced reveals the full form."}
            </p>
          </div>
          {isEditing ? (
            <Badge variant="secondary" className="shrink-0">
              Advanced
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-6 sm:px-8 sm:pb-8">
        {!categories.length ? (
          <div className="rounded-lg border border-dashed bg-background/80 p-4 text-sm text-muted-foreground">
            Create categories first, then you can add transactions.
          </div>
        ) : !transactionModes.length ? (
          <div className="rounded-lg border border-dashed bg-background/80 p-4 text-sm text-muted-foreground">
            Create your transaction modes first, then you can add transactions.
          </div>
        ) : (
          <form
            key={editingExpense?.id ?? "new-expense"}
            action={activeAction}
            className="space-y-4 rounded-lg p-4"
          >
            {editingExpense ? <input type="hidden" name="expenseId" value={editingExpense.id} /> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="expense-amount">Amount <span className="text-destructive">*</span></Label>
                <Input
                  id="expense-amount"
                  name="amount"
                  type="number"
                  min="1"
                  step="0.01"
                  defaultValue={editingExpense?.amount ?? ""}
                  placeholder="250"
                  className="h-10 bg-background"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Category <span className="text-destructive">*</span></Label>
                <CategorySelect
                  categories={categories}
                  value={resolvedSelectedCategoryId}
                  onChange={setSelectedCategoryId}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tags</Label>
                <TagMultiSelect
                  tags={tags}
                  name="tagIds"
                  defaultSelectedIds={editingExpense?.tagIds ?? []}
                  categoryTags={categoryTags}
                  categoryId={resolvedSelectedCategoryId}
                />
              </div>
              <div>
                <NecessityScoreSlider defaultValue={editingExpense?.necessityScore ?? 1} />
              </div>
            </div>
            <div className={cn(!isAdvanced && "hidden")}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="expense-date">Date <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input
                      ref={dateInputRef}
                      id="expense-date"
                      name="occurredAt"
                      type="date"
                      defaultValue={defaultOccurredAt}
                      className="h-10 bg-background pr-11"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => dateInputRef.current?.showPicker?.()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      aria-label="Open date picker"
                      title="Open date picker"
                    >
                      <CalendarDays className="size-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Transaction mode <span className="text-destructive">*</span></Label>
                  <FormSelect
                    name="transactionModeId"
                    defaultValue={defaultTransactionModeId}
                    options={transactionModes.map((mode) => ({
                      value: String(mode.id),
                      label: formatTransactionModeLabel(mode),
                    }))}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="expense-counterparty">Counterparty</Label>
                  <FormSelect
                    id="expense-counterparty"
                    name="counterPartyId"
                    defaultValue={editingExpense?.counterPartyId ? String(editingExpense.counterPartyId) : ""}
                    options={counterparties.map((counterparty) => ({
                      value: String(counterparty.id),
                      label: counterparty.name,
                    }))}
                    required={false}
                    includeEmptyOption="No counterparty"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="expense-note">Note</Label>
                  <textarea
                    id="expense-note"
                    name="note"
                    defaultValue={editingExpense?.note ?? ""}
                    placeholder="Lunch with the team"
                    className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Default Date: Now</Badge>
              <Badge variant="secondary">Default Mode: {transactionModes.find((mode) => mode.isDefault)?.name ?? "none"}</Badge>
            </div>
            <ActionError message={activeError} />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" disabled={activePending} className="w-full sm:w-auto">
                {activePending
                  ? isEditing
                    ? "Saving..."
                    : "Adding..."
                  : isEditing
                    ? "Save Transaction"
                    : "Add Transaction"}
              </Button>
              {isEditing ? (
                <Button type="button" variant="outline" onClick={onCancelEdit} className="w-full sm:w-auto">
                  <X className="mr-2 size-4" />
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function ExpenseRowActions({
  expense,
  onEdit,
  canManage,
}: {
  expense: ExpenseRecordDto;
  onEdit: (expense: ExpenseRecordDto) => void;
  canManage: boolean;
}) {
  const [deleteState, deleteAction, deletePending] = useActionState(deleteExpenseAction, financeInitialState);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteFormRef = useRef<HTMLFormElement>(null);

  if (!canManage) {
    return <span className="text-xs text-muted-foreground">Read only</span>;
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => onEdit(expense)}
          aria-label="Edit Transaction"
          title="Edit Transaction"
        >
          <PencilLine className="size-4" />
        </Button>
        <form ref={deleteFormRef} action={deleteAction}>
          <input type="hidden" name="expenseId" value={expense.id} />
          <Button
            type="button"
            variant="destructive"
            size="icon-sm"
            disabled={deletePending}
            aria-label="Delete Transaction"
            title="Delete Transaction"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="size-4" />
          </Button>
        </form>
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Delete transaction"
          description="Are you sure you want to delete this transaction? This cannot be undone."
          onConfirm={() => deleteFormRef.current?.requestSubmit()}
        />
      </div>
      <ActionError message={deleteState.error} />
    </div>
  );
}

function ExpenseTable({
  expenses,
  transactionModes,
  currentUserId,
  isAdmin,
  onEdit,
}: {
  expenses: ExpenseRecordDto[];
  transactionModes: TransactionModeRecordDto[];
  currentUserId: string;
  isAdmin: boolean;
  onEdit: (expense: ExpenseRecordDto) => void;
}) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [transactionModeFilter, setTransactionModeFilter] = useState("all");
  const [necessityFilter, setNecessityFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [sorting, setSorting] = useState<SortingState>([{ id: "occurredAt", desc: true }]);

  const categoryOptions = useMemo(
    () => [
      { value: "all", label: "All categories" },
      ...Array.from(new Map(expenses.map((expense) => [expense.categoryId, expense.categoryName])).entries()).map(
        ([id, name]) => ({
          value: String(id),
          label: name,
        })
      ),
    ],
    [expenses]
  );

  const tagOptions = useMemo(() => {
    const tagsById = new Map<number, string>();
    for (const expense of expenses) {
      expense.tagIds.forEach((id, index) => {
        if (!tagsById.has(id)) {
          tagsById.set(id, expense.tagNames[index] ?? "");
        }
      });
    }

    return [
      { value: "all", label: "All tags" },
      ...Array.from(tagsById.entries()).map(([id, name]) => ({
        value: String(id),
        label: name,
      })),
    ];
  }, [expenses]);

  const transactionModeOptions = useMemo(
    () => [
      { value: "all", label: "All transaction modes" },
      ...transactionModes.map((mode) => ({
        value: String(mode.id),
        label: formatTransactionModeLabel(mode),
      })),
    ],
    [transactionModes]
  );

  const filteredExpenses = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();

    return expenses.filter((expense) => {
      if (categoryFilter !== "all" && String(expense.categoryId) !== categoryFilter) return false;
      if (typeFilter !== "all" && expense.type !== typeFilter) return false;
      if (transactionModeFilter !== "all" && String(expense.transactionModeId) !== transactionModeFilter) return false;
      if (necessityFilter !== "all" && String(expense.necessityScore) !== necessityFilter) return false;
      if (tagFilter !== "all" && !expense.tagIds.some((id) => String(id) === tagFilter)) return false;
      if (monthFilter !== "all" && expense.occurredAt.slice(0, 7) !== monthFilter) return false;

      if (!loweredQuery) return true;

      return [
        expense.categoryName,
        expense.counterPartyName ?? "",
        expense.transactionModeName ?? "",
        expense.note ?? "",
        expense.amount,
        expense.type,
        expense.transferStatus ?? "",
        String(expense.necessityScore),
        ...expense.tagNames,
      ].some((value) => value.toLowerCase().includes(loweredQuery));
    });
  }, [
    expenses,
    categoryFilter,
    typeFilter,
    transactionModeFilter,
    necessityFilter,
    tagFilter,
    monthFilter,
    query,
  ]);

  const columns = useMemo<ColumnDef<ExpenseRecordDto>[]>(
    () => [
      {
        accessorKey: "categoryName",
        header: ({ column }) => <SortableHeader column={column} title="Category" />,
        cell: ({ row }) => <span className="font-medium">{row.original.categoryName}</span>,
      },
      {
        accessorKey: "counterPartyName",
        header: "Counterparty",
        cell: ({ row }) => row.original.counterPartyName ?? "—",
      },
      {
        accessorKey: "amount",
        header: ({ column }) => <SortableHeader column={column} title="Amount" />,
        cell: ({ row }) => <span className="font-semibold">{formatMoney(row.original.amount)}</span>,
        sortingFn: (left, right) => Number(left.original.amount) - Number(right.original.amount),
      },
      {
        accessorKey: "type",
        header: ({ column }) => <SortableHeader column={column} title="Type" />,
        cell: ({ row }) => <Badge variant="secondary">{row.original.type}</Badge>,
      },
      {
        accessorKey: "transactionModeName",
        header: ({ column }) => <SortableHeader column={column} title="Transaction mode" />,
        cell: ({ row }) => <Badge variant="outline">{row.original.transactionModeName ?? "—"}</Badge>,
      },
      {
        accessorKey: "transferStatus",
        header: ({ column }) => <SortableHeader column={column} title="Transfer status" />,
        cell: ({ row }) =>
          row.original.counterPartyId ? (
            <Badge variant={row.original.transferStatus === "settled" ? "secondary" : "outline"}>
              {row.original.transferStatus ?? "open"}
            </Badge>
          ) : (
            "—"
          ),
      },
      {
        accessorKey: "necessityScore",
        header: ({ column }) => <SortableHeader column={column} title="Necessity" />,
        cell: ({ row }) => <Badge variant="secondary">{formatNecessityScore(row.original.necessityScore)}</Badge>,
      },
      {
        accessorKey: "occurredAt",
        header: ({ column }) => <SortableHeader column={column} title="Date" />,
        cell: ({ row }) => formatExpenseDate(row.original.occurredAt),
      },
      {
        accessorKey: "note",
        header: "Note",
        cell: ({ row }) => (
          <span className="block max-w-[280px] truncate text-muted-foreground">{row.original.note ?? "—"}</span>
        ),
      },
      {
        id: "tags",
        header: "Tags",
        cell: ({ row }) =>
          row.original.tagNames.length ? (
            <div className="flex max-w-[220px] flex-wrap gap-1">
              {row.original.tagNames.map((tagName) => (
                <Badge key={tagName} variant="secondary">
                  {tagName}
                </Badge>
              ))}
            </div>
          ) : (
            "—"
          ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <ExpenseRowActions
            expense={row.original}
            onEdit={onEdit}
            canManage={isAdmin || row.original.userId === currentUserId}
          />
        ),
      },
    ],
    [currentUserId, isAdmin, onEdit]
  );

  const table = useReactTable({
    data: filteredExpenses,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Card className="py-2">
      <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-2xl tracking-tight">Transactions</CardTitle>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Filter, sort, edit, and remove your transactions, including optional counterparty links.
            </p>
          </div>
          <Badge variant="secondary">{filteredExpenses.length} records</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-6 sm:px-8 sm:pb-8">
        <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="expense-search">Search</Label>
            <Input
              id="expense-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by note, category, type..."
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <FilterSelect value={categoryFilter} onChange={setCategoryFilter} options={categoryOptions} />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <FilterSelect
              value={typeFilter}
              onChange={setTypeFilter}
              options={[{ value: "all", label: "All types" }, ...expenseTypes]}
            />
          </div>
          <div className="space-y-2">
            <Label>Transaction mode</Label>
            <FilterSelect
              value={transactionModeFilter}
              onChange={setTransactionModeFilter}
              options={transactionModeOptions}
            />
          </div>
          <div className="space-y-2">
            <Label>Necessity</Label>
            <FilterSelect
              value={necessityFilter}
              onChange={setNecessityFilter}
              options={[
                { value: "all", label: "All scores" },
                ...necessityScores.map((score) => ({
                  value: String(score),
                  label: String(score),
                })),
              ]}
            />
          </div>
          <div className="space-y-2">
            <Label>Tags</Label>
            <FilterSelect value={tagFilter} onChange={setTagFilter} options={tagOptions} />
          </div>
          <div className="space-y-2">
            <Label>Month</Label>
            <MonthInput value={monthFilter === "all" ? "" : monthFilter} onChange={(event) => setMonthFilter(event.target.value || "all")} />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
            <Button type="button" variant="outline" size="sm" onClick={() => setQuery("")}>
              Clear search
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setCategoryFilter("all");
                setTypeFilter("all");
                setTransactionModeFilter("all");
                setNecessityFilter("all");
                setTagFilter("all");
                setMonthFilter("all");
                setQuery("");
              }}
            >
              Reset filters
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <Table className="min-w-[1250px]">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className={cn(header.column.id === "actions" && "text-center")}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(cell.column.id === "actions" && "align-top whitespace-nowrap text-left")}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="py-10 text-center text-muted-foreground">
                    No transactions match the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export function ExpenseManagement({ data }: { data: ExpensesDashboardDataDto }) {
  const [editingExpense, setEditingExpense] = useState<ExpenseRecordDto | null>(null);
  const isAdmin = data.currentUser.role === "ADMIN";
  const organizationName = data.organization?.name ?? "your organization";
  const greetingName = data.currentUser.name || "there";
  const recentCategoryId = useMemo(() => {
    const recentExpense = data.expenses
      .filter((expense) => expense.userId === data.currentUser.id)
      .slice()
      .sort((left, right) =>
        right.occurredAt.localeCompare(left.occurredAt) || right.createdAt.localeCompare(left.createdAt)
      )[0];

    return recentExpense?.categoryId ?? null;
  }, [data.currentUser.id, data.expenses]);

  const formRef = useRef<HTMLDivElement>(null);

  function handleEdit(expense: ExpenseRecordDto) {
    setEditingExpense(expense);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="space-y-6">
      <Card className="py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <CardTitle className="max-w-3xl text-3xl leading-tight tracking-tight">
            <span className="block">Manage Your Transactions</span>
          </CardTitle>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Add a transaction quickly, then use filters and sorting to review your own spending.
          </p>
        </CardHeader>
      </Card>

      <div ref={formRef}>
        <ExpenseFormCard
          key={editingExpense?.id ?? `new-${recentCategoryId ?? "none"}`}
          categories={data.categories}
          counterparties={data.counterparties}
          transactionModes={data.transactionModes}
          tags={data.tags}
          categoryTags={data.categoryTags}
          editingExpense={editingExpense}
          recentCategoryId={recentCategoryId}
          onCancelEdit={() => setEditingExpense(null)}
        />
      </div>

      <ExpenseTable
        expenses={data.expenses}
        transactionModes={data.transactionModes}
        currentUserId={data.currentUser.id}
        isAdmin={isAdmin}
        onEdit={handleEdit}
      />
    </section>
  );
}
