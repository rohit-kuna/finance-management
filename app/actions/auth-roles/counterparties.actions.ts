"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/app/lib/auth";
import { ROUTES } from "@/app/lib/constants";
import { getOrganizationById } from "@/app/actions/tables/organizations.table.actions";
import {
  createCounterpartyRecord,
  deleteCounterpartyRecord,
  getCounterpartiesByOrg,
  getCounterpartyById,
  updateCounterpartyRecord,
} from "@/app/actions/tables/counterparties.table.actions";
import type { FinanceActionState } from "@/app/actions/auth-roles/finance.types";

const counterpartySchema = z.object({
  name: z.string().trim().min(2, "Counterparty name is required").max(255),
});

const counterpartyIdSchema = z.object({
  counterpartyId: z.coerce.number().int().positive(),
});

function assertOrgId(currentUser: Awaited<ReturnType<typeof requireUser>>) {
  if (!currentUser.orgId) {
    throw new Error("Create or join an organization first");
  }

  return currentUser.orgId;
}

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

export async function getOrganizationCounterpartiesData() {
  const currentUser = await requireUser();

  if (!currentUser.orgId) {
    return {
      organization: null,
      counterparties: [],
      currentUser: {
        id: currentUser.id,
        role: currentUser.role,
        orgId: null,
      },
    };
  }

  const [organization, counterparties] = await Promise.all([
    getOrganizationById(currentUser.orgId),
    getCounterpartiesByOrg(currentUser.orgId),
  ]);

  return {
    organization: toOrganizationDto(organization),
    counterparties,
    currentUser: {
      id: currentUser.id,
      role: currentUser.role,
      orgId: currentUser.orgId,
    },
  };
}

export async function createCounterpartyAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireUser();
  const parsed = counterpartySchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to create counterparty" };
  }

  const orgId = assertOrgId(currentUser);
  const existingCounterparties = await getCounterpartiesByOrg(orgId);

  if (existingCounterparties.some((counterparty) => counterparty.name.toLowerCase() === parsed.data.name.toLowerCase())) {
    return { error: "Counterparty already exists" };
  }

  await createCounterpartyRecord({
    orgId,
    name: parsed.data.name,
  });

  redirect(ROUTES.COUNTERPARTIES);
}

export async function updateCounterpartyAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireUser();
  const parsed = counterpartySchema.safeParse({
    name: formData.get("name"),
  });
  const counterpartyIdResult = counterpartyIdSchema.safeParse({
    counterpartyId: formData.get("counterpartyId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to update counterparty" };
  }

  if (!counterpartyIdResult.success) {
    return { error: "Counterparty is required" };
  }

  const orgId = assertOrgId(currentUser);
  const counterparty = await getCounterpartyById(counterpartyIdResult.data.counterpartyId);

  if (!counterparty || counterparty.orgId !== orgId) {
    return { error: "Counterparty does not belong to your organization" };
  }

  const existingCounterparties = await getCounterpartiesByOrg(orgId);
  if (
    existingCounterparties.some(
      (existing) =>
        existing.id !== counterparty.id &&
        existing.name.toLowerCase() === parsed.data.name.toLowerCase()
    )
  ) {
    return { error: "Counterparty already exists" };
  }

  await updateCounterpartyRecord(counterparty.id, {
    name: parsed.data.name,
    updatedAt: new Date(),
  });

  redirect(ROUTES.COUNTERPARTIES);
}

export async function deleteCounterpartyAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireUser();
  const counterpartyIdResult = counterpartyIdSchema.safeParse({
    counterpartyId: formData.get("counterpartyId"),
  });

  if (!counterpartyIdResult.success) {
    return { error: "Counterparty is required" };
  }

  const orgId = assertOrgId(currentUser);
  const counterparty = await getCounterpartyById(counterpartyIdResult.data.counterpartyId);

  if (!counterparty || counterparty.orgId !== orgId) {
    return { error: "Counterparty does not belong to your organization" };
  }

  await deleteCounterpartyRecord(counterparty.id);

  redirect(ROUTES.COUNTERPARTIES);
}
