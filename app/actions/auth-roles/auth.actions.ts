"use server";

import { getCurrentDbUser } from "@/app/lib/auth";

/**
 * Returns the current logged-in application user.
 */
export async function getMe() {
  return getCurrentDbUser();
}
