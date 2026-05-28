import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ROLES } from "@/app/lib/roles";

/**
 * Ensures the logged-in Clerk user exists in DB.
 * Safe to call multiple times.
 */
export async function syncUserWithDb() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const clerkUserId = clerkUser.id;
  const email = clerkUser.emailAddresses[0]?.emailAddress;

  if (!email) {
    throw new Error("Clerk user has no email address");
  }

  // Insert once; no-op for returning users.
  await db
    .insert(users)
    .values({
      clerkUserId,
      email,
      role: ROLES.USER,
    })
    .onConflictDoNothing({ target: users.clerkUserId });

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);

  if (!user) {
    throw new Error(
      "Unable to sync user to DB. Ensure migrations are applied (run `npm run drizzle-push`)."
    );
  }

  return user;
}
