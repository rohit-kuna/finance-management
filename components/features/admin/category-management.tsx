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
import type { CategoryRecordDto, SubcategoryRecordDto } from "@/app/lib/finance.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CategoryRow } from "@/components/features/categories/category-row";
import { AddCategoryRow } from "@/components/features/categories/add-category-row";

function SortableHeader({
  column,
  title,
}: {
  column: Column<CategoryRecordDto, unknown>;
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

function CategoryTable({
  categories,
  subcategories,
  categoriesById,
  currentUserId,
  canManageCategories,
  editingCategoryId,
  onStartEdit,
  onCancelEdit,
}: {
  categories: CategoryRecordDto[];
  subcategories: SubcategoryRecordDto[];
  categoriesById: Map<number, CategoryRecordDto>;
  currentUserId: string;
  canManageCategories: boolean;
  editingCategoryId: number | null;
  onStartEdit: (categoryId: number) => void;
  onCancelEdit: () => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);

  const columns = useMemo<ColumnDef<CategoryRecordDto>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <SortableHeader column={column} title="Category" />,
      },
      {
        accessorKey: "type",
        header: ({ column }) => <SortableHeader column={column} title="Type" />,
      },
      {
        id: "subcategories",
        header: "Subcategories",
      },
      {
        id: "actions",
        header: "",
      },
    ],
    []
  );

  const table = useReactTable({
    data: categories,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (!categories.length) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
        No categories match your search.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table className="min-w-[900px]">
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
            <CategoryRow
              key={row.original.id}
              category={row.original}
              isEditing={editingCategoryId === row.original.id}
              onStartEdit={() => onStartEdit(row.original.id)}
              onCancelEdit={onCancelEdit}
              allSubcategories={subcategories}
              categoriesById={categoriesById}
              currentUserId={currentUserId}
              isAdmin={canManageCategories}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function CategoryManagement({
  categories,
  subcategories,
  currentUserId,
  canManageCategories,
}: {
  categories: CategoryRecordDto[];
  subcategories: SubcategoryRecordDto[];
  currentUserId: string;
  canManageCategories: boolean;
}) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);

  const categoriesById = useMemo(() => {
    const map = new Map<number, CategoryRecordDto>();
    for (const category of categories) {
      map.set(category.id, category);
    }
    return map;
  }, [categories]);

  const subcategoryNamesByCategoryId = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const subcategory of subcategories) {
      const current = map.get(subcategory.categoryId) ?? [];
      current.push(subcategory.name);
      map.set(subcategory.categoryId, current);
    }
    return map;
  }, [subcategories]);

  const filteredCategories = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();

    return categories.filter((category) => {
      if (typeFilter !== "all" && category.type !== typeFilter) return false;
      if (!loweredQuery) return true;

      const subcategoryNames = subcategoryNamesByCategoryId.get(category.id) ?? [];
      return [category.name, category.type, ...subcategoryNames].some((value) =>
        value.toLowerCase().includes(loweredQuery)
      );
    });
  }, [categories, query, subcategoryNamesByCategoryId, typeFilter]);

  return (
    <section className="space-y-6">
      <Card className="py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="max-w-3xl text-3xl leading-tight tracking-tight">
                <span className="block">Manage Categories & Subcategories</span>
              </CardTitle>
              <p className="max-w-3xl text-sm text-muted-foreground">
                {canManageCategories
                  ? "Create and edit categories, and add subcategory chips inline. Type to find an existing subcategory or create a new one."
                  : "Categories are managed by admins. You can add subcategory chips to any category and manage the ones you created."}
              </p>
            </div>
            <Badge variant="secondary">{filteredCategories.length} records</Badge>
          </div>
        </CardHeader>
      </Card>

      {canManageCategories ? <AddCategoryRow /> : null}

      <Card className="py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <CardTitle className="text-xl tracking-tight">Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-6 sm:px-8 sm:pb-8">
          <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="category-search">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="category-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by category or subcategory..."
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <FilterSelect
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  { value: "all", label: "All types" },
                  { value: "expense", label: "Expense" },
                  { value: "income", label: "Income" },
                ]}
              />
            </div>
            <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setTypeFilter("all");
                  setQuery("");
                }}
              >
                Reset filters
              </Button>
            </div>
          </div>

          {categories.length ? (
            <CategoryTable
              categories={filteredCategories}
              subcategories={subcategories}
              categoriesById={categoriesById}
              currentUserId={currentUserId}
              canManageCategories={canManageCategories}
              editingCategoryId={editingCategoryId}
              onStartEdit={setEditingCategoryId}
              onCancelEdit={() => setEditingCategoryId(null)}
            />
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
              No categories yet. {canManageCategories ? "Create the first category to start budgeting." : "Ask an admin to create a category first."}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
