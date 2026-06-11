"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CategoryRecordDto, CategoryTagRecordDto, TagRecordDto } from "@/app/lib/finance.types";
import { financeInitialState } from "@/app/actions/auth-roles/finance.types";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
  updateCategoryTagsAction,
} from "@/app/actions/auth-roles/organization-finance.actions";
import { TagMultiSelect } from "@/components/features/expenses/tag-multi-select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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

function CategoryRow({
  category,
  tags,
  categoryTags,
}: {
  category: CategoryRecordDto;
  tags: TagRecordDto[];
  categoryTags: CategoryTagRecordDto[];
}) {
  const [updateState, updateAction, updatePending] = useActionState(updateCategoryAction, financeInitialState);
  const [tagsState, tagsAction, tagsPending] = useActionState(updateCategoryTagsAction, financeInitialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteCategoryAction, financeInitialState);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteFormRef = useRef<HTMLFormElement>(null);

  const selectedTagIds = categoryTags
    .filter((entry) => entry.categoryId === category.id)
    .map((entry) => entry.tagId);

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

      <form action={tagsAction} className="mt-3 space-y-2">
        <input type="hidden" name="categoryId" value={category.id} />
        <Label htmlFor={`category-tags-${category.id}`}>Tags</Label>
        <TagMultiSelect
          name="tagIds"
          tags={tags}
          categoryTags={categoryTags}
          categoryId={category.id}
          defaultSelectedIds={selectedTagIds}
        />
        <ActionError message={tagsState.error} />
        <Button type="submit" variant="outline" disabled={tagsPending}>
          {tagsPending ? "Saving..." : "Save tags"}
        </Button>
      </form>

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
  tags,
  categoryTags,
}: {
  categories: CategoryRecordDto[];
  tags: TagRecordDto[];
  categoryTags: CategoryTagRecordDto[];
}) {
  const [createState, createAction, createPending] = useActionState(createCategoryAction, financeInitialState);
  const [query, setQuery] = useState("");

  const tagNamesById = useMemo(() => {
    const map = new Map<number, string>();
    for (const tag of tags) map.set(tag.id, tag.name);
    return map;
  }, [tags]);

  const tagNamesByCategoryId = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const entry of categoryTags) {
      const name = tagNamesById.get(entry.tagId);
      if (!name) continue;
      const current = map.get(entry.categoryId) ?? [];
      current.push(name);
      map.set(entry.categoryId, current);
    }
    return map;
  }, [categoryTags, tagNamesById]);

  const filteredCategories = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();
    if (!loweredQuery) return categories;

    return categories.filter((category) => {
      const tagNames = tagNamesByCategoryId.get(category.id) ?? [];
      return [category.name, category.type, ...tagNames].some((value) =>
        value.toLowerCase().includes(loweredQuery)
      );
    });
  }, [categories, query, tagNamesByCategoryId]);

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
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
            Only admin users can create, update, or delete organization categories.
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
                  placeholder="Search by name, type, or tag..."
                />
              </div>
              {filteredCategories.length ? (
                <div className="grid gap-3">
                  {filteredCategories.map((category) => (
                    <CategoryRow key={category.id} category={category} tags={tags} categoryTags={categoryTags} />
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
