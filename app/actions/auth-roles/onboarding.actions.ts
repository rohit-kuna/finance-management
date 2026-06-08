"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser, setActiveOrgCookie } from "@/app/lib/auth";
import { ROUTES } from "@/app/lib/constants";
import { ROLES } from "@/app/lib/roles";
import { buildInviteCode } from "@/app/lib/invite-code";
import {
  createOrganizationRecord,
  getOrganizationByInviteCode,
} from "@/app/actions/tables/organizations.table.actions";
import {
  addOrganizationMember,
  getOrganizationMembership,
  getOrganizationsForUser,
  setDefaultOrganizationForUser,
} from "@/app/actions/tables/organization-members.table.actions";
import type { OnboardingActionState } from "@/app/actions/auth-roles/onboarding.types";

const joinOrganizationSchema = z.object({
  inviteCode: z.string().trim().min(1, "Invite code is required").max(64),
});

const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Organization name is required").max(120),
});

const orgIdSchema = z.object({
  orgId: z.coerce.number().int().positive(),
});

export async function joinOrganizationByInviteCodeAction(
  _previousState: OnboardingActionState,
  formData: FormData
): Promise<OnboardingActionState> {
  const currentUser = await requireUser();
  const parsed = joinOrganizationSchema.safeParse({
    inviteCode: formData.get("inviteCode"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invite code is required",
    };
  }

  const inviteCode = parsed.data.inviteCode.trim();
  const organization = await getOrganizationByInviteCode(inviteCode);

  if (!organization) {
    return {
      error: "Invite code not found",
    };
  }

  const existingMembership = await getOrganizationMembership(organization.id, currentUser.id);

  if (!existingMembership) {
    const memberships = await getOrganizationsForUser(currentUser.id);
    await addOrganizationMember({
      orgId: organization.id,
      userId: currentUser.id,
      role: ROLES.USER,
      isDefault: memberships.length === 0,
    });
    revalidatePath(ROUTES.DASHBOARD, "layout");
  }

  await setActiveOrgCookie(organization.id);
  redirect(ROUTES.DASHBOARD);
}

export async function createOrganizationFromOnboardingAction(
  _previousState: OnboardingActionState,
  formData: FormData
): Promise<OnboardingActionState> {
  const currentUser = await requireUser();
  const parsed = createOrganizationSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Unable to create organization",
    };
  }

  const memberships = await getOrganizationsForUser(currentUser.id);

  const organization = await createOrganizationRecord({
    name: parsed.data.name,
    inviteCode: buildInviteCode(),
    createdBy: currentUser.id,
  });

  if (!organization) {
    return {
      error: "Unable to create organization",
    };
  }

  await addOrganizationMember({
    orgId: organization.id,
    userId: currentUser.id,
    role: ROLES.ADMIN,
    isDefault: memberships.length === 0,
  });
  await setActiveOrgCookie(organization.id);
  revalidatePath(ROUTES.DASHBOARD, "layout");

  redirect(ROUTES.DASHBOARD);
}

/**
 * Switches the active org for this browser session to one the user is already
 * a member of (the "Open an organization" list).
 */
export async function openOrganizationAction(formData: FormData) {
  const currentUser = await requireUser();
  const parsed = orgIdSchema.safeParse({ orgId: formData.get("orgId") });

  if (!parsed.success) {
    throw new Error("Organization is required");
  }

  const membership = await getOrganizationMembership(parsed.data.orgId, currentUser.id);
  if (!membership) {
    throw new Error("You are not a member of this organization");
  }

  await setActiveOrgCookie(parsed.data.orgId);
  revalidatePath(ROUTES.DASHBOARD, "layout");
  redirect(ROUTES.DASHBOARD);
}

/**
 * Sets the user's durable, cross-device "home" org — used as the landing org
 * whenever this browser has no active-org cookie yet.
 */
export async function setDefaultOrganizationAction(formData: FormData) {
  const currentUser = await requireUser();
  const parsed = orgIdSchema.safeParse({ orgId: formData.get("orgId") });

  if (!parsed.success) {
    throw new Error("Organization is required");
  }

  const membership = await getOrganizationMembership(parsed.data.orgId, currentUser.id);
  if (!membership) {
    throw new Error("You are not a member of this organization");
  }

  await setDefaultOrganizationForUser(currentUser.id, parsed.data.orgId);
  revalidatePath(ROUTES.DASHBOARD, "layout");
}
