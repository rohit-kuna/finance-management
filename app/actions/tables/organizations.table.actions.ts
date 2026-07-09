"use server";

import { and, eq } from "drizzle-orm";
import { cache } from "react";
import type { OrganizationRecord } from "@/app/lib/admin-dashboard.types";
import { db } from "@/db";
import { organizations } from "@/db/schema";

export async function createOrganizationRecord(input: {
  name: string;
  inviteCode: string;
  createdBy: string;
  isPersonal?: boolean;
}) {
  const [organization] = await db
    .insert(organizations)
    .values({
      ...input,
      isPersonal: input.isPersonal ?? false,
    })
    .returning();

  return organization ?? null;
}

export const getOrganizationById = cache(async (id: number): Promise<OrganizationRecord | null> => {
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1);

  return organization ?? null;
});

export async function getOrganizationByInviteCode(
  inviteCode: string
): Promise<OrganizationRecord | null> {
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.inviteCode, inviteCode))
    .limit(1);

  return organization ?? null;
}

export async function getPersonalOrganizationForUser(
  userId: string
): Promise<OrganizationRecord | null> {
  const [organization] = await db
    .select()
    .from(organizations)
    .where(and(eq(organizations.createdBy, userId), eq(organizations.isPersonal, true)))
    .limit(1);

  return organization ?? null;
}

export async function updateOrganizationInviteCode(id: number, inviteCode: string) {
  const [organization] = await db
    .update(organizations)
    .set({ inviteCode, updatedAt: new Date() })
    .where(eq(organizations.id, id))
    .returning();

  return organization ?? null;
}

export async function updateOrganizationName(id: number, name: string) {
  const [organization] = await db
    .update(organizations)
    .set({ name, updatedAt: new Date() })
    .where(eq(organizations.id, id))
    .returning();

  return organization ?? null;
}
