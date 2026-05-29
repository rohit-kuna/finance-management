import type {
  BudgetAllocationSummaryDto,
  BudgetRecordDto,
} from "@/app/lib/finance.types";

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
        familyBudget: item.scope === "family" ? item : null,
        personalBudgets: item.scope === "personal" ? [item] : [],
        personalTotal: item.scope === "personal" ? item.amount : "0",
        availableCapacityAmount: null,
        availableCapacityPercent: null,
        overageAmount: null,
      });
      continue;
    }

    if (item.scope === "family") {
      existing.familyBudget = item;
    } else {
      existing.personalBudgets.push(item);
      existing.personalTotal = (
        Number(existing.personalTotal) + Number(item.amount)
      ).toFixed(2);
    }
  }

  for (const summary of groups.values()) {
    if (!summary.familyBudget) continue;

    const familyAmount = Number(summary.familyBudget.amount);
    const personalTotal = Number(summary.personalTotal);
    const availableCapacity = Math.max(familyAmount - personalTotal, 0);

    summary.availableCapacityAmount = availableCapacity.toFixed(2);
    summary.availableCapacityPercent =
      familyAmount > 0 ? Number(((availableCapacity / familyAmount) * 100).toFixed(0)) : null;
    summary.overageAmount =
      personalTotal > familyAmount ? (personalTotal - familyAmount).toFixed(2) : null;
  }

  return Array.from(groups.values())
    .filter((summary) => Boolean(summary.familyBudget))
    .sort((left, right) => {
      const leftKey = `${left.month}:${left.categoryName}`;
      const rightKey = `${right.month}:${right.categoryName}`;
      return leftKey.localeCompare(rightKey);
    });
}
