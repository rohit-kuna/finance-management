"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/app/lib/auth";
import { ROUTES } from "@/app/lib/constants";
import { ROLES } from "@/app/lib/roles";
import { buildInviteCode } from "@/app/lib/invite-code";
import {
  createOrganizationRecord,
  getOrganizationByInviteCode,
} from "@/app/actions/tables/organizations.table.actions";
import { updateUserById } from "@/app/actions/tables/users.table.actions";
import type { OnboardingActionState } from "@/app/actions/auth-roles/onboarding.types";

const joinOrganizationSchema = z.object({
  inviteCode: z.string().trim().min(1, "Invite code is required").max(64),
});

const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Organization name is required").max(120),
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

  if (currentUser.orgId && currentUser.orgId !== organization.id) {
    return {
      error: "You already belong to another organization",
    };
  }

  if (currentUser.orgId !== organization.id) {
    await updateUserById(currentUser.id, { orgId: organization.id });
    revalidatePath(ROUTES.DASHBOARD, "layout");
  }

  redirect(ROUTES.TRANSACTIONS);
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

  if (currentUser.orgId) {
    return {
      error: "You already belong to an organization",
    };
  }

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

  await updateUserById(currentUser.id, {
    orgId: organization.id,
    role: ROLES.ADMIN,
  });
  revalidatePath(ROUTES.DASHBOARD, "layout");

  redirect(ROUTES.TRANSACTIONS);
}
