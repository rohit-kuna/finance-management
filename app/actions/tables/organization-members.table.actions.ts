"use server";

import { and, asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { organizationMembers, organizations, users } from "@/db/schema";
import { ROLES } from "@/app/lib/roles";
import type { AppRole } from "@/app/lib/roles";
import type { OrganizationMemberRecord } from "@/app/lib/admin-dashboard.types";
import { ensureDefaultTransactionModesForUser } from "@/app/actions/tables/transaction-modes.table.actions";

export async function getOrganizationMembership(orgId: number, userId: string) {
  const [membership] = await db
    .select()
    .from(organizationMembers)
    .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.userId, userId)))
    .limit(1);

  return membership ?? null;
}

export async function getOrganizationsForUser(userId: string) {
  return db
    .select({
      orgId: organizationMembers.orgId,
      orgName: organizations.name,
      isPersonal: organizations.isPersonal,
      role: organizationMembers.role,
      isDefault: organizationMembers.isDefault,
      isActive: organizationMembers.isActive,
      joinedAt: organizationMembers.joinedAt,
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.orgId))
    .where(eq(organizationMembers.userId, userId))
    .orderBy(asc(organizationMembers.joinedAt));
}

export async function hasPersonalOrganizationForUser(userId: string) {
  const [record] = await db
    .select({ orgId: organizationMembers.orgId })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.orgId))
    .where(and(eq(organizationMembers.userId, userId), eq(organizations.isPersonal, true)))
    .limit(1);

  return Boolean(record);
}

export async function addOrganizationMember(input: {
  orgId: number;
  userId: string;
  role: AppRole;
  isDefault?: boolean;
}) {
  const membership = await db.transaction(async (tx) => {
    if (input.isDefault) {
      await tx
        .update(organizationMembers)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(organizationMembers.userId, input.userId));
    }

    const [inserted] = await tx
      .insert(organizationMembers)
      .values({
        orgId: input.orgId,
        userId: input.userId,
        role: input.role,
        isDefault: input.isDefault ?? false,
      })
      .onConflictDoNothing({
        target: [organizationMembers.orgId, organizationMembers.userId],
      })
      .returning();

    return inserted ?? null;
  });

  if (membership) {
    // One-time setup at membership creation, not on every dashboard read.
    await ensureDefaultTransactionModesForUser(input.orgId, input.userId);
  }

  return membership;
}

export async function setDefaultOrganizationForUser(userId: string, orgId: number) {
  return db.transaction(async (tx) => {
    await tx
      .update(organizationMembers)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(organizationMembers.userId, userId));

    const [membership] = await tx
      .update(organizationMembers)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.userId, userId)))
      .returning();

    return membership ?? null;
  });
}

export async function updateOrganizationMemberRole(orgId: number, userId: string, role: AppRole) {
  const [membership] = await db
    .update(organizationMembers)
    .set({ role, updatedAt: new Date() })
    .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.userId, userId)))
    .returning();

  return membership ?? null;
}

export async function getOrganizationMembers(orgId: number): Promise<OrganizationMemberRecord[]> {
  return db
    .select({
      id: users.id,
      clerkUserId: users.clerkUserId,
      email: users.email,
      name: users.name,
      role: organizationMembers.role,
      orgId: organizationMembers.orgId,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .where(eq(organizationMembers.orgId, orgId))
    .orderBy(asc(organizationMembers.joinedAt));
}

export async function removeOrganizationMember(orgId: number, userId: string) {
  const [membership] = await db
    .delete(organizationMembers)
    .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.userId, userId)))
    .returning();

  return membership ?? null;
}

export async function getOrganizationAdminCount(orgId: number) {
  const [record] = await db
    .select({ count: count() })
    .from(organizationMembers)
    .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.role, ROLES.ADMIN)));

  return record?.count ?? 0;
}
