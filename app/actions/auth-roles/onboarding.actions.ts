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
  getPersonalOrganizationForUser,
} from "@/app/actions/tables/organizations.table.actions";
import {
  addOrganizationMember,
  getOrganizationMembership,
  getOrganizationsForUser,
  setDefaultOrganizationForUser,
} from "@/app/actions/tables/organization-members.table.actions";
import { setUserScope } from "@/app/actions/tables/users.table.actions";
import { ensureSystemDefaultCategories } from "@/app/actions/tables/categories.table.actions";
import type { OnboardingActionState } from "@/app/actions/auth-roles/onboarding.types";

/**
 * Personal space is the single source of truth for every transaction a user
 * makes, so every user needs one as soon as they touch a shared space —
 * regardless of whether they onboarded as "personal" or "shared" scope.
 * Idempotent: returns the existing personal org if one is already there.
 */
async function ensurePersonalOrganizationForUser(userId: string) {
  const existing = await getPersonalOrganizationForUser(userId);
  if (existing) return existing;

  const memberships = await getOrganizationsForUser(userId);
  const organization = await createOrganizationRecord({
    name: "My Space",
    inviteCode: buildInviteCode(),
    createdBy: userId,
    isPersonal: true,
  });

  if (!organization) {
    throw new Error("Unable to create your personal space");
  }

  await addOrganizationMember({
    orgId: organization.id,
    userId,
    role: ROLES.ADMIN,
    isDefault: memberships.length === 0,
  });

  return organization;
}

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
    await ensurePersonalOrganizationForUser(currentUser.id);
    const memberships = await getOrganizationsForUser(currentUser.id);
    await addOrganizationMember({
      orgId: organization.id,
      userId: currentUser.id,
      role: ROLES.USER,
      isDefault: memberships.length === 0,
    });
    revalidatePath(ROUTES.DASHBOARD, "layout");
  }

  if (!currentUser.scope) {
    await setUserScope(currentUser.id, "shared");
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

  await ensurePersonalOrganizationForUser(currentUser.id);
  const memberships = await getOrganizationsForUser(currentUser.id);

  const organization = await createOrganizationRecord({
    name: parsed.data.name,
    inviteCode: buildInviteCode(),
    createdBy: currentUser.id,
    isPersonal: false,
  });

  if (!organization) {
    return {
      error: "Unable to create organization",
    };
  }

  await ensureSystemDefaultCategories(organization.id, currentUser.id);
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
 * Creates an additional solo space from the switch-space screen — for a user
 * who already has an account-level scope (personal or shared) but wants a
 * second, single-owner space alongside whatever else they belong to. Unlike
 * choosePersonalScopeAction, this never touches the account's scope
 * preference, since that only drives the one-time onboarding choice.
 */
export async function createPersonalSpaceAction() {
  const currentUser = await requireUser();
  const memberships = await getOrganizationsForUser(currentUser.id);
  const existingPersonalOrganization = await getPersonalOrganizationForUser(currentUser.id);

  if (existingPersonalOrganization) {
    throw new Error("You already have a personal space. Create a shared space instead.");
  }

  const organization = await createOrganizationRecord({
    name: "My Space",
    inviteCode: buildInviteCode(),
    createdBy: currentUser.id,
    isPersonal: true,
  });

  if (!organization) {
    throw new Error("Unable to create your space");
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
 * Personal mode: skips the create/join UI entirely. Auto-creates a solo
 * space, makes the user its admin, and lands them straight on the dashboard.
 * The invite code generated here is never surfaced anywhere for a personal
 * space.
 */
export async function choosePersonalScopeAction() {
  const currentUser = await requireUser();

  if (currentUser.scope) {
    redirect(ROUTES.DASHBOARD);
  }

  await setUserScope(currentUser.id, "personal");

  const organization = await createOrganizationRecord({
    name: "My Space",
    inviteCode: buildInviteCode(),
    createdBy: currentUser.id,
    isPersonal: true,
  });

  if (!organization) {
    throw new Error("Unable to create your space");
  }

  await addOrganizationMember({
    orgId: organization.id,
    userId: currentUser.id,
    role: ROLES.ADMIN,
    isDefault: true,
  });
  await setActiveOrgCookie(organization.id);
  revalidatePath(ROUTES.DASHBOARD, "layout");
  redirect(ROUTES.DASHBOARD);
}

/**
 * Shared mode: just records the preference. The dashboard will then render
 * the existing create/join-a-space UI on the next render.
 */
export async function chooseSharedScopeAction() {
  const currentUser = await requireUser();

  if (currentUser.scope) {
    redirect(ROUTES.DASHBOARD);
  }

  await setUserScope(currentUser.id, "shared");
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
