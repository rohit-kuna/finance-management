"use server";

import { z } from "zod";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser, revalidateAppShell, setActiveOrgCookie } from "@/app/lib/auth";
import { ROUTES } from "@/app/lib/constants";
import { ROLES } from "@/app/lib/roles";
import { getUserById, setUserScope } from "@/app/actions/tables/users.table.actions";
import { ensurePersonalOrganizationForUser } from "@/app/actions/auth-roles/onboarding.actions";
import {
  createOrganizationRecord,
  getOrganizationById,
  getOrganizationByInviteCode,
  updateOrganizationInviteCode,
  updateOrganizationName,
} from "@/app/actions/tables/organizations.table.actions";
import {
  addOrganizationMember,
  getOrganizationAdminCount,
  getOrganizationMembers,
  getOrganizationMembership,
  getOrganizationsForUser,
  removeOrganizationMember,
  updateOrganizationMemberRole,
} from "@/app/actions/tables/organization-members.table.actions";
import type { AdminDashboardData } from "@/app/lib/admin-dashboard.types";
import { buildInviteCode } from "@/app/lib/invite-code";
import { getOrganizationInviteLink } from "@/app/lib/urls";

const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Organization name is required").max(120),
});

const updateOrganizationNameSchema = z.object({
  name: z.string().trim().min(2, "Organization name is required").max(120),
});

const updateMemberRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum([ROLES.ADMIN, ROLES.USER]),
});

const removeMemberSchema = z.object({
  userId: z.string().uuid(),
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
    inviteLink: organization ? await getOrganizationInviteLink(organization.inviteCode) : null,
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

  const memberships = await getOrganizationsForUser(currentUser.id);

  const organization = await createOrganizationRecord({
    name: parsed.data.name,
    inviteCode: buildInviteCode(),
    createdBy: currentUser.id,
    isPersonal: false,
  });

  if (!organization) {
    throw new Error("Unable to create organization");
  }

  await addOrganizationMember({
    orgId: organization.id,
    userId: currentUser.id,
    role: ROLES.ADMIN,
    isDefault: memberships.length === 0,
  });
  await setActiveOrgCookie(organization.id);
  revalidateAppShell();
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

export async function updateOrganizationNameAction(formData: FormData) {
  const currentUser = await requireAdmin();

  if (!currentUser.orgId) {
    throw new Error("Create an organization first");
  }

  const parsed = updateOrganizationNameSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Unable to update organization name");
  }

  const organization = await updateOrganizationName(currentUser.orgId, parsed.data.name);

  if (!organization) {
    throw new Error("Unable to update organization name");
  }

  revalidatePath(ROUTES.ORGANIZATION, "page");
  revalidateAppShell();
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

  if (!targetUser) {
    throw new Error("Member does not belong to your organization");
  }

  const targetMembership = await getOrganizationMembership(currentUser.orgId, targetUser.id);

  if (!targetMembership) {
    throw new Error("Member does not belong to your organization");
  }

  if (targetMembership.role === ROLES.ADMIN && parsed.data.role === ROLES.USER) {
    const adminCount = await getOrganizationAdminCount(currentUser.orgId);
    if (adminCount <= 1) {
      throw new Error("Keep at least one admin in the organization");
    }
  }

  await updateOrganizationMemberRole(currentUser.orgId, targetUser.id, parsed.data.role);
  revalidatePath(ROUTES.USERS, "page");
  revalidatePath(ROUTES.ORGANIZATION, "page");
}

/**
 * Shared-space-only: removing yourself from your own personal space, or
 * removing the last admin, would leave the space unmanageable, so both are
 * blocked. Removing a member only revokes their access to this shared
 * space — it never touches their personal space or its data.
 */
export async function removeOrganizationMemberAction(formData: FormData) {
  const currentUser = await requireAdmin();
  const parsed = removeMemberSchema.safeParse({
    userId: formData.get("userId"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Unable to remove member");
  }

  if (!currentUser.orgId) {
    throw new Error("Create an organization first");
  }

  if (parsed.data.userId === currentUser.id) {
    throw new Error("You can't remove yourself from the space");
  }

  const organization = await getOrganizationById(currentUser.orgId);
  if (!organization || organization.isPersonal) {
    throw new Error("Cannot remove members from a personal space");
  }

  const targetMembership = await getOrganizationMembership(currentUser.orgId, parsed.data.userId);
  if (!targetMembership) {
    throw new Error("Member does not belong to your organization");
  }

  if (targetMembership.role === ROLES.ADMIN) {
    const adminCount = await getOrganizationAdminCount(currentUser.orgId);
    if (adminCount <= 1) {
      throw new Error("Keep at least one admin in the organization");
    }
  }

  await removeOrganizationMember(currentUser.orgId, parsed.data.userId);
  revalidatePath(ROUTES.USERS, "page");
  revalidatePath(ROUTES.ORGANIZATION, "page");
}

export async function acceptOrganizationInvite(inviteCode: string) {
  const currentUser = await requireUser();
  const organization = await getOrganizationByInviteCode(inviteCode);

  if (!organization) {
    notFound();
  }

  const existingMembership = await getOrganizationMembership(organization.id, currentUser.id);

  if (!existingMembership) {
    await ensurePersonalOrganizationForUser(currentUser.id);
    const memberships = await getOrganizationsForUser(currentUser.id);
    await addOrganizationMember({
      orgId: organization.id,
      userId: currentUser.id,
      role: ROLES.USER,
      isDefault: memberships.length === 0,
    });
    revalidateAppShell();
  }

  if (!currentUser.scope) {
    await setUserScope(currentUser.id, "shared");
  }

  return {
    success: true,
    organization,
  };
}
