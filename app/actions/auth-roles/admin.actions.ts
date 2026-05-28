"use server";

import { requireAdmin } from "@/app/lib/auth";
import { ROLES } from "@/app/lib/roles";
import type { AdminUserTableRow } from "@/app/lib/user.types";
import { getAllUsers, updateUserById } from "@/app/actions/tables/users.table.actions";

/**
 * Admin-scoped users listing.
 */
export async function getAllUsersForAdmin(): Promise<AdminUserTableRow[]> {
  await requireAdmin();
  return getAllUsers();
}

/**
 * Admin-scoped role update.
 */
export async function promoteUserToAdmin(userId: number) {
  await requireAdmin();
  await updateUserById(userId, { role: ROLES.ADMIN });
  return { success: true };
}
