import { currentUser } from "@clerk/nextjs/server";
import { cache } from "react";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Ensures the logged-in Clerk user exists in DB.
 * Safe to call multiple times.
 */
type ClerkUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

export const syncUserWithDb = cache(async (clerkUser?: ClerkUser | null) => {
  const resolvedClerkUser = clerkUser ?? (await currentUser());
  const resolvedClerkUserId = resolvedClerkUser?.id;

  if (!resolvedClerkUser || !resolvedClerkUserId) return null;

  const email = resolvedClerkUser.emailAddresses[0]?.emailAddress;

  if (!email) {
    throw new Error("Clerk user has no email address");
  }

  const name =
    [resolvedClerkUser.firstName, resolvedClerkUser.lastName].filter(Boolean).join(" ") || email;

  // Common case (every request after first-ever login): one round trip.
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, resolvedClerkUserId))
    .limit(1);

  if (existingUser) {
    return existingUser;
  }

  // First-time login only: insert then return the row directly.
  const [insertedUser] = await db
    .insert(users)
    .values({
      clerkUserId: resolvedClerkUserId,
      email,
      name,
    })
    .onConflictDoNothing({ target: users.clerkUserId })
    .returning();

  if (insertedUser) {
    return insertedUser;
  }

  // Lost a race with a concurrent insert for the same user; fetch what won.
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, resolvedClerkUserId))
    .limit(1);

  if (!user) {
    throw new Error(
      "Unable to sync user to DB. Ensure migrations are applied (run `npm run drizzle-push`)."
    );
  }

  return user;
});
