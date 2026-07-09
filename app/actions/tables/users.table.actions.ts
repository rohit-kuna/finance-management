"use server";

import { db } from "@/db";
import { users, type UserScope } from "@/db/schema";
import { eq } from "drizzle-orm";

type UpdateUserInput = Partial<{
  email: string;
  name: string;
  scope: UserScope;
}>;

export async function getUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

export async function getUserByClerkUserId(clerkUserId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);
  return user ?? null;
}

export async function updateUserById(id: string, input: UpdateUserInput) {
  const [updatedUser] = await db
    .update(users)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();

  return updatedUser ?? null;
}

export async function setUserScope(id: string, scope: UserScope) {
  return updateUserById(id, { scope });
}
