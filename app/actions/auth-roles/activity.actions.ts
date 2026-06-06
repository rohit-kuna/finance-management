"use server";

import { requireUser } from "@/app/lib/auth";
import { getOrganizationById, getOrganizationMembers } from "@/app/actions/tables/organizations.table.actions";
import { getCategoriesByOrg } from "@/app/actions/tables/categories.table.actions";
import { getBudgetsByOrg } from "@/app/actions/tables/budgets.table.actions";
import { getExpensesByOrg } from "@/app/actions/tables/expenses.table.actions";
import type { ActivityDashboardDataDto } from "@/app/lib/activity.types";

function toOrganizationDto(organization: Awaited<ReturnType<typeof getOrganizationById>>) {
  if (!organization) return null;

  return {
    id: organization.id,
    name: organization.name,
    createdBy: organization.createdBy,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
  };
}

export async function getActivityDashboardData(): Promise<ActivityDashboardDataDto> {
  const currentUser = await requireUser();

  if (!currentUser.orgId) {
    return {
      organization: null,
      categories: [],
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

  const [organization, categories, members, budgets, expenses] = await Promise.all([
    getOrganizationById(currentUser.orgId),
    getCategoriesByOrg(currentUser.orgId),
    getOrganizationMembers(currentUser.orgId),
    getBudgetsByOrg(currentUser.orgId),
    getExpensesByOrg(currentUser.orgId),
  ]);
  const visibleExpenses = currentUser.role === "ADMIN"
    ? expenses
    : expenses.filter((expense) => expense.userId === currentUser.id);

  return {
    organization: toOrganizationDto(organization),
    categories,
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
