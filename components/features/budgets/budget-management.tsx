"use client";

import { useActionState, useMemo, useState } from "react";
import { AlertCircle, TriangleAlert, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MonthInput } from "@/components/ui/month-input";
import type {
  BudgetAllocationSummaryDto,
  BudgetRecordDto,
  CategoryRecordDto,
  FinanceMemberDto,
  OrganizationFinanceDataDto,
} from "@/app/lib/finance.types";
import { financeInitialState } from "@/app/actions/auth-roles/finance.types";
import {
  createFamilyBudgetAction,
  createPersonalBudgetAction,
  deleteFamilyBudgetAction,
  deletePersonalBudgetAction,
  updateFamilyBudgetAction,
  updatePersonalBudgetAction,
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

const moneyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatMoney(amount: string) {
  return moneyFormatter.format(Number(amount));
}

function formatBudgetShare(amount: string, familyAmount: string) {
  const familyValue = Number(familyAmount);
  if (!familyValue) return "—";

  const sharePercent = Number(((Number(amount) / familyValue) * 100).toFixed(0));
  return `${sharePercent}% of family budget`;
}

function getMemberName(memberLookup: Map<string, string>, userId: string | null) {
  if (!userId) return "Unknown user";
  return memberLookup.get(userId) ?? `User ${userId.slice(0, 8)}`;
}

function CategorySelect({
  categories,
  name,
  defaultValue,
}: {
  categories: CategoryRecordDto[];
  name: string;
  defaultValue?: number;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue ?? categories[0]?.id}
      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      required
    >
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </select>
  );
}

function BudgetEditor({
  budget,
  categories,
  updateAction,
  deleteAction,
  updatePending,
  deletePending,
  updateError,
  deleteError,
}: {
  budget: BudgetRecordDto;
  categories: CategoryRecordDto[];
  updateAction: (formData: FormData) => void;
  deleteAction: (formData: FormData) => void;
  updatePending: boolean;
  deletePending: boolean;
  updateError: string | null;
  deleteError: string | null;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <form action={updateAction} className="space-y-4">
        <input type="hidden" name="budgetId" value={budget.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Category</Label>
            <CategorySelect categories={categories} name="categoryId" defaultValue={budget.categoryId} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`amount-${budget.id}`}>Amount</Label>
            <Input id={`amount-${budget.id}`} name="amount" type="number" min="1" step="0.01" defaultValue={budget.amount} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`month-${budget.id}`}>Budget month</Label>
            <MonthInput id={`month-${budget.id}`} name="month" defaultValue={budget.month} required />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{budget.monthLabel}</p>
        <ActionError message={updateError} />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="submit" disabled={updatePending} className="w-full sm:w-auto">
            {updatePending ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
      <form action={deleteAction} className="mt-3">
        <input type="hidden" name="budgetId" value={budget.id} />
        <ActionError message={deleteError} />
        <Button type="submit" variant="outline" className="mt-2 w-full sm:w-auto" disabled={deletePending}>
          <Trash2 className="mr-2 size-4" />
          {deletePending ? "Deleting..." : "Delete"}
        </Button>
      </form>
    </div>
  );
}

function PersonalBudgetRow({
  budget,
  categories,
}: {
  budget: BudgetRecordDto;
  categories: CategoryRecordDto[];
}) {
  const [updateState, updateAction, updatePending] = useActionState(
    updatePersonalBudgetAction,
    financeInitialState
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deletePersonalBudgetAction,
    financeInitialState
  );

  return (
    <BudgetEditor
      budget={budget}
      categories={categories}
      updateAction={updateAction}
      deleteAction={deleteAction}
      updatePending={updatePending}
      deletePending={deletePending}
      updateError={updateState.error}
      deleteError={deleteState.error}
    />
  );
}

function FamilyBudgetRow({
  budget,
  categories,
}: {
  budget: BudgetRecordDto;
  categories: CategoryRecordDto[];
}) {
  const [updateState, updateAction, updatePending] = useActionState(
    updateFamilyBudgetAction,
    financeInitialState
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteFamilyBudgetAction,
    financeInitialState
  );

  return (
    <BudgetEditor
      budget={budget}
      categories={categories}
      updateAction={updateAction}
      deleteAction={deleteAction}
      updatePending={updatePending}
      deletePending={deletePending}
      updateError={updateState.error}
      deleteError={deleteState.error}
    />
  );
}

function AllocationSummaryPanel({
  summaries,
  members,
}: {
  summaries: BudgetAllocationSummaryDto[];
  members: FinanceMemberDto[];
}) {
  const latestSummariesByCategory = useMemo(() => {
    const map = new Map<number, BudgetAllocationSummaryDto>();
    for (const summary of summaries) {
      map.set(summary.categoryId, summary);
    }
    return map;
  }, [summaries]);

  const categories = useMemo(
    () =>
      Array.from(latestSummariesByCategory.values()).map((summary) => ({
        id: summary.categoryId,
        name: summary.categoryName,
      })),
    [latestSummariesByCategory]
  );

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    categories[0] ? String(categories[0].id) : ""
  );
  const resolvedSelectedCategoryId =
    selectedCategoryId && categories.some((category) => String(category.id) === selectedCategoryId)
      ? selectedCategoryId
      : categories[0]
        ? String(categories[0].id)
        : "";

  const selectedSummary = useMemo(() => {
    if (!summaries.length) return null;

    const selectedId = resolvedSelectedCategoryId ? Number(resolvedSelectedCategoryId) : categories[0]?.id;
    if (!selectedId) return summaries[0];

    return latestSummariesByCategory.get(selectedId) ?? summaries[0];
  }, [categories, latestSummariesByCategory, resolvedSelectedCategoryId, summaries]);

  if (!summaries.length) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
        Add a family budget to see allocation summaries and overage warnings.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:max-w-sm">
        <Label htmlFor="allocation-category-filter" className="text-sm font-medium">
          Category
        </Label>
        <select
          id="allocation-category-filter"
          value={resolvedSelectedCategoryId}
          onChange={(event) => setSelectedCategoryId(event.target.value)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {selectedSummary ? <SummaryCard summary={selectedSummary} members={members} /> : null}
    </div>
  );
}

function PersonalBudgetSection({
  categories,
  budgets,
}: {
  categories: CategoryRecordDto[];
  budgets: BudgetRecordDto[];
}) {
  const [createState, createAction, createPending] = useActionState(
    createPersonalBudgetAction,
    financeInitialState
  );

  if (!categories.length) {
    return (
      <Card className="py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <CardTitle className="text-2xl tracking-tight">Personal budgets</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-6 sm:px-8 sm:pb-8">
          <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
            Ask an admin to create expense categories before adding budgets.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="py-2">
      <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
        <CardTitle className="text-2xl tracking-tight">Personal budgets</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-6 sm:px-8 sm:pb-8">
        <form action={createAction} className="grid gap-4 rounded-lg border border-primary/20 bg-primary/5 p-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Category</Label>
            <CategorySelect categories={categories} name="categoryId" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="personal-amount">Amount</Label>
            <Input id="personal-amount" name="amount" type="number" min="1" step="0.01" placeholder="5000" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="personal-month">Budget month</Label>
            <MonthInput id="personal-month" name="month" required />
          </div>
          <div className="sm:col-span-2">
            <ActionError message={createState.error} />
            <Button type="submit" disabled={createPending} className="w-full sm:w-auto">
              {createPending ? "Creating..." : "Create personal budget"}
            </Button>
          </div>
        </form>

        <div className="grid gap-3">
          {budgets.length ? (
            budgets.map((budget) => (
              <PersonalBudgetRow key={budget.id} budget={budget} categories={categories} />
            ))
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
              No personal budgets yet. Add one to get started.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FamilyBudgetSection({
  categories,
  budgets,
}: {
  categories: CategoryRecordDto[];
  budgets: BudgetRecordDto[];
}) {
  const [createState, createAction, createPending] = useActionState(
    createFamilyBudgetAction,
    financeInitialState
  );

  if (!categories.length) {
    return (
      <Card className="py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <CardTitle className="text-2xl tracking-tight">Family budgets</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-6 sm:px-8 sm:pb-8">
          <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
            Create expense categories before adding family budgets.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="py-2">
      <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
        <CardTitle className="text-2xl tracking-tight">Family budgets</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-6 sm:px-8 sm:pb-8">
        <form action={createAction} className="grid gap-4 rounded-lg border border-primary/20 bg-primary/5 p-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Category</Label>
            <CategorySelect categories={categories} name="categoryId" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="family-amount">Amount</Label>
            <Input id="family-amount" name="amount" type="number" min="1" step="0.01" placeholder="15000" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="family-month">Budget month</Label>
            <MonthInput id="family-month" name="month" required />
          </div>
          <div className="sm:col-span-2">
            <ActionError message={createState.error} />
            <Button type="submit" disabled={createPending} className="w-full sm:w-auto">
              {createPending ? "Creating..." : "Create family budget"}
            </Button>
          </div>
        </form>

        <div className="grid gap-3">
          {budgets.length ? (
            budgets.map((budget) => (
              <FamilyBudgetRow key={budget.id} budget={budget} categories={categories} />
            ))
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
              No family budgets yet. Admins can add one for the organization.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryCard({
  summary,
  members,
}: {
  summary: BudgetAllocationSummaryDto;
  members: FinanceMemberDto[];
}) {
  const isOverBudget = Boolean(summary.overageAmount);
  const memberLookup = new Map(members.map((member) => [member.id, member.name]));

  return (
    <Card className="py-2">
      <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-xl tracking-tight">{summary.categoryName}</CardTitle>
          {isOverBudget ? (
            <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-700 dark:text-amber-400">
              <TriangleAlert className="size-3.5" />
              Over budget
            </Badge>
          ) : (
            <Badge variant="secondary">Within budget</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{summary.monthLabel}</p>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-6 sm:px-8 sm:pb-8">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Family Budget</p>
            <p className="mt-2 text-lg font-semibold">
              {summary.familyBudget ? formatMoney(summary.familyBudget.amount) : "—"}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Personal budgets</p>
            <p className="mt-2 text-lg font-semibold">{formatMoney(summary.personalTotal)}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Available capacity</p>
            <p className="mt-2 text-lg font-semibold">
              {summary.availableCapacityAmount !== null
                ? `${formatMoney(summary.availableCapacityAmount)}${
                    summary.availableCapacityPercent !== null ? ` (${summary.availableCapacityPercent}%)` : ""
                  }`
                : "—"}
            </p>
          </div>
        </div>
        {isOverBudget ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
            ⚠ Family {summary.categoryName} budget exceeded by {formatMoney(summary.overageAmount ?? "0")}
          </div>
        ) : null}

        <div className="rounded-lg border bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Family allocation details</p>
            <Badge variant="outline">{summary.personalBudgets.length} user(s)</Badge>
          </div>
          {summary.personalBudgets.length ? (
            <ul className="mt-3 space-y-2">
              {summary.personalBudgets.map((budget) => (
                <li
                  key={budget.id}
                  className="flex flex-col gap-1 rounded-md border bg-background/70 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{getMemberName(memberLookup, budget.userId)}</p>
                    <p className="text-xs text-muted-foreground">{budget.monthLabel}</p>
                  </div>
                  <div className="text-sm text-muted-foreground sm:text-right">
                    <p className="font-medium text-foreground">{formatMoney(budget.amount)}</p>
                    <p>{formatBudgetShare(budget.amount, summary.familyBudget?.amount ?? "0")}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No personal budgets have been assigned to this family budget yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function BudgetManagement({
  data,
  showFamilyBudgetSection = true,
}: {
  data: OrganizationFinanceDataDto;
  showFamilyBudgetSection?: boolean;
}) {
  const expenseCategories = data.categories.filter((category) => category.type === "expense");
  const personalBudgets = data.budgets.filter(
    (budget) => budget.scope === "personal" && budget.userId === data.currentUser.id
  );
  const familyBudgets = data.budgets.filter((budget) => budget.scope === "family");

  return (
    <section className="space-y-6">
      <Card className="py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <CardTitle className="text-3xl tracking-tight">Budgets & allocation</CardTitle>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {showFamilyBudgetSection
              ? "Manage personal and family budgets here. Family budgets are soft constraints, so we always allow saving even when personal goals total more than the family target."
              : "Manage your personal budgets here and keep an eye on shared allocation summaries."}
          </p>
        </CardHeader>
        <CardContent className="px-4 pb-6 sm:px-8 sm:pb-8">
          <AllocationSummaryPanel summaries={data.allocationSummaries} members={data.members} />
        </CardContent>
      </Card>

      <PersonalBudgetSection categories={expenseCategories} budgets={personalBudgets} />

      {showFamilyBudgetSection ? (
        <FamilyBudgetSection categories={expenseCategories} budgets={familyBudgets} />
      ) : null}

      {!expenseCategories.length ? (
        <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
          You need expense categories before budgets can be created. Ask an admin to add them first.
        </div>
      ) : null}
    </section>
  );
}
