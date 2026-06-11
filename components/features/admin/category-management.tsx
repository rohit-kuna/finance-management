"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { AlertCircle, PencilLine, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

function CategoryFormCard({
  editingCategory,
  tags,
  categoryTags,
  onCancelEdit,
}: {
  editingCategory: CategoryRecordDto | null;
  tags: TagRecordDto[];
  categoryTags: CategoryTagRecordDto[];
  onCancelEdit: () => void;
}) {
  const [createState, createAction, createPending] = useActionState(
    createCategoryAction,
    financeInitialState
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateCategoryAction,
    financeInitialState
  );
  const [tagsState, tagsAction, tagsPending] = useActionState(
    updateCategoryTagsAction,
    financeInitialState
  );

  const isEditing = Boolean(editingCategory);
  const activeAction = isEditing ? updateAction : createAction;
  const activePending = isEditing ? updatePending : createPending;
  const activeError = isEditing ? updateState.error : createState.error;

  const selectedTagIds = editingCategory
    ? categoryTags.filter((entry) => entry.categoryId === editingCategory.id).map((entry) => entry.tagId)
    : [];

  return (
    <Card className="border-primary/20 bg-primary/5 py-2">
      <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
        <CardTitle className="text-2xl tracking-tight">
          {isEditing ? "Edit category" : "Create category"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-6 sm:px-8 sm:pb-8">
        <form
          key={editingCategory?.id ?? "new-category"}
          action={activeAction}
          className="space-y-4 rounded-lg border border-primary/20 bg-background/80 p-4"
        >
          {editingCategory ? <input type="hidden" name="categoryId" value={editingCategory.id} /> : null}
          <div className="space-y-2">
            <Label htmlFor="categoryName">Category name</Label>
            <Input
              id="categoryName"
              name="name"
              placeholder="Food"
              defaultValue={editingCategory?.name ?? ""}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="categoryType">Type</Label>
            <CategoryTypeSelect
              id="categoryType"
              name="type"
              defaultValue={editingCategory?.type ?? "expense"}
            />
          </div>
          <ActionError message={activeError} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" disabled={activePending} className="w-full sm:w-auto">
              {activePending
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                  ? "Save category"
                  : "Create category"}
            </Button>
            {isEditing ? (
              <Button type="button" variant="outline" onClick={onCancelEdit} className="w-full sm:w-auto">
                <X className="mr-2 size-4" />
                Cancel
              </Button>
            ) : null}
          </div>
        </form>

        {editingCategory ? (
          <form
            key={`tags-${editingCategory.id}`}
            action={tagsAction}
            className="space-y-2 rounded-lg border border-primary/20 bg-background/80 p-4"
          >
            <input type="hidden" name="categoryId" value={editingCategory.id} />
            <Label htmlFor={`category-tags-${editingCategory.id}`}>Tags</Label>
            <TagMultiSelect
              key={selectedTagIds.join(",")}
              name="tagIds"
              tags={tags}
              categoryTags={categoryTags}
              categoryId={editingCategory.id}
              defaultSelectedIds={selectedTagIds}
            />
            <ActionError message={tagsState.error} />
            <Button type="submit" variant="outline" disabled={tagsPending}>
              {tagsPending ? "Saving..." : "Save tags"}
            </Button>
          </form>
        ) : null}

        <p className="text-sm text-muted-foreground">
          Only admin users can create, update, or delete organization categories.
        </p>
      </CardContent>
    </Card>
  );
}

function CategoryRowActions({
  category,
  onEdit,
}: {
  category: CategoryRecordDto;
  onEdit: (category: CategoryRecordDto) => void;
}) {
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteCategoryAction,
    financeInitialState
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteFormRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => onEdit(category)}
          aria-label="Edit category"
          title="Edit category"
        >
          <PencilLine className="size-4" />
        </Button>
        <form ref={deleteFormRef} action={deleteAction}>
          <input type="hidden" name="categoryId" value={category.id} />
          <Button
            type="button"
            variant="destructive"
            size="icon-sm"
            disabled={deletePending}
            aria-label="Delete category"
            title="Delete category"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="size-4" />
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
      <ActionError message={deleteState.error} />
    </div>
  );
}

function CategoryTable({
  categories,
  tags,
  categoryTags,
  onEdit,
}: {
  categories: CategoryRecordDto[];
  tags: TagRecordDto[];
  categoryTags: CategoryTagRecordDto[];
  onEdit: (category: CategoryRecordDto) => void;
}) {
  const [query, setQuery] = useState("");

  const tagNamesById = useMemo(() => {
    const map = new Map<number, string>();
    for (const tag of tags) {
      map.set(tag.id, tag.name);
    }
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
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="category-search">Search</Label>
        <Input
          id="category-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, type, or tag..."
        />
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCategories.length ? (
              filteredCategories.map((category) => {
                const tagNames = tagNamesByCategoryId.get(category.id) ?? [];

                return (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className="font-medium">{category.name}</div>
                      <Badge variant="secondary" className="mt-1">
                        {category.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {tagNames.length ? (
                        <div className="flex max-w-65 flex-wrap gap-1">
                          {tagNames.map((tagName) => (
                            <Badge key={tagName} variant="secondary">
                              {tagName}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top whitespace-nowrap text-center">
                      <CategoryRowActions category={category} onEdit={onEdit} />
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                  No categories match your search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
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
  const [editingCategory, setEditingCategory] = useState<CategoryRecordDto | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  function handleEdit(category: CategoryRecordDto) {
    setEditingCategory(category);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="space-y-6">
      <div ref={formRef}>
        <CategoryFormCard
          editingCategory={editingCategory}
          tags={tags}
          categoryTags={categoryTags}
          onCancelEdit={() => setEditingCategory(null)}
        />
      </div>

      <Card className="py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <CardTitle className="text-2xl tracking-tight">Organization categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-6 sm:px-8 sm:pb-8">
          {categories.length ? (
            <CategoryTable categories={categories} tags={tags} categoryTags={categoryTags} onEdit={handleEdit} />
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
