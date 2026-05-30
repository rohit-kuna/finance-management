"use server";

import { z } from "zod";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "@/app/lib/auth";
import { ROUTES } from "@/app/lib/constants";
import { ROLES } from "@/app/lib/roles";
import { getUserById, updateUserById } from "@/app/actions/tables/users.table.actions";
import {
  createOrganizationRecord,
  getOrganizationAdminCount,
  getOrganizationById,
  getOrganizationByInviteCode,
  getOrganizationMembers,
  updateOrganizationInviteCode,
} from "@/app/actions/tables/organizations.table.actions";
import type { AdminDashboardData } from "@/app/lib/admin-dashboard.types";
import { buildInviteCode } from "@/app/lib/invite-code";
import { getOrganizationInviteLink } from "@/app/lib/urls";

const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Organization name is required").max(120),
});

const updateMemberRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum([ROLES.ADMIN, ROLES.USER]),
});

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const currentUser = await requireAdmin();

  if (!currentUser.orgId) {
    return {
      organization: null,
      members: [],
      inviteLink: null,
    };
  }

  const organization = await getOrganizationById(currentUser.orgId);
  const members = await getOrganizationMembers(currentUser.orgId);

  return {
    organization,
    members,
    inviteLink: organization ? getOrganizationInviteLink(organization.inviteCode) : null,
  };
}

export async function createOrganizationAction(formData: FormData) {
  const currentUser = await requireAdmin();
  const parsed = createOrganizationSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Unable to create organization");
  }

  if (currentUser.orgId) {
    return;
  }

  const organization = await createOrganizationRecord({
    name: parsed.data.name,
    inviteCode: buildInviteCode(),
    createdBy: currentUser.id,
  });

  if (!organization) {
    throw new Error("Unable to create organization");
  }

  await updateUserById(currentUser.id, {
    orgId: organization.id,
    role: ROLES.ADMIN,
  });
  revalidatePath(ROUTES.DASHBOARD, "layout");
}

export async function regenerateOrganizationInviteAction() {
  const currentUser = await requireAdmin();

  if (!currentUser.orgId) {
    throw new Error("Create an organization first");
  }

  const inviteCode = buildInviteCode();
  const organization = await updateOrganizationInviteCode(currentUser.orgId, inviteCode);

  if (!organization) {
    throw new Error("Unable to regenerate the invite link");
  }
}

export async function updateOrganizationMemberRoleAction(formData: FormData) {
  const currentUser = await requireAdmin();
  const parsed = updateMemberRoleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Unable to update member role");
  }

  if (!currentUser.orgId) {
    throw new Error("Create an organization first");
  }

  const targetUser = await getUserById(parsed.data.userId);

  if (!targetUser || targetUser.orgId !== currentUser.orgId) {
    throw new Error("Member does not belong to your organization");
  }

  if (targetUser.role === ROLES.ADMIN && parsed.data.role === ROLES.USER) {
    const adminCount = await getOrganizationAdminCount(currentUser.orgId);
    if (adminCount <= 1) {
      throw new Error("Keep at least one admin in the organization");
    }
  }

  await updateUserById(targetUser.id, { role: parsed.data.role });
}

export async function promoteUserToAdmin(userId: string) {
  await requireAdmin();
  await updateUserById(userId, { role: ROLES.ADMIN });
}

export async function acceptOrganizationInvite(inviteCode: string) {
  const currentUser = await requireUser();
  const organization = await getOrganizationByInviteCode(inviteCode);

  if (!organization) {
    notFound();
  }

  if (currentUser.orgId && currentUser.orgId !== organization.id) {
    throw new Error("You are already part of another organization");
  }

  if (currentUser.orgId === organization.id) {
    return {
      success: true,
      organization,
    };
  }

  await updateUserById(currentUser.id, { orgId: organization.id });
  revalidatePath(ROUTES.DASHBOARD, "layout");

  return {
    success: true,
    organization,
  };
}

export async function getCurrentOrganizationForAdmin() {
  const currentUser = await requireAdmin();

  if (!currentUser.orgId) {
    return null;
  }

  return getOrganizationById(currentUser.orgId);
}

export async function getCurrentOrganizationMembersForAdmin() {
  const currentUser = await requireAdmin();

  if (!currentUser.orgId) {
    return [];
  }

  return getOrganizationMembers(currentUser.orgId);
}
