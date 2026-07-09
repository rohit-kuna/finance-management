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
import type { CounterpartyRecordDto } from "@/app/lib/finance.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddCounterpartyRow } from "@/components/features/counterparties/add-counterparty-row";
import { CounterpartyRow } from "@/components/features/counterparties/counterparty-row";

function SortableHeader({
  column,
  title,
}: {
  column: Column<CounterpartyRecordDto, unknown>;
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

function CounterpartyTable({
  counterparties,
  editingCounterpartyId,
  onStartEdit,
  onCancelEdit,
}: {
  counterparties: CounterpartyRecordDto[];
  editingCounterpartyId: number | null;
  onStartEdit: (counterpartyId: number) => void;
  onCancelEdit: () => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);

  const columns = useMemo<ColumnDef<CounterpartyRecordDto>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <SortableHeader column={column} title="Name" />,
      },
      {
        id: "actions",
        header: "",
      },
    ],
    []
  );

  const table = useReactTable({
    data: counterparties,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (!counterparties.length) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
        No counterparties match your search.
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
            <CounterpartyRow
              key={row.original.id}
              counterparty={row.original}
              isEditing={editingCounterpartyId === row.original.id}
              onStartEdit={() => onStartEdit(row.original.id)}
              onCancelEdit={onCancelEdit}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function CounterpartyManagement({
  counterparties,
}: {
  counterparties: CounterpartyRecordDto[];
}) {
  const [query, setQuery] = useState("");
  const [editingCounterpartyId, setEditingCounterpartyId] = useState<number | null>(null);

  const filteredCounterparties = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();
    if (!loweredQuery) return counterparties;
    return counterparties.filter((counterparty) => counterparty.name.toLowerCase().includes(loweredQuery));
  }, [counterparties, query]);

  return (
    <section className="space-y-6">
      <Card className="py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-3xl tracking-tight">Manage Counterparties</CardTitle>
              <p className="max-w-3xl text-sm text-muted-foreground">
                All organization members can create, update, and delete counterparties.
              </p>
            </div>
            <Badge variant="secondary">{filteredCounterparties.length} records</Badge>
          </div>
        </CardHeader>
      </Card>

      <AddCounterpartyRow />

      <Card className="py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <CardTitle className="text-xl tracking-tight">Space counterparties</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-6 sm:px-8 sm:pb-8">
          <div className="space-y-2">
            <Label htmlFor="counterparty-search">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="counterparty-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by counterparty name..."
                className="pl-9"
              />
            </div>
          </div>

          {counterparties.length ? (
            <CounterpartyTable
              counterparties={filteredCounterparties}
              editingCounterpartyId={editingCounterpartyId}
              onStartEdit={setEditingCounterpartyId}
              onCancelEdit={() => setEditingCounterpartyId(null)}
            />
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
              No counterparties yet. Create one to tag expenses and transfers.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
