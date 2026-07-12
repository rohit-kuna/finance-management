"use server";

import { requireUser } from "@/app/lib/auth";
import { getOrganizationById } from "@/app/actions/tables/organizations.table.actions";
import { getOrganizationMembers } from "@/app/actions/tables/organization-members.table.actions";
import { getSpaceCategoriesByOrg } from "@/app/actions/tables/space-categories.table.actions";
import { getBudgetsByOrg } from "@/app/actions/tables/budgets.table.actions";
import { getExpensesByOrg, getExpensesForSharedSpace } from "@/app/actions/tables/expenses.table.actions";
import type { ActivityDashboardDataDto } from "@/app/lib/activity.types";

function toOrganizationDto(organization: Awaited<ReturnType<typeof getOrganizationById>>) {
  if (!organization) return null;

  return {
    id: organization.id,
    name: organization.name,
    createdBy: organization.createdBy,
    isPersonal: organization.isPersonal,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
  };
}

export async function getActivityDashboardData(): Promise<ActivityDashboardDataDto> {
  const currentUser = await requireUser();

  if (!currentUser.orgId) {
    return {
      organization: null,
      spaceCategories: [],
      members: [],
      budgets: [],
      expenses: [],
      currentUser: {
        id: currentUser.id,
        role: currentUser.role,
        orgId: null,
      },
    };
  }

  const organization = await getOrganizationById(currentUser.orgId);

  // Unmapped UserCategories are excluded from Analytics entirely — there's no
  // fallback category, so an unmapped transaction just doesn't count toward
  // any grouping until the user maps it via the Kanban board.
  const [spaceCategories, members, budgets, expenses] = await Promise.all([
    getSpaceCategoriesByOrg(currentUser.orgId),
    getOrganizationMembers(currentUser.orgId),
    getBudgetsByOrg(currentUser.orgId),
    organization?.isPersonal ?? true
      ? getExpensesByOrg(currentUser.orgId, 500, undefined, { onlyMapped: true })
      : getExpensesForSharedSpace(currentUser.orgId, 500),
  ]);
  const visibleExpenses = currentUser.role === "ADMIN"
    ? expenses
    : expenses.filter((expense) => expense.userId === currentUser.id);

  return {
    organization: toOrganizationDto(organization),
    spaceCategories,
    members: members.map((member) => ({
      id: member.id,
      email: member.email,
      name: member.name,
      role: member.role,
    })),
    budgets,
    expenses: visibleExpenses,
    currentUser: {
      id: currentUser.id,
      role: currentUser.role,
      orgId: currentUser.orgId,
    },
  };
}
