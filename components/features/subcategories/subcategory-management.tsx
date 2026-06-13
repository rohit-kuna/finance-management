"use client";

import { useActionState, useMemo, useState } from "react";
import { AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { CategoryRecordDto, SubcategoryRecordDto } from "@/app/lib/finance.types";
import { financeInitialState } from "@/app/actions/auth-roles/finance.types";
import {
  createSubcategoryAction,
  deleteSubcategoryAction,
  updateSubcategoryAction,
} from "@/app/actions/auth-roles/subcategories.actions";
import { ROUTES } from "@/app/lib/constants";

function ActionError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function SubcategoryRow({
  subcategory,
  canManage,
}: {
  subcategory: SubcategoryRecordDto;
  canManage: boolean;
}) {
  const [updateState, updateAction, updatePending] = useActionState(updateSubcategoryAction, financeInitialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteSubcategoryAction, financeInitialState);

  if (!canManage) {
    return (
      <div className="flex items-center justify-between rounded-md border bg-background p-3">
        <span className="text-sm">{subcategory.name}</span>
        <span className="text-xs text-muted-foreground">Added by another member</span>
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-background p-3">
      <form action={updateAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="subcategoryId" value={subcategory.id} />
        <input type="hidden" name="categoryId" value={subcategory.categoryId} />
        <input type="hidden" name="returnTo" value={ROUTES.SUBCATEGORIES} />
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
        <input type="hidden" name="returnTo" value={ROUTES.SUBCATEGORIES} />
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
  currentUserId,
}: {
  category: CategoryRecordDto;
  subcategories: SubcategoryRecordDto[];
  currentUserId: string;
}) {
  const [createState, createAction, createPending] = useActionState(createSubcategoryAction, financeInitialState);
  const categorySubcategories = subcategories.filter((subcategory) => subcategory.categoryId === category.id);

  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{category.name}</span>
        <Badge variant="secondary">{category.type}</Badge>
      </div>

      <div className="mt-4 space-y-2">
        <Label>Subcategories</Label>
        {categorySubcategories.length ? (
          <div className="grid gap-2">
            {categorySubcategories.map((subcategory) => (
              <SubcategoryRow
                key={subcategory.id}
                subcategory={subcategory}
                canManage={subcategory.createdBy === currentUserId}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No subcategories yet.</p>
        )}

        <form action={createAction} className="flex flex-wrap items-end gap-2 pt-2">
          <input type="hidden" name="categoryId" value={category.id} />
          <input type="hidden" name="returnTo" value={ROUTES.SUBCATEGORIES} />
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
    </div>
  );
}

export function SubcategoryManagement({
  categories,
  subcategories,
  currentUserId,
}: {
  categories: CategoryRecordDto[];
  subcategories: SubcategoryRecordDto[];
  currentUserId: string;
}) {
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
    <section>
      <Card className="py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <CardTitle className="text-2xl tracking-tight">Subcategories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-6 sm:px-8 sm:pb-8">
          <p className="text-sm text-muted-foreground">
            Add subcategories to any existing category. You can edit or delete subcategories you created;
            subcategories added by other members are read-only.
          </p>
          {categories.length ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="category-search">Search</Label>
                <Input
                  id="category-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by category or subcategory..."
                />
              </div>
              {filteredCategories.length ? (
                <div className="grid gap-3">
                  {filteredCategories.map((category) => (
                    <CategoryRow
                      key={category.id}
                      category={category}
                      subcategories={subcategories}
                      currentUserId={currentUserId}
                    />
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
              No categories yet. Ask an admin to create a category first.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
