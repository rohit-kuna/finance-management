import { currentUser } from "@clerk/nextjs/server";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { syncUserWithDb } from "@/app/lib/user-sync";
import { ROUTES } from "@/app/lib/constants";
import { ROLES } from "@/app/lib/roles";
import { getOrganizationsForUser } from "@/app/actions/tables/organization-members.table.actions";
import { getPersonalOrganizationForUser } from "@/app/actions/tables/organizations.table.actions";

const ACTIVE_ORG_COOKIE = "active_org_id";
const ACTIVE_ORG_COOKIE_MAX_AGE = 60 * 60 * 24 * 400; // ~400 days, the practical browser max

/**
 * Resolves which org/role should drive the current request for this user.
 *
 * "Active org" is intentionally not persisted in the schema — it's a per-browser
 * preference (cookie) so the same account can work in different orgs from
 * different devices simultaneously. The cookie is always cross-checked against
 * real membership rows: a forged/stale value can never grant access to an org
 * the user isn't actually a member of, it just falls through to the next rule.
 *
 * Resolution order:
 *   1. cookie org id, if the user is actually a member of it
 *   2. the user's explicitly chosen default org (organizationMembers.isDefault)
 *   3. the earliest org the user joined
 */
async function resolveActiveOrgContext(userId: string) {
  const memberships = await getOrganizationsForUser(userId);
  if (!memberships.length) {
    return { orgId: null, role: null };
  }

  const cookieStore = await cookies();
  const cookieOrgId = Number(cookieStore.get(ACTIVE_ORG_COOKIE)?.value);

  const resolved =
    memberships.find((membership) => membership.orgId === cookieOrgId) ??
    memberships.find((membership) => membership.isDefault) ??
    memberships[0];

  return { orgId: resolved.orgId, role: resolved.role };
}

/**
 * Persists the active-org choice for this browser (Server Actions only — cookies
 * can't be written from Server Components).
 */
export async function setActiveOrgCookie(orgId: number) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, String(orgId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ACTIVE_ORG_COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function clearActiveOrgCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_ORG_COOKIE);
}

/**
 * Returns the application user (DB user), merged with the resolved active-org
 * context so existing call sites can keep reading `user.orgId` / `user.role`.
 */
export const getCurrentDbUser = cache(async () => {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  let dbUser;
  try {
    // Ensure user exists in DB
    dbUser = await syncUserWithDb(clerkUser);
  } catch {
    redirect(ROUTES.SERVICE_UNAVAILABLE);
  }

  if (!dbUser) return null;

  const [{ orgId, role }, personalOrganization] = await Promise.all([
    resolveActiveOrgContext(dbUser.id),
    getPersonalOrganizationForUser(dbUser.id),
  ]);

  // Personal space is the single source of truth for every transaction this
  // user makes — `orgId`/`role` above describe the "active" space (personal
  // or shared) driving navigation/UI, while `personalOrgId` is the fixed
  // target every write goes to regardless of which space is active. Null
  // only for a user who hasn't finished onboarding yet.
  return { ...dbUser, orgId, role, personalOrgId: personalOrganization?.id ?? null };
});

/**
 * Require authenticated user
 */
export async function requireUser() {
  const user = await getCurrentDbUser();
  if (!user) redirect(ROUTES.SIGN_IN);
  return user;
}

/**
 * Require admin role
 */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== ROLES.ADMIN) redirect(ROUTES.DASHBOARD);
  return user;
}
