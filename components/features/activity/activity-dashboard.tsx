"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MonthInput } from "@/components/ui/month-input";
import { cn } from "@/lib/utils";
import type { ActivityDashboardDataDto } from "@/app/lib/activity.types";

const moneyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const compactMoneyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

const monthLabelFormatter = new Intl.DateTimeFormat("en-IN", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const chartPalette = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

const untaggedColor = "var(--color-muted-foreground)";

const expenseLegendItems = [
  { label: "Income", color: "var(--color-chart-2)" },
  { label: "Expense", color: "var(--color-chart-1)" },
] as const;

const budgetVsActualLegendItems = [
  { label: "Budgeted amount", color: "var(--color-chart-4)" },
  { label: "Actual spend", color: "var(--color-chart-1)" },
] as const;

const trendLegendItems = [
  { label: "Previous period", color: "var(--color-chart-4)" },
  { label: "Current period", color: "var(--color-chart-2)" },
] as const;

type NecessityScore = 1 | 2 | 3 | 4 | 5;
type ActivityAudience = "personal" | "family" | `member:${string}`;

const necessityLabels: Record<NecessityScore, string> = {
  1: "Optional",
  2: "Nice to Have",
  3: "Moderate",
  4: "Important",
  5: "Essential",
};

const necessityOrder: NecessityScore[] = [5, 4, 3, 2, 1];
type CategoryTransactionType = "expense" | "income";

function formatMoney(amount: number) {
  return moneyFormatter.format(amount);
}

function formatCompactMoney(amount: number) {
  return compactMoneyFormatter.format(amount);
}

function getMonthKey(dateString: string) {
  return dateString.slice(0, 7);
}

function getMonthLabel(monthKey: string) {
  return monthLabelFormatter.format(new Date(`${monthKey}-01T00:00:00Z`));
}

function monthKeyToDate(monthKey: string) {
  return new Date(`${monthKey}-01T00:00:00Z`);
}

function buildMonthRange(startMonth: string, endMonth: string) {
  const startDate = monthKeyToDate(startMonth);
  const endDate = monthKeyToDate(endMonth);
  const safeStart = startDate <= endDate ? startDate : endDate;
  const safeEnd = startDate <= endDate ? endDate : startDate;
  const months: string[] = [];
  const cursor = new Date(safeStart);

  while (cursor <= safeEnd) {
    months.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return months;
}

function formatDateLabel(dateString: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${dateString}T00:00:00Z`));
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getDateRange(startDate: Date, endDate: Date) {
  const days: string[] = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

function FilterChip({
  active,
  children,
  onClick,
  className,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background hover:bg-muted",
        className
      )}
    >
      {children}
    </button>
  );
}

function getScopedActivityData(data: ActivityDashboardDataDto, audience: ActivityAudience) {
  if (audience === "family") {
    return {
      ...data,
      budgets: data.budgets.filter((budget) => budget.scope === "family"),
      expenses: data.expenses,
    };
  }

  if (audience.startsWith("member:")) {
    const memberId = audience.slice("member:".length);

    return {
      ...data,
      budgets: data.budgets.filter(
        (budget) => budget.scope === "personal" && budget.userId === memberId
      ),
      expenses: data.expenses.filter((expense) => expense.userId === memberId),
    };
  }

  return {
    ...data,
    budgets: data.budgets.filter(
      (budget) => budget.scope === "personal" && budget.userId === data.currentUser.id
    ),
    expenses: data.expenses.filter((expense) => expense.userId === data.currentUser.id),
  };
}

function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-500/20 bg-emerald-500/5"
      : tone === "warning"
        ? "border-amber-500/20 bg-amber-500/5"
        : tone === "danger"
          ? "border-destructive/20 bg-destructive/5"
          : "bg-muted/20";

  return (
    <div className={cn("rounded-xl border p-4", toneClass)}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

function OrderedLegend({
  items,
}: {
  items: readonly { label: string; color: string }[];
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-foreground">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-3 w-3 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

type BudgetVsActualTooltipPayload = {
  payload?: {
    categoryName: string;
    budget: number;
    actual: number;
    remaining: number;
    overBudget: number;
  };
};

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <CardTitle className="text-2xl tracking-tight">{title}</CardTitle>
      <p className="max-w-4xl text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function CategoryGroupFilter({
  categories,
  selectedValues,
  onChange,
}: {
  categories: ActivityDashboardDataDto["categories"];
  selectedValues: string[];
  onChange: (nextValues: string[]) => void;
}) {
  const incomeCategories = categories.filter((category) => category.type === "income");
  const expenseCategories = categories.filter((category) => category.type === "expense");
  const isAllSelected = selectedValues.length === 0;

  function toggleValue(value: string) {
    const nextValues = selectedValues.includes(value)
      ? selectedValues.filter((currentValue) => currentValue !== value)
      : [...selectedValues, value];

    onChange(nextValues);
  }

  function renderGroup(
    title: string,
    items: ActivityDashboardDataDto["categories"],
    emptyMessage: string
  ) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
        {items.length ? (
          <div className="flex flex-wrap gap-2">
            {items.map((category) => (
              <FilterChip
                key={category.id}
                active={selectedValues.includes(String(category.id))}
                onClick={() => toggleValue(String(category.id))}
              >
                {category.name}
              </FilterChip>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label>Categories</Label>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <FilterChip active={isAllSelected} onClick={() => onChange([])}>
            All
          </FilterChip>
        </div>
        {renderGroup("Income", incomeCategories, "No income categories available.")}
        {renderGroup("Expense", expenseCategories, "No expense categories available.")}
      </div>
    </div>
  );
}

export function ExpenseActivityChart({
  expenses,
  monthStart,
  monthEnd,
}: {
  expenses: ActivityDashboardDataDto["expenses"];
  monthStart: string;
  monthEnd: string;
}) {
  const chartData = useMemo(() => {
    const months = buildMonthRange(monthStart, monthEnd);
    const filteredExpenses = expenses.filter((expense) => {
      const expenseMonth = getMonthKey(expense.occurredAt);
      return expenseMonth >= monthStart && expenseMonth <= monthEnd;
    });

    return months.map((monthKey) => {
      const monthExpenses = filteredExpenses.filter((expense) => getMonthKey(expense.occurredAt) === monthKey);
      const income = monthExpenses
        .filter((expense) => expense.type === "income")
        .reduce((sum, expense) => sum + Number(expense.amount), 0);
      const expense = monthExpenses
        .filter((item) => item.type === "expense")
        .reduce((sum, item) => sum + Number(item.amount), 0);

      return {
        month: monthKey,
        label: getMonthLabel(monthKey),
        income,
        expense,
        isOverspent: expense > income,
      };
    });
  }, [expenses, monthStart, monthEnd]);

  const totals = useMemo(() => {
    const income = chartData.reduce((sum, item) => sum + item.income, 0);
    const expense = chartData.reduce((sum, item) => sum + item.expense, 0);
    const netSavings = income - expense;
    const overspentMonths = chartData.filter((item) => item.isOverspent).map((item) => item.label);

    return { income, expense, netSavings, overspentMonths };
  }, [chartData]);

  const hasDataInRange = expenses.some((expense) => {
    const expenseMonth = getMonthKey(expense.occurredAt);
    return expenseMonth >= monthStart && expenseMonth <= monthEnd;
  });

  return (
    <Card className="py-2">
      <CardHeader className="space-y-4 px-4 pt-6 sm:px-8 sm:pt-8">
        <SectionHeader
          title="Income vs Expense"
          description="Track cash flow over the selected month range, compare income and spending, and spot when expenses overtake income."
        />

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Range {getMonthLabel(monthStart)} → {getMonthLabel(monthEnd)}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 px-4 pb-6 sm:px-8 sm:pb-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard label="Total income" value={formatMoney(totals.income)} tone="success" />
          <MetricCard label="Total expense" value={formatMoney(totals.expense)} tone="danger" />
          <MetricCard
            label="Net savings"
            value={formatMoney(totals.netSavings)}
            tone={totals.netSavings >= 0 ? "success" : "warning"}
          />
        </div>

        {!hasDataInRange ? (
          <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
            No transaction records match the selected range.
          </div>
        ) : (
          <div className="rounded-2xl border bg-muted/10 p-4">
            <div className="h-[300px] w-full min-w-0 min-h-0 sm:h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 16, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickMargin={10} tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(value) => formatCompactMoney(Number(value))} width={72} tick={{ fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: "var(--color-muted)" }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const income = payload.find((p) => p.dataKey === "income");
                      const expense = payload.find((p) => p.dataKey === "expense");
                      return (
                        <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-lg">
                          <p className="mb-1 font-medium">{String(label)}</p>
                          {income ? <p>Income : {formatMoney(Number(income.value ?? 0))}</p> : null}
                          {expense ? <p>Expense : {formatMoney(Number(expense.value ?? 0))}</p> : null}
                        </div>
                      );
                    }}
                  />
                  <Legend content={<OrderedLegend items={expenseLegendItems} />} />
                  <Bar dataKey="income" name="Income" radius={[6, 6, 0, 0]} minPointSize={4}>
                    {chartData.map((entry) => (
                      <Cell key={`income-${entry.month}`} fill="var(--color-chart-2)" />
                    ))}
                  </Bar>
                  <Bar dataKey="expense" name="Expense" radius={[6, 6, 0, 0]} minPointSize={4}>
                    {chartData.map((entry) => (
                      <Cell
                        key={`expense-${entry.month}`}
                        fill={entry.isOverspent ? "var(--color-destructive)" : "var(--color-chart-1)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {totals.overspentMonths.length ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Spending exceeds income in:</span>
            {totals.overspentMonths.map((month) => (
              <Badge key={month} variant="outline" className="border-destructive/30 text-destructive">
                {month}
              </Badge>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-400">
            Income stays ahead of spending for the selected range.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BudgetVsActualChart({
  budgets,
  expenses,
  monthStart,
  monthEnd,
  audience,
}: {
  budgets: ActivityDashboardDataDto["budgets"];
  expenses: ActivityDashboardDataDto["expenses"];
  monthStart: string;
  monthEnd: string;
  audience: ActivityAudience;
}) {
  const budgetMonths = useMemo(() => {
    const months = budgets
      .filter((budget) => budget.month >= monthStart && budget.month <= monthEnd)
      .map((budget) => budget.month);
    return months.length ? Array.from(new Set(months)).sort() : [];
  }, [budgets, monthStart, monthEnd]);

  const chartData = useMemo(() => {
    const selectedBudgets = budgets.filter(
      (budget) => budget.month >= monthStart && budget.month <= monthEnd
    );
    const selectedExpenses = expenses.filter((expense) => {
      const expenseMonth = getMonthKey(expense.occurredAt);
      return expense.type === "expense" && expenseMonth >= monthStart && expenseMonth <= monthEnd;
    });

    const categoryMap = new Map<
      number,
      {
        categoryId: number;
        categoryName: string;
        budget: number;
        actual: number;
        color: string;
      }
    >();

    const getCategoryColor = (categoryId: number) =>
      chartPalette[(categoryId - 1) % chartPalette.length] ?? "var(--color-chart-4)";

    for (const budget of selectedBudgets) {
      const existing = categoryMap.get(budget.categoryId);
      const nextBudget = (existing?.budget ?? 0) + Number(budget.amount);
      categoryMap.set(budget.categoryId, {
        categoryId: budget.categoryId,
        categoryName: budget.categoryName,
        budget: nextBudget,
        actual: existing?.actual ?? 0,
        color: existing?.color ?? getCategoryColor(budget.categoryId),
      });
    }

    for (const expense of selectedExpenses) {
      const existing = categoryMap.get(expense.categoryId);
      const nextActual = (existing?.actual ?? 0) + Number(expense.amount);
      categoryMap.set(expense.categoryId, {
        categoryId: expense.categoryId,
        categoryName: expense.categoryName,
        budget: existing?.budget ?? 0,
        actual: nextActual,
        color: existing?.color ?? getCategoryColor(expense.categoryId),
      });
    }

    return Array.from(categoryMap.values())
      .sort((left, right) => left.categoryName.localeCompare(right.categoryName))
      .map((item) => ({
        ...item,
        remaining: Math.max(item.budget - item.actual, 0),
        overBudget: Math.max(item.actual - item.budget, 0),
        isOverBudget: item.actual > item.budget,
      }));
  }, [budgets, expenses, monthStart, monthEnd]);

  const totals = useMemo(() => {
    const budget = chartData.reduce((sum, item) => sum + item.budget, 0);
    const actual = chartData.reduce((sum, item) => sum + item.actual, 0);
    const remaining = chartData.reduce((sum, item) => sum + item.remaining, 0);
    const overBudget = chartData.reduce((sum, item) => sum + item.overBudget, 0);

    return { budget, actual, remaining, overBudget };
  }, [chartData]);

  return (
    <Card className="py-2">
      <CardHeader className="space-y-4 px-4 pt-6 sm:px-8 sm:pt-8">
        <SectionHeader
          title="Budget vs Actual Spending"
          description="Compare budgeted amounts with real spending across the selected range, then identify remaining amounts and overspend quickly."
        />

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Range {getMonthLabel(monthStart)} → {getMonthLabel(monthEnd)}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 px-4 pb-6 sm:px-8 sm:pb-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total budget" value={formatMoney(totals.budget)} tone="success" />
          <MetricCard label="Total actual" value={formatMoney(totals.actual)} tone="warning" />
          <MetricCard label="Remaining amount" value={formatMoney(totals.remaining)} tone="default" />
          <MetricCard label="Over budget amount" value={formatMoney(totals.overBudget)} tone="danger" />
        </div>

        {!budgetMonths.length ? (
          <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
            No budgets are available yet for the selected range.
          </div>
        ) : chartData.length ? (
          <div className="rounded-2xl border bg-muted/10 p-4">
            <div className="h-[300px] w-full min-w-0 min-h-0 sm:h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  barSize={32}
                  barCategoryGap="30%"
                  margin={{ top: 16, right: 8, left: 0, bottom: 0 }}
                >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="categoryName" tickMargin={10} interval={0} tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value) => formatCompactMoney(Number(value))} width={72} tick={{ fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;

                    const row = (payload[0] as BudgetVsActualTooltipPayload).payload;
                    if (!row) return null;

                    return (
                      <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-lg">
                        <p className="font-medium">{row.categoryName}</p>
                        <div className="mt-2 space-y-1 text-muted-foreground">
                          <p>Budget: {formatMoney(row.budget)}</p>
                          <p>Actual: {formatMoney(row.actual)}</p>
                          <p>Remaining: {formatMoney(row.remaining)}</p>
                          {row.overBudget > 0 ? <p>Over budget: {formatMoney(row.overBudget)}</p> : null}
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  content={
                    <OrderedLegend
                      items={
                        audience === "family"
                          ? [
                              { label: "Family budget", color: "var(--color-chart-4)" },
                              { label: "Family spend", color: "var(--color-chart-1)" },
                            ]
                          : budgetVsActualLegendItems
                      }
                    />
                  }
                />
                <Bar dataKey="budget" name="Budget" radius={[6, 6, 0, 0]} minPointSize={4}>
                  {chartData.map((entry) => (
                    <Cell key={`budget-${entry.categoryId}`} fill="var(--color-chart-4)" />
                  ))}
                </Bar>
                <Bar dataKey="actual" name="Actual" radius={[6, 6, 0, 0]} minPointSize={4}>
                  {chartData.map((entry) => (
                    <Cell
                      key={`actual-${entry.categoryId}`}
                      fill={entry.isOverBudget ? "var(--color-destructive)" : entry.color}
                    />
                  ))}
                </Bar>
              </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
            No budget or expense data matches the selected range.
          </div>
        )}

        {chartData.some((item) => item.isOverBudget) ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Over budget categories:</span>
            {chartData
              .filter((item) => item.isOverBudget)
              .map((item) => (
                <Badge
                  key={item.categoryId}
                  variant="outline"
                  className="border-destructive/30 text-destructive"
                >
                  {item.categoryName} +{formatMoney(item.overBudget)}
                </Badge>
              ))}
          </div>
        ) : (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-400">
            All visible categories are within budget for the selected range.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CategoryByTypeChart({
  expenses,
  monthStart,
  monthEnd,
  transactionType,
  title,
  description,
  emptyMessage,
  totalLabel,
  topCategoryLabel,
  topCategoriesLabel,
  positiveTone,
}: {
  expenses: ActivityDashboardDataDto["expenses"];
  monthStart: string;
  monthEnd: string;
  transactionType: CategoryTransactionType;
  title: string;
  description: string;
  emptyMessage: string;
  totalLabel: string;
  topCategoryLabel: string;
  topCategoriesLabel: string;
  positiveTone: "warning" | "success";
}) {
  const chartData = useMemo(() => {
    const filtered = expenses.filter((expense) => {
      const expenseMonth = getMonthKey(expense.occurredAt);
      return expense.type === transactionType && expenseMonth >= monthStart && expenseMonth <= monthEnd;
    });

    const totalsByCategory = new Map<
      number,
      {
        categoryId: number;
        categoryName: string;
        amount: number;
        color: string;
      }
    >();

    const getCategoryColor = (categoryId: number) =>
      chartPalette[(categoryId - 1) % chartPalette.length] ?? "var(--color-chart-1)";

    for (const expense of filtered) {
      const existing = totalsByCategory.get(expense.categoryId);
      totalsByCategory.set(expense.categoryId, {
        categoryId: expense.categoryId,
        categoryName: expense.categoryName,
        amount: (existing?.amount ?? 0) + Number(expense.amount),
        color: existing?.color ?? getCategoryColor(expense.categoryId),
      });
    }

    const sorted = Array.from(totalsByCategory.values()).sort((left, right) => right.amount - left.amount);
    const totalAmount = sorted.reduce((sum, item) => sum + item.amount, 0);

    return sorted.map((item, index) => ({
      ...item,
      rank: index + 1,
      percentage: totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0,
      isTopThree: index < 3,
    }));
  }, [expenses, monthStart, monthEnd, transactionType]);

  const totals = useMemo(() => {
    const totalAmount = chartData.reduce((sum, item) => sum + item.amount, 0);
    return {
      totalAmount,
      topCategories: chartData.slice(0, 3),
    };
  }, [chartData]);

  const hasData = chartData.length > 0;

  return (
    <Card className="py-2">
      <CardHeader className="space-y-4 px-4 pt-6 sm:px-8 sm:pt-8">
        <SectionHeader
          title={title}
          description={description}
        />

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Range {getMonthLabel(monthStart)} → {getMonthLabel(monthEnd)}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 px-4 pb-6 sm:px-8 sm:pb-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            label={totalLabel}
            value={formatMoney(totals.totalAmount)}
            tone={totals.totalAmount > 0 ? positiveTone : "default"}
          />
          <MetricCard label={topCategoryLabel} value={totals.topCategories[0]?.categoryName ?? "—"} />
          <MetricCard
            label={topCategoriesLabel}
            value={
              totals.totalAmount > 0
                ? `${(
                    (totals.topCategories.reduce((sum, item) => sum + item.amount, 0) /
                      totals.totalAmount) *
                    100
                  ).toFixed(0)}%`
                : "—"
            }
            tone="success"
          />
        </div>

        {!hasData ? (
          <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div className="rounded-2xl border bg-muted/10 p-4">
            <div className="h-[360px] w-full min-w-0 min-h-0 sm:h-[420px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="amount"
                    nameKey="categoryName"
                    cx="50%"
                    cy="50%"
                    outerRadius="75%"
                    label={({ name, value }) => `${name}: ${formatCompactMoney(Number(value ?? 0))}`}
                  >
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.categoryId}
                        fill={entry.isTopThree ? entry.color : "var(--color-chart-5)"}
                        fillOpacity={entry.isTopThree ? 1 : 0.45}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const entry = payload[0];
                      const row = entry?.payload as (typeof chartData)[number] | undefined;
                      if (!row) return null;
                      return (
                        <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-lg">
                          <p className="mb-1 font-medium">{row.categoryName}</p>
                          <p>{formatMoney(row.amount)} ({row.percentage.toFixed(1)}%)</p>
                        </div>
                      );
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {chartData.length ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">{topCategoriesLabel}:</span>
            {chartData.slice(0, 3).map((item, index) => (
              <Badge
                key={item.categoryId}
                variant="outline"
                className={cn(
                  index === 0 && "border-primary/40 bg-primary/5",
                  index === 1 && "border-chart-2/40 bg-chart-2/5",
                  index === 2 && "border-chart-3/40 bg-chart-3/5"
                )}
              >
                {item.categoryName} • {item.percentage.toFixed(1)}%
              </Badge>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function NecessitySpendChart({
  expenses,
  monthStart,
  monthEnd,
}: {
  expenses: ActivityDashboardDataDto["expenses"];
  monthStart: string;
  monthEnd: string;
}) {
  const chartData = useMemo(() => {
    const filtered = expenses.filter((expense) => {
      const expenseMonth = getMonthKey(expense.occurredAt);
      return expense.type === "expense" && expenseMonth >= monthStart && expenseMonth <= monthEnd;
    });

    const groupedByMonth = new Map<string, Record<NecessityScore, number>>();

    for (const expense of filtered) {
      const monthKey = getMonthKey(expense.occurredAt);
      const existing = groupedByMonth.get(monthKey) ?? {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      };
      existing[expense.necessityScore as NecessityScore] += Number(expense.amount);
      groupedByMonth.set(monthKey, existing);
    }

    const monthKeys = buildMonthRange(monthStart, monthEnd);

    return monthKeys.map((monthKey) => {
      const levels = groupedByMonth.get(monthKey) ?? {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      };

      return {
        month: monthKey,
        label: getMonthLabel(monthKey),
        optional: levels[1],
        niceToHave: levels[2],
        moderate: levels[3],
        important: levels[4],
        essential: levels[5],
        total: necessityOrder.reduce((sum, score) => sum + levels[score], 0),
      };
    });
  }, [expenses, monthStart, monthEnd]);

  const totals = useMemo(() => {
    const totalExpense = chartData.reduce((sum, item) => sum + item.total, 0);
    return {
      totalExpense,
      essential: chartData.reduce((sum, item) => sum + item.essential, 0),
      important: chartData.reduce((sum, item) => sum + item.important, 0),
      moderate: chartData.reduce((sum, item) => sum + item.moderate, 0),
      niceToHave: chartData.reduce((sum, item) => sum + item.niceToHave, 0),
      optional: chartData.reduce((sum, item) => sum + item.optional, 0),
    };
  }, [chartData]);

  const hasData = chartData.some((item) => item.total > 0);

  const pieData = useMemo(() => {
    const entries = [
      { key: "essential", label: necessityLabels[5], amount: totals.essential, color: "var(--color-chart-1)" },
      { key: "important", label: necessityLabels[4], amount: totals.important, color: "var(--color-chart-2)" },
      { key: "moderate", label: necessityLabels[3], amount: totals.moderate, color: "var(--color-chart-3)" },
      { key: "niceToHave", label: necessityLabels[2], amount: totals.niceToHave, color: "var(--color-chart-4)" },
      { key: "optional", label: necessityLabels[1], amount: totals.optional, color: "var(--color-chart-5)" },
    ];
    return entries
      .filter((entry) => entry.amount > 0)
      .map((entry) => ({
        ...entry,
        percentage: totals.totalExpense > 0 ? (entry.amount / totals.totalExpense) * 100 : 0,
      }));
  }, [totals]);

  return (
    <Card className="py-2">
      <CardHeader className="space-y-4 px-4 pt-6 sm:px-8 sm:pt-8">
        <SectionHeader
          title="Spending by Necessity Level"
          description="Break spending down by necessity level across the selected month range."
        />

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Range {getMonthLabel(monthStart)} → {getMonthLabel(monthEnd)}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 px-4 pb-6 sm:px-8 sm:pb-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <MetricCard label="Total expense" value={formatMoney(totals.totalExpense)} tone="danger" />
          <MetricCard label="Essential" value={formatMoney(totals.essential)} tone="success" />
          <MetricCard label="Important" value={formatMoney(totals.important)} tone="warning" />
          <MetricCard label="Moderate" value={formatMoney(totals.moderate)} tone="default" />
          <MetricCard label="Nice to have" value={formatMoney(totals.niceToHave)} tone="default" />
          <MetricCard label="Optional" value={formatMoney(totals.optional)} tone="default" />
        </div>

        {!hasData ? (
          <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
            No spending found for the selected range.
          </div>
        ) : (
          <div className="rounded-2xl border bg-muted/10 p-4">
            <div className="h-[320px] w-full min-w-0 min-h-0 sm:h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="amount"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius="75%"
                    label={({ name, value }) => `${name}: ${formatCompactMoney(Number(value ?? 0))}`}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const entry = payload[0];
                      const row = entry?.payload as (typeof pieData)[number] | undefined;
                      if (!row) return null;
                      return (
                        <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-lg">
                          <p className="mb-1 font-medium">{row.label}</p>
                          <p>{formatMoney(row.amount)} ({row.percentage.toFixed(1)}%)</p>
                        </div>
                      );
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Levels:</span>
          {necessityOrder.map((score) => (
            <Badge
              key={score}
              variant="outline"
              className={cn(
                score === 5 && "border-chart-1/40 bg-chart-1/5",
                score === 4 && "border-chart-2/40 bg-chart-2/5",
                score === 3 && "border-chart-3/40 bg-chart-3/5",
                score === 2 && "border-chart-4/40 bg-chart-4/5",
                score === 1 && "border-chart-5/40 bg-chart-5/5"
              )}
            >
              {necessityLabels[score]}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
function ExpenseTrendChart({
  expenses,
  monthStart,
  monthEnd,
}: {
  expenses: ActivityDashboardDataDto["expenses"];
  monthStart: string;
  monthEnd: string;
}) {
  const chartData = useMemo(() => {
    const currentStart = monthKeyToDate(monthStart);
    const currentEnd = new Date(monthKeyToDate(monthEnd));
    currentEnd.setUTCDate(1);
    currentEnd.setUTCMonth(currentEnd.getUTCMonth() + 1);
    currentEnd.setUTCDate(0);

    const dayCount = Math.max(
      1,
      Math.round((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );

    const previousEnd = addUtcDays(currentStart, -1);
    const previousStart = addUtcDays(currentStart, -dayCount);

    const currentLookup = new Map<string, number>();
    const previousLookup = new Map<string, number>();

    for (const expense of expenses) {
      const expenseDate = new Date(expense.occurredAt);
      const amount = Number(expense.amount);

      if (expenseDate >= currentStart && expenseDate <= currentEnd) {
        const key = expense.occurredAt.slice(0, 10);
        currentLookup.set(key, (currentLookup.get(key) ?? 0) + amount);
      }

      if (expenseDate >= previousStart && expenseDate <= previousEnd) {
        const key = expense.occurredAt.slice(0, 10);
        previousLookup.set(key, (previousLookup.get(key) ?? 0) + amount);
      }
    }

    const currentDays = getDateRange(currentStart, currentEnd);

    return currentDays.map((dateString, index) => {
      const currentAmount = currentLookup.get(dateString) ?? 0;
      const previousDate = addUtcDays(previousStart, index);
      const previousDateKey = previousDate.toISOString().slice(0, 10);
      const previousAmount = previousLookup.get(previousDateKey) ?? 0;

      return {
        date: dateString,
        label: formatDateLabel(dateString),
        current: currentAmount,
        previous: previousAmount,
      };
    });
  }, [expenses, monthStart, monthEnd]);

  const totals = useMemo(() => {
    const currentTotal = chartData.reduce((sum, item) => sum + item.current, 0);
    const previousTotal = chartData.reduce((sum, item) => sum + item.previous, 0);
    const delta = currentTotal - previousTotal;
    const percentageChange = previousTotal > 0 ? (delta / previousTotal) * 100 : null;

    return { currentTotal, previousTotal, delta, percentageChange };
  }, [chartData]);

  const trendLabel = totals.delta > 0 ? "up" : totals.delta < 0 ? "down" : "flat";

  return (
    <Card className="py-2">
      <CardHeader className="space-y-4 px-4 pt-6 sm:px-8 sm:pt-8">
        <SectionHeader
          title="Expense Trends Over Time"
          description="Compare the selected period against the previous period to understand whether spend is accelerating or slowing down."
        />

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Range {getMonthLabel(monthStart)} → {getMonthLabel(monthEnd)}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 px-4 pb-6 sm:px-8 sm:pb-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Current period" value={formatMoney(totals.currentTotal)} tone="warning" />
          <MetricCard label="Previous period" value={formatMoney(totals.previousTotal)} tone="default" />
          <MetricCard
            label="Trend change"
            value={`${totals.delta >= 0 ? "+" : ""}${formatMoney(totals.delta)}`}
            tone={trendLabel === "up" ? "danger" : trendLabel === "down" ? "success" : "default"}
          />
          <MetricCard
            label="Percent change"
            value={totals.percentageChange === null ? "—" : `${totals.percentageChange >= 0 ? "+" : ""}${totals.percentageChange.toFixed(1)}%`}
            tone={trendLabel === "up" ? "danger" : trendLabel === "down" ? "success" : "default"}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Trend:</span>
          <Badge
            variant="outline"
            className={cn(
              trendLabel === "up" && "border-destructive/30 text-destructive",
              trendLabel === "down" && "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
            )}
          >
            {trendLabel === "up" ? "Spending increased" : trendLabel === "down" ? "Spending decreased" : "No change"}
          </Badge>
          {totals.percentageChange !== null ? (
            <Badge variant="secondary">
              {totals.percentageChange >= 0 ? "↑" : "↓"} {Math.abs(totals.percentageChange).toFixed(1)}%
            </Badge>
          ) : null}
        </div>

        <div className="rounded-2xl border bg-muted/10 p-4">
          <div className="h-[320px] w-full min-w-0 min-h-0 sm:h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 16, right: 16, left: 0, bottom: 0 }}
              >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tickMargin={10} minTickGap={24} tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(value) => formatCompactMoney(Number(value))} width={72} tick={{ fontSize: 12 }} />
              <Tooltip
                cursor={{ stroke: "var(--color-muted)" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-lg">
                      <p className="mb-1 font-medium">{String(label)}</p>
                      <div className="space-y-0.5">
                        {payload.map((entry) => (
                          <p key={String(entry.dataKey)}>{String(entry.name)}: {formatMoney(Number(entry.value ?? 0))}</p>
                        ))}
                      </div>
                    </div>
                  );
                }}
              />
              <Legend content={<OrderedLegend items={trendLegendItems} />} />
              <Line
                type="monotone"
                dataKey="current"
                name="Current period"
                stroke="var(--color-chart-2)"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="previous"
                name="Previous period"
                stroke="var(--color-chart-4)"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryTagOverlapChart({
  expenses,
  categories,
  monthStart,
  monthEnd,
}: {
  expenses: ActivityDashboardDataDto["expenses"];
  categories: ActivityDashboardDataDto["categories"];
  monthStart: string;
  monthEnd: string;
}) {
  const categoryOptions = useMemo(() => {
    const seen = new Map<number, string>();
    for (const expense of expenses) {
      if (!seen.has(expense.categoryId)) {
        seen.set(expense.categoryId, expense.categoryName);
      }
    }
    for (const category of categories) {
      if (!seen.has(category.id)) {
        seen.set(category.id, category.name);
      }
    }
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [expenses, categories]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");

  const effectiveCategoryId = useMemo(() => {
    if (selectedCategoryId && categoryOptions.some((option) => String(option.id) === selectedCategoryId)) {
      return selectedCategoryId;
    }
    return categoryOptions[0] ? String(categoryOptions[0].id) : "";
  }, [selectedCategoryId, categoryOptions]);

  const result = useMemo(() => {
    const filtered = expenses.filter((expense) => {
      const expenseMonth = getMonthKey(expense.occurredAt);
      return (
        expense.type === "expense" &&
        String(expense.categoryId) === effectiveCategoryId &&
        expenseMonth >= monthStart &&
        expenseMonth <= monthEnd
      );
    });

    const categoryTotal = filtered.reduce((sum, expense) => sum + Number(expense.amount), 0);

    const tagTotals = new Map<number, { id: number; name: string; amount: number }>();
    let untaggedTotal = 0;

    for (const expense of filtered) {
      const amount = Number(expense.amount);
      if (expense.tagIds.length === 0) {
        untaggedTotal += amount;
        continue;
      }
      expense.tagIds.forEach((tagId, index) => {
        const tagName = expense.tagNames[index] ?? `Tag ${tagId}`;
        const existing = tagTotals.get(tagId);
        tagTotals.set(tagId, {
          id: tagId,
          name: tagName,
          amount: (existing?.amount ?? 0) + amount,
        });
      });
    }

    const combinationTotals = new Map<string, { label: string; amount: number; count: number }>();
    for (const expense of filtered) {
      const amount = Number(expense.amount);
      const label = expense.tagNames.length
        ? Array.from(new Set(expense.tagNames)).sort().join(" ∩ ")
        : "Untagged";
      const existing = combinationTotals.get(label);
      combinationTotals.set(label, {
        label,
        amount: (existing?.amount ?? 0) + amount,
        count: (existing?.count ?? 0) + 1,
      });
    }

    const combinations = Array.from(combinationTotals.values())
      .sort((left, right) => right.amount - left.amount)
      .map((entry) => ({
        ...entry,
        percentage: categoryTotal > 0 ? (entry.amount / categoryTotal) * 100 : 0,
      }));

    return {
      categoryTotal,
      transactionCount: filtered.length,
      distinctTagCount: tagTotals.size,
      untaggedTotal,
      combinations,
    };
  }, [expenses, effectiveCategoryId, monthStart, monthEnd]);

  const selectedCategoryName =
    categoryOptions.find((option) => String(option.id) === effectiveCategoryId)?.name ?? "—";
  const hasData = result.transactionCount > 0;
  const pieData = result.combinations.filter((combination) => combination.amount > 0);

  return (
    <Card className="py-2">
      <CardHeader className="space-y-4 px-4 pt-6 sm:px-8 sm:pt-8">
        <SectionHeader
          title="Spend by Tag Overlap"
          description="Pick a category to see how its spending splits across tags, including transactions tagged with multiple tags at once."
        />

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Range {getMonthLabel(monthStart)} → {getMonthLabel(monthEnd)}</Badge>
        </div>

        <div className="max-w-sm space-y-2">
          <Label htmlFor="tag-overlap-category">Category</Label>
          {categoryOptions.length ? (
            <select
              id="tag-overlap-category"
              value={effectiveCategoryId}
              onChange={(event) => setSelectedCategoryId(event.target.value)}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {categoryOptions.map((option) => (
                <option key={option.id} value={String(option.id)}>
                  {option.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-muted-foreground">No categories available.</p>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 px-4 pb-6 sm:px-8 sm:pb-8">
        {!hasData ? (
          <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
            No transactions found for {selectedCategoryName} in the selected range.
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <MetricCard label="Total spend" value={formatMoney(result.categoryTotal)} tone="warning" />
              <MetricCard label="Distinct tags" value={String(result.distinctTagCount)} />
              <MetricCard label="Untagged spend" value={formatMoney(result.untaggedTotal)} />
            </div>

            {pieData.length ? (
              <div className="rounded-2xl border bg-muted/10 p-4">
                <div className="h-[320px] w-full min-w-0 min-h-0 sm:h-[380px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="amount"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius="75%"
                        label={({ name, value }) =>
                          `${name}: ${formatCompactMoney(Number(value ?? 0))}`
                        }
                      >
                        {pieData.map((combination, index) => (
                          <Cell
                            key={combination.label}
                            fill={
                              combination.label === "Untagged"
                                ? untaggedColor
                                : chartPalette[index % chartPalette.length]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, _name, item) => [
                          `${formatMoney(Number(value ?? 0))} (${(item.payload.percentage as number).toFixed(1)}%)`,
                          item.payload.label,
                        ]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                No tagged transactions found for {selectedCategoryName} in the selected range.
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function ActivityDashboard({
  data,
}: {
  data: ActivityDashboardDataDto;
}) {
  const allMonthKeys = useMemo(
    () => Array.from(new Set(data.expenses.map((expense) => getMonthKey(expense.occurredAt)))).sort(),
    [data.expenses]
  );
  const minMonth = allMonthKeys[0] ?? getMonthKey(new Date().toISOString());
  const maxMonth = allMonthKeys[allMonthKeys.length - 1] ?? minMonth;
  const [audience, setAudience] = useState<ActivityAudience>("personal");
  const [monthStart, setMonthStart] = useState(minMonth);
  const [monthEnd, setMonthEnd] = useState(maxMonth);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [chartQuery, setChartQuery] = useState("");
  const isAdmin = data.currentUser.role === "ADMIN";

  const matchesChartQuery = (title: string) => {
    const loweredQuery = chartQuery.trim().toLowerCase();
    return !loweredQuery || title.toLowerCase().includes(loweredQuery);
  };

  const scopedData = useMemo(() => getScopedActivityData(data, audience), [data, audience]);
  const visibleData = useMemo(() => {
    const selectedCategories = new Set(selectedCategoryIds);
    const filteredBudgets = scopedData.budgets.filter((budget) => {
      if (selectedCategories.size === 0) return true;
      return selectedCategories.has(String(budget.categoryId));
    });
    const filteredExpenses = scopedData.expenses.filter((expense) => {
      if (selectedCategories.size === 0) return true;
      return selectedCategories.has(String(expense.categoryId));
    });

    return {
      ...scopedData,
      budgets: filteredBudgets,
      expenses: filteredExpenses,
    };
  }, [scopedData, selectedCategoryIds]);

  const rangeLabel = `${getMonthLabel(monthStart)} → ${getMonthLabel(monthEnd)}`;

  return (
    <section className="space-y-6">
      <Card className="py-2">
        <CardHeader className="space-y-3 px-4 pt-6 sm:px-8 sm:pt-8">
          <Badge variant="secondary" className="w-fit">
            Analytics
          </Badge>
          <CardTitle className="text-3xl tracking-tight">Analytics</CardTitle>
          <p className="max-w-4xl text-sm text-muted-foreground">
            Visualize spending, income, and budget health with one shared set of filters.
            {visibleData.organization ? ` Current workspace: ${visibleData.organization.name}.` : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Members {visibleData.members.length}</Badge>
            <Badge variant="outline">Categories {visibleData.categories.length}</Badge>
            <Badge variant="outline">Budget months {new Set(visibleData.budgets.map((budget) => budget.month)).size}</Badge>
            <Badge variant="outline">Range {rangeLabel}</Badge>
          </div>
        </CardHeader>
      </Card>

      <Card className="py-2">
        <CardHeader className="space-y-4 px-4 pt-6 sm:px-8 sm:pt-8">
          <SectionHeader
            title="Global filters"
            description="Choose who to view, narrow the month range, and limit charts to specific categories."
          />

          <div className="grid gap-4 md:grid-cols-3 md:items-end">
            <div className="space-y-2">
              <Label htmlFor="activity-audience">Audience</Label>
              <select
                id="activity-audience"
                value={audience}
                onChange={(event) => setAudience(event.target.value as ActivityAudience)}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="personal">Personal</option>
                <option value="family">Family</option>
                {isAdmin ? (
                  <optgroup label="Family members">
                    {data.members.map((member) => (
                      <option key={member.id} value={`member:${member.id}`}>
                        {member.id === data.currentUser.id ? `${member.name} (You)` : member.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity-month-start">Month start</Label>
              <MonthInput
                id="activity-month-start"
                value={monthStart}
                className="h-11"
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setMonthStart(nextValue);
                  if (nextValue > monthEnd) {
                    setMonthEnd(nextValue);
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity-month-end">Month end</Label>
              <MonthInput
                id="activity-month-end"
                value={monthEnd}
                className="h-11"
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setMonthEnd(nextValue);
                  if (nextValue < monthStart) {
                    setMonthStart(nextValue);
                  }
                }}
              />
            </div>
          </div>

          <CategoryGroupFilter
            categories={visibleData.categories}
            selectedValues={selectedCategoryIds}
            onChange={setSelectedCategoryIds}
          />
        </CardHeader>
      </Card>

      <Card className="py-2">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <div className="space-y-2">
            <Label htmlFor="chart-search">Search charts</Label>
            <Input
              id="chart-search"
              value={chartQuery}
              onChange={(event) => setChartQuery(event.target.value)}
              placeholder="Search by chart name..."
            />
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6">
        {matchesChartQuery("Income vs Expense") ? (
          <ExpenseActivityChart expenses={visibleData.expenses} monthStart={monthStart} monthEnd={monthEnd} />
        ) : null}

        {matchesChartQuery("Budget vs Actual Spending") ? (
          <BudgetVsActualChart
            budgets={visibleData.budgets}
            expenses={visibleData.expenses}
            monthStart={monthStart}
            monthEnd={monthEnd}
            audience={audience}
          />
        ) : null}

        {matchesChartQuery("Spending by Category") ? (
          <CategoryByTypeChart
            expenses={visibleData.expenses}
            monthStart={monthStart}
            monthEnd={monthEnd}
            transactionType="expense"
            title="Spending by Category"
            description="See which categories consume the most spending across the selected month range."
            emptyMessage="No spending found for the selected range."
            totalLabel="Total spending"
            topCategoryLabel="Top category"
            topCategoriesLabel="Top 3 share"
            positiveTone="warning"
          />
        ) : null}

        {matchesChartQuery("Income by Category") ? (
          <CategoryByTypeChart
            expenses={visibleData.expenses}
            monthStart={monthStart}
            monthEnd={monthEnd}
            transactionType="income"
            title="Income by Category"
            description="See which categories bring in the most income across the selected month range."
            emptyMessage="No income found for the selected range."
            totalLabel="Total income"
            topCategoryLabel="Top income category"
            topCategoriesLabel="Top 3 share"
            positiveTone="success"
          />
        ) : null}

        {matchesChartQuery("Spending by Necessity Level") ? (
          <NecessitySpendChart expenses={visibleData.expenses} monthStart={monthStart} monthEnd={monthEnd} />
        ) : null}

        {matchesChartQuery("Expense Trends Over Time") ? (
          <ExpenseTrendChart expenses={visibleData.expenses} monthStart={monthStart} monthEnd={monthEnd} />
        ) : null}

        {matchesChartQuery("Spend by Tag Overlap") ? (
          <CategoryTagOverlapChart
            expenses={visibleData.expenses}
            categories={visibleData.categories}
            monthStart={monthStart}
            monthEnd={monthEnd}
          />
        ) : null}
      </div>
    </section>
  );
}
