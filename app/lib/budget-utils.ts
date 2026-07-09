import type {
  BudgetAllocationSummaryDto,
  BudgetRecordDto,
} from "@/app/lib/finance.types";

function normalizeBudgetScope(scope: string): BudgetRecordDto["scope"] {
  return scope === "family" ? "shared" : (scope as BudgetRecordDto["scope"]);
}

export function buildBudgetAllocationSummaries(
  budgets: BudgetRecordDto[]
): BudgetAllocationSummaryDto[] {
  const groups = new Map<string, BudgetAllocationSummaryDto>();

  for (const item of budgets) {
    const key = `${item.categoryId}:${item.month}`;
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        month: item.month,
        monthLabel: item.monthLabel,
        periodFrom: item.periodFrom,
        periodTo: item.periodTo,
        sharedBudget: normalizeBudgetScope(item.scope) === "shared" ? item : null,
        personalBudgets: item.scope === "personal" ? [item] : [],
        personalTotal: item.scope === "personal" ? item.amount : "0",
        availableCapacityAmount: null,
        availableCapacityPercent: null,
        overageAmount: null,
      });
      continue;
    }

    if (normalizeBudgetScope(item.scope) === "shared") {
      existing.sharedBudget = item;
    } else {
      existing.personalBudgets.push(item);
      existing.personalTotal = (
        Number(existing.personalTotal) + Number(item.amount)
      ).toFixed(2);
    }
  }

  for (const summary of groups.values()) {
    if (!summary.sharedBudget) continue;

    const sharedAmount = Number(summary.sharedBudget.amount);
    const personalTotal = Number(summary.personalTotal);
    const availableCapacity = Math.max(sharedAmount - personalTotal, 0);

    summary.availableCapacityAmount = availableCapacity.toFixed(2);
    summary.availableCapacityPercent =
      sharedAmount > 0 ? Number(((availableCapacity / sharedAmount) * 100).toFixed(0)) : null;
    summary.overageAmount =
      personalTotal > sharedAmount ? (personalTotal - sharedAmount).toFixed(2) : null;
  }

  return Array.from(groups.values())
    .filter((summary) => Boolean(summary.sharedBudget))
    .sort((left, right) => {
      const leftKey = `${left.month}:${left.categoryName}`;
      const rightKey = `${right.month}:${right.categoryName}`;
      return leftKey.localeCompare(rightKey);
    });
}
