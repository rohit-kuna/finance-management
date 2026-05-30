"use client";

import { useActionState } from "react";
import { AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CategoryRecordDto } from "@/app/lib/finance.types";
import { financeInitialState } from "@/app/actions/auth-roles/finance.types";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/app/actions/auth-roles/organization-finance.actions";

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

function CategoryRow({ category }: { category: CategoryRecordDto }) {
  const [updateState, updateAction, updatePending] = useActionState(
    updateCategoryAction,
    financeInitialState
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteCategoryAction,
    financeInitialState
  );

  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <form action={updateAction} className="space-y-3">
        <input type="hidden" name="categoryId" value={category.id} />
        <div className="space-y-2">
          <Label htmlFor={`category-${category.id}`}>Category name</Label>
          <Input
            id={`category-${category.id}`}
            name="name"
            defaultValue={category.name}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`category-type-${category.id}`}>Type</Label>
          <CategoryTypeSelect
            id={`category-type-${category.id}`}
            name="type"
            defaultValue={category.type}
          />
        </div>
        <ActionError message={updateState.error} />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={updatePending}>
            {updatePending ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
      <form action={deleteAction} className="mt-3">
        <input type="hidden" name="categoryId" value={category.id} />
        <ActionError message={deleteState.error} />
        <Button
          type="submit"
          variant="outline"
          className="mt-2"
          disabled={deletePending}
        >
          <Trash2 className="mr-2 size-4" />
          {deletePending ? "Deleting..." : "Delete"}
        </Button>
      </form>
    </div>
  );
}

export function CategoryManagement({
  categories,
}: {
  categories: CategoryRecordDto[];
}) {
  const [createState, createAction, createPending] = useActionState(
    createCategoryAction,
    financeInitialState
  );

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
              <CategoryTypeSelect id="categoryType" name="type" />
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
            <div className="grid gap-3">
              {categories.map((category) => (
                <CategoryRow key={category.id} category={category} />
              ))}
            </div>
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
