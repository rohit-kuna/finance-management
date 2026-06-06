"use client";

import { useActionState, useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type Column,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { AlertCircle, ArrowDown, ArrowUp, ArrowUpDown, PencilLine, Trash2, X } from "lucide-react";
import { financeInitialState } from "@/app/actions/auth-roles/finance.types";
import {
  createExpenseAction,
  deleteExpenseAction,
  updateExpenseAction,
} from "@/app/actions/auth-roles/expense.actions";
import type {
  CategoryRecordDto,
  CounterpartyRecordDto,
  TransactionModeRecordDto,
} from "@/app/lib/finance.types";
import type { ExpenseRecordDto, ExpensesDashboardDataDto } from "@/app/lib/expense.types";
import { getTodayExpenseDateInputValue, formatExpenseDate } from "@/app/lib/expense-date";
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
  return (
    <select
      name="categoryId"
      value={String(value)}
      onChange={(event) => onChange(Number(event.target.value))}
      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      required
    >
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
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
  const [value, setValue] = useState(String(defaultValue));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Label htmlFor="expense-necessity">Necessity score</Label>
          <Badge variant="secondary" className="min-w-8 justify-center px-2 py-0.5 text-xs">
            {value}
          </Badge>
        </div>
        <span className="text-sm text-muted-foreground">1 low → 5 high</span>
      </div>
      <input
        id="expense-necessity"
        name="necessityScore"
        type="range"
        min="1"
        max="5"
        step="1"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="w-full accent-primary"
      />
      <div className="relative mt-1 h-4 text-xs text-muted-foreground">
        <span className="absolute left-0">1</span>
        <span className="absolute left-1/4 -translate-x-1/2">2</span>
        <span className="absolute left-1/2 -translate-x-1/2">3</span>
        <span className="absolute left-3/4 -translate-x-1/2">4</span>
        <span className="absolute right-0">5</span>
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

function ExpenseFormCard({
  categories,
  counterparties,
  transactionModes,
  editingExpense,
  onCancelEdit,
}: {
  categories: CategoryRecordDto[];
  counterparties: CounterpartyRecordDto[];
  transactionModes: TransactionModeRecordDto[];
  editingExpense: ExpenseRecordDto | null;
  onCancelEdit: () => void;
}) {
  const [createState, createAction, createPending] = useActionState(createExpenseAction, financeInitialState);
  const [updateState, updateAction, updatePending] = useActionState(updateExpenseAction, financeInitialState);

  const isEditing = Boolean(editingExpense);
  const activeAction = isEditing ? updateAction : createAction;
  const activePending = isEditing ? updatePending : createPending;
  const activeError = isEditing ? updateState.error : createState.error;
  const defaultOccurredAt = editingExpense ? editingExpense.occurredAt.slice(0, 10) : getTodayExpenseDateInputValue();
  const defaultTransactionModeId = editingExpense?.transactionModeId
    ? String(editingExpense.transactionModeId)
    : String(transactionModes.find((mode) => mode.isDefault)?.id ?? transactionModes[0]?.id ?? "");
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    editingExpense?.categoryId ?? categories[0]?.id ?? 0
  );
  const resolvedSelectedCategoryId = categories.some((category) => category.id === selectedCategoryId)
    ? selectedCategoryId
    : editingExpense?.categoryId ?? categories[0]?.id ?? 0;

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === resolvedSelectedCategoryId) ?? null,
    [categories, resolvedSelectedCategoryId]
  );

  return (
    <Card className="border-primary/20 bg-primary/5 py-2">
      <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
        <CardTitle className="text-2xl tracking-tight">
          {isEditing ? "Edit Transaction" : "Add Transaction"}
        </CardTitle>
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
            className="grid gap-4 rounded-lg border border-primary/20 bg-background/80 p-4 sm:grid-cols-2"
          >
            {editingExpense ? <input type="hidden" name="expenseId" value={editingExpense.id} /> : null}
            <div className="space-y-2">
              <Label>Category</Label>
              <CategorySelect categories={categories} value={resolvedSelectedCategoryId} onChange={setSelectedCategoryId} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-type">Type</Label>
              <Input
                id="expense-type"
                value={selectedCategory?.type ?? "—"}
                readOnly
                tabIndex={-1}
                className="bg-muted/40 capitalize"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-amount">Amount</Label>
              <Input
                id="expense-amount"
                name="amount"
                type="number"
                min="1"
                step="0.01"
                defaultValue={editingExpense?.amount ?? ""}
                placeholder="250"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Transaction mode</Label>
              <FormSelect
                name="transactionModeId"
                defaultValue={defaultTransactionModeId}
                options={transactionModes.map((mode) => ({
                  value: String(mode.id),
                  label: formatTransactionModeLabel(mode),
                }))}
              />
            </div>
            <div className="space-y-2">
              <NecessityScoreSlider defaultValue={editingExpense?.necessityScore ?? 1} />
            </div>
            <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="expense-date">Date</Label>
                <Input id="expense-date" name="occurredAt" type="date" defaultValue={defaultOccurredAt} required />
              </div>
              <div className="space-y-2">
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
              <p className="text-sm text-muted-foreground sm:col-span-2">
                Link any expense to a counterparty. This is available for all categories.
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="expense-note">Note</Label>
              <textarea
                id="expense-note"
                name="note"
                defaultValue={editingExpense?.note ?? ""}
                placeholder="Lunch with the team"
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Badge variant="secondary">Default: {transactionModes.find((mode) => mode.isDefault)?.name ?? "none"}</Badge>
              <Badge variant="secondary">Default: 1</Badge>
            </div>
            <div className="sm:col-span-2">
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
        <form action={deleteAction}>
          <input type="hidden" name="expenseId" value={expense.id} />
          <Button
            type="submit"
            variant="destructive"
            size="icon-sm"
            disabled={deletePending}
            aria-label="Delete Transaction"
            title="Delete Transaction"
          >
            <Trash2 className="size-4" />
          </Button>
        </form>
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
      ].some((value) => value.toLowerCase().includes(loweredQuery));
    });
  }, [
    expenses,
    categoryFilter,
    typeFilter,
    transactionModeFilter,
    necessityFilter,
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
            <Label>Month</Label>
            <Input
              type="month"
              value={monthFilter === "all" ? "" : monthFilter}
              onChange={(event) => setMonthFilter(event.target.value || "all")}
            />
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

  return (
    <section className="space-y-6">
      <Card className="py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <CardTitle className="text-3xl tracking-tight">Transactions</CardTitle>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Add a transaction quickly, then use filters and sorting to review your own spending.
          </p>
        </CardHeader>
      </Card>

      <ExpenseFormCard
        categories={data.categories}
        counterparties={data.counterparties}
        transactionModes={data.transactionModes}
        editingExpense={editingExpense}
        onCancelEdit={() => setEditingExpense(null)}
      />

      <ExpenseTable
        expenses={data.expenses}
        transactionModes={data.transactionModes}
        currentUserId={data.currentUser.id}
        isAdmin={isAdmin}
        onEdit={setEditingExpense}
      />
    </section>
  );
}
