"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CategoryRecordDto, SubcategoryRecordDto } from "@/app/lib/finance.types";
import { financeInitialState } from "@/app/actions/auth-roles/finance.types";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/app/actions/auth-roles/organization-finance.actions";
import {
  createSubcategoryAction,
  deleteSubcategoryAction,
  updateSubcategoryAction,
} from "@/app/actions/auth-roles/subcategories.actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ROUTES } from "@/app/lib/constants";

const CategoryHierarchyChart = dynamic(
  () => import("@/components/features/admin/category-hierarchy-chart").then((mod) => mod.CategoryHierarchyChart),
  {
    ssr: false,
    loading: () => <div className="h-64 w-full animate-pulse rounded-2xl border bg-muted/20" />,
  }
);

function ActionError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function CategoryTypeSelect({
  id,
  name,
  defaultValue = "expense",
}: {
  id: string;
  name: string;
  defaultValue?: CategoryRecordDto["type"];
}) {
  return (
    <select
      id={id}
      name={name}
      defaultValue={defaultValue}
      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
    >
      <option value="expense">Expense</option>
      <option value="income">Income</option>
    </select>
  );
}

function SubcategoryRow({ subcategory }: { subcategory: SubcategoryRecordDto }) {
  const [updateState, updateAction, updatePending] = useActionState(updateSubcategoryAction, financeInitialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteSubcategoryAction, financeInitialState);

  return (
    <div className="rounded-md border bg-background p-3">
      <form action={updateAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="subcategoryId" value={subcategory.id} />
        <input type="hidden" name="categoryId" value={subcategory.categoryId} />
        <input type="hidden" name="returnTo" value={ROUTES.CATEGORIES} />
        <div className="flex-1 space-y-1">
          <Label htmlFor={`subcategory-${subcategory.id}`} className="text-xs">
            Subcategory name
          </Label>
          <Input id={`subcategory-${subcategory.id}`} name="name" defaultValue={subcategory.name} required />
        </div>
        <Button type="submit" size="sm" disabled={updatePending}>
          {updatePending ? "Saving..." : "Save"}
        </Button>
      </form>
      <ActionError message={updateState.error} />

      <form action={deleteAction} className="mt-2">
        <input type="hidden" name="subcategoryId" value={subcategory.id} />
        <input type="hidden" name="returnTo" value={ROUTES.CATEGORIES} />
        <ActionError message={deleteState.error} />
        <Button type="submit" variant="outline" size="sm" disabled={deletePending}>
          <Trash2 className="mr-2 size-4" />
          {deletePending ? "Deleting..." : "Delete"}
        </Button>
      </form>
    </div>
  );
}

function CategoryRow({
  category,
  subcategories,
}: {
  category: CategoryRecordDto;
  subcategories: SubcategoryRecordDto[];
}) {
  const [updateState, updateAction, updatePending] = useActionState(updateCategoryAction, financeInitialState);
  const [createState, createAction, createPending] = useActionState(createSubcategoryAction, financeInitialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteCategoryAction, financeInitialState);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteFormRef = useRef<HTMLFormElement>(null);

  const categorySubcategories = subcategories.filter((subcategory) => subcategory.categoryId === category.id);

  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <form action={updateAction} className="space-y-3">
        <input type="hidden" name="categoryId" value={category.id} />
        <div className="space-y-2">
          <Label htmlFor={`category-name-${category.id}`}>Category name</Label>
          <Input id={`category-name-${category.id}`} name="name" defaultValue={category.name} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`category-type-${category.id}`}>Type</Label>
          <CategoryTypeSelect id={`category-type-${category.id}`} name="type" defaultValue={category.type} />
        </div>
        <ActionError message={updateState.error} />
        <Button type="submit" disabled={updatePending}>
          {updatePending ? "Saving..." : "Save"}
        </Button>
      </form>

      <div className="mt-4 space-y-2">
        <Label>Subcategories</Label>
        {categorySubcategories.length ? (
          <div className="grid gap-2">
            {categorySubcategories.map((subcategory) => (
              <SubcategoryRow key={subcategory.id} subcategory={subcategory} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No subcategories yet.</p>
        )}

        <form action={createAction} className="flex flex-wrap items-end gap-2 pt-2">
          <input type="hidden" name="categoryId" value={category.id} />
          <input type="hidden" name="returnTo" value={ROUTES.CATEGORIES} />
          <div className="flex-1 space-y-1">
            <Label htmlFor={`new-subcategory-${category.id}`} className="text-xs">
              New subcategory
            </Label>
            <Input id={`new-subcategory-${category.id}`} name="name" placeholder="Groceries" required />
          </div>
          <Button type="submit" variant="outline" size="sm" disabled={createPending}>
            {createPending ? "Adding..." : "Add subcategory"}
          </Button>
        </form>
        <ActionError message={createState.error} />
      </div>

      <form ref={deleteFormRef} action={deleteAction} className="mt-3">
        <input type="hidden" name="categoryId" value={category.id} />
        <ActionError message={deleteState.error} />
        <Button
          type="button"
          variant="outline"
          className="mt-2"
          disabled={deletePending}
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="mr-2 size-4" />
          {deletePending ? "Deleting..." : "Delete"}
        </Button>
      </form>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete category"
        description={`Are you sure you want to delete "${category.name}"? This cannot be undone.`}
        onConfirm={() => deleteFormRef.current?.requestSubmit()}
      />
    </div>
  );
}

export function CategoryManagement({
  categories,
  subcategories,
}: {
  categories: CategoryRecordDto[];
  subcategories: SubcategoryRecordDto[];
}) {
  const [createState, createAction, createPending] = useActionState(createCategoryAction, financeInitialState);
  const [query, setQuery] = useState("");

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
    if (!loweredQuery) return categories;

    return categories.filter((category) => {
      const subcategoryNames = subcategoryNamesByCategoryId.get(category.id) ?? [];
      return [category.name, category.type, ...subcategoryNames].some((value) =>
        value.toLowerCase().includes(loweredQuery)
      );
    });
  }, [categories, query, subcategoryNamesByCategoryId]);

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <CategoryHierarchyChart categories={categories} subcategories={subcategories} />

      <Card className="border-primary/20 bg-primary/5 py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <CardTitle className="text-2xl tracking-tight">Create category</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-6 sm:px-8 sm:pb-8">
          <form action={createAction} className="space-y-4 rounded-lg border border-primary/20 bg-background/80 p-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">Category name</Label>
              <Input id="categoryName" name="name" placeholder="Food" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoryType">Type</Label>
              <CategoryTypeSelect id="categoryType" name="type" defaultValue="expense" />
            </div>
            <ActionError message={createState.error} />
            <Button type="submit" disabled={createPending} className="w-full sm:w-auto">
              {createPending ? "Creating..." : "Create category"}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground">
            Only admin users can create, update, or delete organization categories and subcategories.
          </p>
        </CardContent>
      </Card>

      <Card className="py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <CardTitle className="text-2xl tracking-tight">Organization categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-6 sm:px-8 sm:pb-8">
          {categories.length ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="category-search">Search</Label>
                <Input
                  id="category-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name, type, or subcategory..."
                />
              </div>
              {filteredCategories.length ? (
                <div className="grid gap-3">
                  {filteredCategories.map((category) => (
                    <CategoryRow key={category.id} category={category} subcategories={subcategories} />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                  No categories match your search.
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
              No categories yet. Create the first category to start budgeting.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
