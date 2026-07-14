import { getCurrentDbUser } from "@/app/lib/auth";
import { AuthHeader } from "@/app/components/auth-header";
import { ROUTES } from "@/app/lib/constants";
import { redirect } from "next/navigation";
import { ROLES } from "@/app/lib/roles";
import { getOrganizationById } from "@/app/actions/tables/organizations.table.actions";

// Always render fresh — isPersonalSpace (and the whole nav it drives) must
// never be served from a cached render, since it changes per active-org
// cookie, not per URL.
export const dynamic = "force-dynamic";

function getDisplayName(name?: string | null, email?: string | null) {
  return name?.trim() || email?.trim() || "User";
}

function getInitials(displayName: string) {
  const cleaned = displayName.trim();
  if (!cleaned) return "U";

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export default async function ApplicationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentDbUser();
  if (!user) redirect(ROUTES.SIGN_IN);
  const organization = user.orgId ? await getOrganizationById(user.orgId) : null;
  const displayName = getDisplayName(user.name, user.email);

  return (
    <>
      <AuthHeader
        role={user.role ?? ROLES.USER}
        isPersonalSpace={organization?.isPersonal ?? false}
        hasOrganization={Boolean(user.orgId)}
        organizationName={organization?.name ?? null}
        displayName={displayName}
        initials={getInitials(displayName)}
      />
      {children}
    </>
  );
}
