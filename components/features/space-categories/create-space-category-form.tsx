"use client";

import { useActionState } from "react";
import { financeInitialState } from "@/app/actions/auth-roles/finance.types";
import { createSpaceCategoryAction } from "@/app/actions/auth-roles/organization-finance.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateSpaceCategoryForm() {
  const [state, formAction, pending] = useActionState(createSpaceCategoryAction, financeInitialState);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
      <div className="space-y-2">
        <Label htmlFor="new-space-category-name">Space Category name</Label>
        <Input id="new-space-category-name" name="name" placeholder="e.g. Groceries" required minLength={2} maxLength={100} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-space-category-type">Type</Label>
        <select
          id="new-space-category-type"
          name="type"
          defaultValue="expense"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding..." : "Add Space Category"}
      </Button>
      {state.error ? <p className="text-xs text-destructive sm:col-span-3">{state.error}</p> : null}
    </form>
  );
}
