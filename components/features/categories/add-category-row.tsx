"use client";

import { useActionState, useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { createCategoryWithSubcategoriesAction } from "@/app/actions/auth-roles/organization-finance.actions";
import { financeInitialState } from "@/app/actions/auth-roles/finance.types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ActionError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function NewSubcategoryChips({
  names,
  onChange,
}: {
  names: string[];
  onChange: (names: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function addDraft() {
    const trimmed = draft.trim();
    if (trimmed.length < 2) return;
    if (names.some((name) => name.toLowerCase() === trimmed.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...names, trimmed]);
    setDraft("");
  }

  function removeName(name: string) {
    onChange(names.filter((n) => n !== name));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addDraft();
      return;
    }
    if (event.key === "Backspace" && !draft && names.length) {
      removeName(names[names.length - 1]);
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="new-category-subcategories">Subcategories (optional)</Label>
      {names.map((name) => (
        <input key={name} type="hidden" name="subcategoryNames" value={name} />
      ))}
      <div
        className="flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 text-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
        onClick={(event) => event.currentTarget.querySelector("input")?.focus()}
      >
        {names.map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground"
          >
            {name}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                removeName(name);
              }}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label={`Remove ${name}`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id="new-category-subcategories"
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addDraft}
          placeholder={names.length ? "" : "Type a subcategory and press Enter..."}
          className="min-w-32 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}

export function AddCategoryRow() {
  const [state, formAction, pending] = useActionState(createCategoryWithSubcategoriesAction, financeInitialState);
  const [subcategoryNames, setSubcategoryNames] = useState<string[]>([]);

  return (
    <Card className="py-2">
      <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
        <CardTitle className="text-xl tracking-tight">Create category</CardTitle>
        <p className="text-sm text-muted-foreground">
          Add a category and, optionally, its starting subcategories in one go. You can attach more subcategories to
          any category later from the table below.
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-6 sm:px-8 sm:pb-8">
        <form
          key={state.error ? "retry" : "new-category"}
          action={formAction}
          className="space-y-4 rounded-lg border bg-muted/20 p-4"
        >
          <div className="grid gap-4 md:grid-cols-[1fr_180px]">
            <div className="space-y-2">
              <Label htmlFor="new-category-name">Category name</Label>
              <Input id="new-category-name" name="name" placeholder="Food" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-category-type">Type</Label>
              <select
                id="new-category-type"
                name="type"
                defaultValue="expense"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
          </div>

          <NewSubcategoryChips names={subcategoryNames} onChange={setSubcategoryNames} />

          <ActionError message={state.error} />

          <Button type="submit" disabled={pending}>
            {pending ? "Creating..." : "Create"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
