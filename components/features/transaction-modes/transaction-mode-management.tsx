"use client";

import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type Column,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import type { TransactionModeRecordDto } from "@/app/lib/finance.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddTransactionModeRow } from "@/components/features/transaction-modes/add-transaction-mode-row";
import { TransactionModeRow } from "@/components/features/transaction-modes/transaction-mode-row";

function SortableHeader({
  column,
  title,
}: {
  column: Column<TransactionModeRecordDto, unknown>;
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

function TransactionModeTable({
  transactionModes,
  editingModeId,
  onStartEdit,
  onCancelEdit,
}: {
  transactionModes: TransactionModeRecordDto[];
  editingModeId: number | null;
  onStartEdit: (modeId: number) => void;
  onCancelEdit: () => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);

  const columns = useMemo<ColumnDef<TransactionModeRecordDto>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <SortableHeader column={column} title="Name" />,
      },
      {
        id: "default",
        header: "Default",
      },
      {
        id: "actions",
        header: "",
      },
    ],
    []
  );

  const table = useReactTable({
    data: transactionModes,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (!transactionModes.length) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
        No transaction modes match your search.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TransactionModeRow
              key={row.original.id}
              transactionMode={row.original}
              isEditing={editingModeId === row.original.id}
              onStartEdit={() => onStartEdit(row.original.id)}
              onCancelEdit={onCancelEdit}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function TransactionModeManagement({
  transactionModes,
}: {
  transactionModes: TransactionModeRecordDto[];
}) {
  const [query, setQuery] = useState("");
  const [editingModeId, setEditingModeId] = useState<number | null>(null);

  const filteredTransactionModes = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();
    if (!loweredQuery) return transactionModes;
    return transactionModes.filter((mode) => mode.name.toLowerCase().includes(loweredQuery));
  }, [transactionModes, query]);

  return (
    <section className="space-y-6">
      <Card className="py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-3xl tracking-tight">Manage Transaction Modes</CardTitle>
              <p className="max-w-3xl text-sm text-muted-foreground">
                Create your payment methods and mark one as default for new expenses.
              </p>
            </div>
            <Badge variant="secondary">{filteredTransactionModes.length} records</Badge>
          </div>
        </CardHeader>
      </Card>

      <AddTransactionModeRow />

      <Card className="py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <CardTitle className="text-xl tracking-tight">Your transaction modes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-6 sm:px-8 sm:pb-8">
          <div className="space-y-2">
            <Label htmlFor="transaction-mode-search">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="transaction-mode-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by transaction mode name..."
                className="pl-9"
              />
            </div>
          </div>

          {transactionModes.length ? (
            <TransactionModeTable
              transactionModes={filteredTransactionModes}
              editingModeId={editingModeId}
              onStartEdit={setEditingModeId}
              onCancelEdit={() => setEditingModeId(null)}
            />
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
              No transaction modes yet. Create one to use it on expenses.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
