"use client";

import { useActionState, useMemo, useState } from "react";
import { AlertCircle, ArrowDown, ArrowUp } from "lucide-react";
import { financeInitialState } from "@/app/actions/auth-roles/finance.types";
import { updateTransferStatusAction } from "@/app/actions/auth-roles/expense.actions";
import type { ExpenseRecordDto, TransferDashboardDataDto } from "@/app/lib/expense.types";
import { formatExpenseDate } from "@/app/lib/expense-date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MonthInput } from "@/components/ui/month-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const moneyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const typeOptions = [
  { value: "all", label: "All types" },
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
] as const;

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "settled", label: "Settled" },
  { value: "closed", label: "Closed" },
] as const;

function formatMoney(amount: string) {
  return moneyFormatter.format(Number(amount));
}

function formatStatus(status: ExpenseRecordDto["transferStatus"]) {
  return status ?? "open";
}

function getTypeLabel(expense: ExpenseRecordDto) {
  return expense.type === "expense" ? "Expense" : "Income";
}

function typeMatches(expense: ExpenseRecordDto, filter: string) {
  if (filter === "all") return true;
  return expense.type === filter;
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

function TransferStatusEditor({ expense }: { expense: ExpenseRecordDto }) {
  const [state, action, pending] = useActionState(updateTransferStatusAction, financeInitialState);
  const currentStatus = formatStatus(expense.transferStatus);

  return (
    <form action={action} className="flex min-w-[260px] items-center gap-2">
      <input type="hidden" name="expenseId" value={expense.id} />
      <select
        name="transferStatus"
        defaultValue={currentStatus}
        className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
      >
        {statusOptions
          .filter((option) => option.value !== "all")
          .map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
      </select>
      <Button type="submit" size="sm" disabled={pending} className="shrink-0 whitespace-nowrap">
        {pending ? "Saving..." : "Update"}
      </Button>
      <ActionError message={state.error} />
    </form>
  );
}

export function TransferManagement({
  data,
}: {
  data: TransferDashboardDataDto;
}) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [counterpartyFilter, setCounterpartyFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [sorting, setSorting] = useState<"desc" | "asc">("desc");

  const categoryOptions = useMemo(
    () => [
      { value: "all", label: "All categories" },
      ...Array.from(new Map(data.expenses.map((expense) => [expense.categoryId, expense.categoryName])).entries()).map(
        ([id, name]) => ({
          value: String(id),
          label: name,
        })
      ),
    ],
    [data.expenses]
  );

  const counterpartyOptions = useMemo(
    () => [
      { value: "all", label: "All counterparties" },
      ...data.counterparties.map((counterparty) => ({
        value: String(counterparty.id),
        label: counterparty.name,
      })),
    ],
    [data.counterparties]
  );

  const filteredTransfers = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();

    return data.expenses
      .filter((expense) => expense.counterPartyId !== null)
      .filter((expense) => typeMatches(expense, typeFilter))
      .filter((expense) => {
        if (statusFilter === "all") return true;
        return formatStatus(expense.transferStatus) === statusFilter;
      })
      .filter((expense) => {
        if (categoryFilter === "all") return true;
        return String(expense.categoryId) === categoryFilter;
      })
      .filter((expense) => {
        if (counterpartyFilter === "all") return true;
        return String(expense.counterPartyId) === counterpartyFilter;
      })
      .filter((expense) => {
        if (monthFilter === "all") return true;
        return expense.occurredAt.slice(0, 7) === monthFilter;
      })
      .filter((expense) => {
        if (!loweredQuery) return true;

        return [
          expense.categoryName,
          expense.counterPartyName ?? "",
          expense.userName,
          expense.note ?? "",
          expense.amount,
          expense.transferStatus ?? "",
        ].some((value) => value.toLowerCase().includes(loweredQuery));
      })
      .sort((left, right) =>
        sorting === "desc"
          ? right.occurredAt.localeCompare(left.occurredAt)
          : left.occurredAt.localeCompare(right.occurredAt)
      );
  }, [
    categoryFilter,
    counterpartyFilter,
    data.expenses,
    monthFilter,
    query,
    sorting,
    statusFilter,
    typeFilter,
  ]);

  const totals = useMemo(() => {
    const sent = filteredTransfers
      .filter((expense) => expense.type === "expense")
      .reduce((sum, expense) => sum + Number(expense.amount), 0);
    const received = filteredTransfers
      .filter((expense) => expense.type === "income")
      .reduce((sum, expense) => sum + Number(expense.amount), 0);
    const outstanding = Math.abs(sent - received);
    const responsibleParty =
      sent === received
        ? "Balanced"
        : sent > received
          ? counterpartyFilter !== "all"
            ? data.counterparties.find((counterparty) => String(counterparty.id) === counterpartyFilter)?.name ??
              "Counterparty"
            : filteredTransfers.find((expense) => expense.counterPartyName)?.counterPartyName ?? "Counterparty"
          : "Me";
    const open = filteredTransfers.filter((expense) => formatStatus(expense.transferStatus) === "open").length;
    const settled = filteredTransfers.filter((expense) => formatStatus(expense.transferStatus) === "settled").length;
    const closed = filteredTransfers.filter((expense) => formatStatus(expense.transferStatus) === "closed").length;

    return { sent, received, outstanding, responsibleParty, open, settled, closed };
  }, [counterpartyFilter, data.counterparties, filteredTransfers]);

  return (
    <section className="space-y-6">
      <Card className="py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <CardTitle className="text-3xl tracking-tight">Manage transfers</CardTitle>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Track transaction-based payments to and from counterparties, then move them through open, settled, and
            closed states.
          </p>
        </CardHeader>
      </Card>

      <Card className="py-2">
        <CardHeader className="space-y-4 px-4 pt-6 sm:px-8 sm:pt-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Sent</p>
              <p className="mt-2 text-xl font-semibold">{formatMoney(String(totals.sent))}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Received</p>
              <p className="mt-2 text-xl font-semibold">{formatMoney(String(totals.received))}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Outstanding</p>
              <p className="mt-2 text-xl font-semibold">{formatMoney(String(totals.outstanding))}</p>
              <p className="mt-2 text-xs text-muted-foreground">Responsible: {totals.responsibleParty}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Open</p>
              <p className="mt-2 text-xl font-semibold">{totals.open}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Settled</p>
              <p className="mt-2 text-xl font-semibold">{totals.settled}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Closed</p>
              <p className="mt-2 text-xl font-semibold">{totals.closed}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            <div className="space-y-2">
              <Label>Type</Label>
              <FilterSelect value={typeFilter} onChange={setTypeFilter} options={typeOptions} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <FilterSelect value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <FilterSelect value={categoryFilter} onChange={setCategoryFilter} options={categoryOptions} />
            </div>
            <div className="space-y-2">
              <Label>Counterparty</Label>
              <FilterSelect value={counterpartyFilter} onChange={setCounterpartyFilter} options={counterpartyOptions} />
            </div>
            <div className="space-y-2">
              <Label>Month</Label>
              <MonthInput value={monthFilter === "all" ? "" : monthFilter} onChange={(event) => setMonthFilter(event.target.value || "all")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfer-search">Search</Label>
            <Input
              id="transfer-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by counterparty, note, category, or user..."
            />
          </div>
        </CardHeader>
      </Card>

      <Card className="py-2">
          <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-2xl tracking-tight">Transfers</CardTitle>
              <p className="max-w-3xl text-sm text-muted-foreground">
                These are transaction rows tagged with a counterparty. Use type and status to understand how each
                record is progressing.
              </p>
            </div>
            <Badge variant="secondary">{filteredTransfers.length} records</Badge>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-6 sm:px-8 sm:pb-8">
            <div className="overflow-x-auto rounded-lg border">
              <Table className="min-w-[1150px]">
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSorting((current) => (current === "desc" ? "asc" : "desc"))}
                      className="-ml-3 h-8 gap-1 px-2 text-xs font-semibold uppercase tracking-wide"
                    >
                      Date
                      {sorting === "desc" ? <ArrowDown className="size-3.5" /> : <ArrowUp className="size-3.5" />}
                    </Button>
                  </TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Counterparty</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added by</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransfers.length ? (
                  filteredTransfers.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{formatExpenseDate(expense.occurredAt)}</TableCell>
                      <TableCell>
                        <Badge variant={expense.type === "expense" ? "outline" : "secondary"}>{getTypeLabel(expense)}</Badge>
                      </TableCell>
                      <TableCell>{expense.counterPartyName ?? "—"}</TableCell>
                      <TableCell>{expense.categoryName}</TableCell>
                      <TableCell className="font-semibold">{formatMoney(expense.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={expense.transferStatus === "settled" ? "secondary" : "outline"}>
                          {formatStatus(expense.transferStatus)}
                        </Badge>
                      </TableCell>
                      <TableCell>{expense.userName}</TableCell>
                      <TableCell>
                        <span className="block max-w-[260px] truncate text-muted-foreground">
                          {expense.note ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="align-top">
                        <TransferStatusEditor expense={expense} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                      No transfers match the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
