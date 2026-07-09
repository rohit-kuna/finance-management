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
import type { TagRecordDto } from "@/app/lib/finance.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddTagRow } from "@/components/features/tags/add-tag-row";
import { TagRow } from "@/components/features/tags/tag-row";

function SortableHeader({ column, title }: { column: Column<TagRecordDto, unknown>; title: string }) {
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

function TagTable({
  tags,
  canManageTags,
  editingTagId,
  onStartEdit,
  onCancelEdit,
}: {
  tags: TagRecordDto[];
  canManageTags: boolean;
  editingTagId: number | null;
  onStartEdit: (tagId: number) => void;
  onCancelEdit: () => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);

  const columns = useMemo<ColumnDef<TagRecordDto>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <SortableHeader column={column} title="Tag" />,
      },
      {
        id: "actions",
        header: "",
      },
    ],
    []
  );

  const table = useReactTable({
    data: tags,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (!tags.length) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
        No tags match your search.
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
            <TagRow
              key={row.original.id}
              tag={row.original}
              isEditing={editingTagId === row.original.id}
              onStartEdit={() => onStartEdit(row.original.id)}
              onCancelEdit={onCancelEdit}
              canManageTags={canManageTags}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function TagManagement({
  tags,
  canManageTags = false,
}: {
  tags: TagRecordDto[];
  canManageTags?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [editingTagId, setEditingTagId] = useState<number | null>(null);

  const filteredTags = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();
    if (!loweredQuery) return tags;
    return tags.filter((tag) => tag.name.toLowerCase().includes(loweredQuery));
  }, [tags, query]);

  return (
    <section className="space-y-6">
      <Card className="py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-3xl tracking-tight">Manage Tags</CardTitle>
              <p className="max-w-3xl text-sm text-muted-foreground">
                {canManageTags
                  ? "Create tags and rename or remove existing ones."
                  : "Anyone in the space can create tags. Admins manage renames and deletions."}
              </p>
            </div>
            <Badge variant="secondary">{filteredTags.length} records</Badge>
          </div>
        </CardHeader>
      </Card>

      <AddTagRow />

      <Card className="py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <CardTitle className="text-xl tracking-tight">Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-6 sm:px-8 sm:pb-8">
          <div className="space-y-2">
            <Label htmlFor="tag-search">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="tag-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name..."
                className="pl-9"
              />
            </div>
          </div>

          {tags.length ? (
            <TagTable
              tags={filteredTags}
              canManageTags={canManageTags}
              editingTagId={editingTagId}
              onStartEdit={setEditingTagId}
              onCancelEdit={() => setEditingTagId(null)}
            />
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
              No tags yet. Create the first tag to start labeling transactions.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
