"use server";

import { requireUser } from "@/app/lib/auth";
import { updateUserById } from "@/app/actions/tables/users.table.actions";

/**
 * User-scoped self profile update.
 */
export async function updateMyEmail(email: string) {
  const user = await requireUser();
  await updateUserById(user.id, { email });
  return { success: true };
}
